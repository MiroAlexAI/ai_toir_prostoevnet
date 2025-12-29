import { NextResponse } from 'next/server';
import { InferenceClient } from "@huggingface/inference";

export async function POST(request) {
    try {
        const { type, manufacturer, model } = await request.json();
        const hfKey = process.env.HF_API_KEY;

        if (!hfKey) {
            return NextResponse.json({ error: 'HF_API_KEY is not configured' }, { status: 500 });
        }

        const client = new InferenceClient(hfKey);

        const prompt = `Highly detailed technical cutaway drawing of industrial ${type} ${manufacturer || ''} ${model}. 
        Perspective view showing internal components, gears, bearings, valves, and mechanical structure. 
        Professional engineering illustration, blueprint style, detailed mechanical parts, white background, technical diagram.`;

        // Используем предложенную пользователем модель и провайдера через официальный SDK
        const response = await client.textToImage({
            provider: "nebius",
            model: "black-forest-labs/FLUX.1-dev",
            inputs: prompt,
            parameters: {
                num_inference_steps: 5,
                width: 400,
                height: 300
            },
        });

        // SDK возвращает Blob. Преобразуем его в base64 для передачи на фронтенд
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        return NextResponse.json({ image: dataUrl });

    } catch (error) {
        console.error("Image Generation Error:", error);
        return NextResponse.json({
            error: 'Ошибка генерации изображения',
            details: error.message
        }, { status: 500 });
    }
}
