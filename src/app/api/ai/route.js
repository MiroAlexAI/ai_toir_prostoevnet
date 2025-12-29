import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { prompt, type = 'general' } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const hfKey = process.env.HF_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY;
        const openRouterKeys = [
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY2,
            process.env.OPENROUTER_API_KEY3
        ].filter(Boolean);

        let resultText = "";
        let usedModel = "";

        // 1. Try Hugging Face (Priority)
        if (hfKey) {
            try {
                const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: "zai-org/GLM-4.5-Air:zai-org",
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1,
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    resultText = data.choices?.[0]?.message?.content;
                    if (resultText) usedModel = "Hugging Face (GLM-4.5-Air)";
                }
            } catch (e) { console.error("HF Error:", e); }
        }

        // 2. Try Google Direct
        if (!resultText && googleKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1 }
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (resultText) usedModel = "Google Direct (Gemini)";
                }
            } catch (e) { console.error("Google Error:", e); }
        }

        // 3. Fallback to OpenRouter (Free Models Only)
        if (!resultText && openRouterKeys.length > 0) {
            const models = [
                'google/gemini-2.0-flash-exp:free',
                'google/learnlm-1.5-pro-experimental:free',
                'mistralai/mistral-7b-instruct:free',
                'huggingfaceh4/zephyr-7b-beta:free',
                'openchat/openchat-7b:free',
                'tngtech/tng-r1t-chimera:free'
            ];
            outer: for (let model of models) {
                for (let i = 0; i < openRouterKeys.length; i++) {
                    const key = openRouterKeys[i];
                    try {
                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${key}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'https://github.com/MiroAlexAI/ai_toir_prostoevnet',
                                'X-Title': 'TOiR AI Assistant'
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.1,
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            resultText = data.choices?.[0]?.message?.content;
                            if (resultText) {
                                usedModel = `OpenRouter (${model})`;
                                break outer;
                            }
                        }
                    } catch (e) {
                        console.error(`OR Error with key ${i} model ${model}:`, e);
                    }
                }
            }
        }

        if (!resultText) {
            return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
        }

        return NextResponse.json({ result: resultText, model: usedModel });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
