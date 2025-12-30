import { NextResponse } from 'next/server';
import { InferenceClient } from "@huggingface/inference";

export async function POST(request) {
    try {
        const { type, manufacturer, model, parts } = await request.json();
        const hfKey = process.env.HF_API_KEY;

        if (!hfKey) {
            return NextResponse.json({ error: 'HF_API_KEY is not configured' }, { status: 500 });
        }

        const client = new InferenceClient(hfKey);

        const prompt = `Professional technical schematic of ${type} model ${model} ${manufacturer || ''}. 
        It consists of the following components: ${parts || 'internal mechanical parts'}. 
        Simplified engineering line art, minimalist blueprint vector illustration, clean diagram style, high contrast white background. 
        NO artistic details, NO shadows, focus only on technical structure.`;

        // Список моделей для ротации в случае исчерпания лимитов или недоступности
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "stabilityai/stable-diffusion-2-1",
            "prompthero/openjourney-v4"
        ];

        let lastError = null;
        for (const modelId of models) {
            try {
                console.log(`Attempting image generation with Hugging Face model: ${modelId}`);
                const response = await client.textToImage({
                    model: modelId,
                    inputs: prompt,
                });

                const buffer = await response.arrayBuffer();
                const base64Image = Buffer.from(buffer).toString('base64');
                const dataUrl = `data:image/jpeg;base64,${base64Image}`;

                return NextResponse.json({
                    image: dataUrl,
                    modelUsed: `HF: ${modelId.split('/').pop()}`
                });
            } catch (error) {
                console.error(`Error with HF model ${modelId}:`, error.message);
                lastError = error;
                // Продолжаем цикл к следующей модели
                continue;
            }
        }

        // --- Финальный резервный вариант через Pollinations AI (Бесплатно, без ключей) ---
        try {
            console.log("Attempting fallback with Pollinations AI...");
            const encodedPrompt = encodeURIComponent(prompt);
            const pollinationUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&model=flux&enhance=false`;

            const response = await fetch(pollinationUrl);
            if (!response.ok) throw new Error("Pollinations service unavailable");

            const buffer = await response.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64Image}`;

            return NextResponse.json({
                image: dataUrl,
                modelUsed: "Pollinations AI (Flux/SDXL Fallback)"
            });
        } catch (pError) {
            console.error("Pollinations Fallback Error:", pError.message);
        }

        // Если совсем всё упало
        throw lastError || new Error("All image generation providers failed");

    } catch (error) {
        console.error("Critical Image Generation Error:", error);
        return NextResponse.json({
            error: 'Ошибка генерации изображения: лимиты API исчерпаны или сервис временно недоступен',
            details: error.message
        }, { status: 500 });
    }
}
