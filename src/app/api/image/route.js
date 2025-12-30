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

        const prompt = `A simplified technical schematic drawing of ${type} ${model}. 
        Minimalist engineering vector illustration, professional blueprint line art, clean diagram style, high contrast white background. 
        Focus on basic structure and main components: ${parts || 'internal mechanics'}.`;

        // Используем модель FLUX.1-schnell для быстрой и качественной генерации
        const response = await client.textToImage({
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: prompt,
        });

        // SDK возвращает Blob. Преобразуем его в base64 для передачи на фронтенд
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        return NextResponse.json({ image: dataUrl });

    } catch (error) {
        console.error("Image Generation Error Details:", error);
        return NextResponse.json({
            error: 'Ошибка генерации изображения',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
