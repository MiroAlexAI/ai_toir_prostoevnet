import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { type, manufacturer, model } = await request.json();
        const hfKey = process.env.HF_API_KEY;

        if (!hfKey) {
            return NextResponse.json({ error: 'HF_API_KEY is not configured' }, { status: 500 });
        }

        const prompt = `Highly detailed technical technical cutaway drawing of industrial ${type} ${manufacturer || ''} ${model}. 
        Perspective view showing internal components, gears, bearings, valves, and mechanical structure. 
        Professional engineering illustration, blueprint style, detailed mechanical parts, 4k resolution, white background, technical diagram.`;

        const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
                headers: { Authorization: `Bearer ${hfKey}` },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json({ error: 'Image generation failed', details: error }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        return NextResponse.json({ image: dataUrl });

    } catch (error) {
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}
