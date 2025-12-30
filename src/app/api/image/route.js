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

        const prompt = `Highest quality professional technical cutaway schematic of ${type} ${model} ${manufacturer || ''}. 
        Show internal mechanisms: ${parts || 'internal gears and bearings'}. 
        Minimalist engineering illustration, blueprint aesthetic, detailed mechanical parts, white background, technical diagram.`;

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
