import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const googleKey = process.env.GOOGLE_API_KEY;
        const hfKey = process.env.HF_API_KEY;
        const openRouterKeys = [
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY2,
            process.env.OPENROUTER_API_KEY3
        ].filter(Boolean);

        let resultText = "";
        let usedModel = "";
        let lastError = null;

        // 1. Пытаемся вызвать Hugging Face GLM-4.5-Air (Приоритет №1)
        if (hfKey) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // Тайм-аут 5 секунд

                const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "zai-org/GLM-4.5-Air:zai-org",
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1,
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    resultText = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content;
                    if (resultText) {
                        usedModel = "Hugging Face (GLM-4.5-Air)";
                    }
                } else {
                    lastError = await response.json();
                }
            } catch (e) {
                console.error("HF Error:", e.message);
            }
        }

        // 2. Пытаемся вызвать прямой Google API подороже (если есть ключ)
        if (!resultText && googleKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3 }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (resultText) {
                        usedModel = "Google Direct (Gemini 2.0 Flash)";
                    }
                } else {
                    lastError = await response.json();
                }
            } catch (e) {
                console.error("Google Direct Error:", e.message);
            }
        }

        // 3. OpenRouter с ротацией ключей и моделей
        if (!resultText) {
            const modelsToTry = [
                'google/gemini-2.0-flash-exp:free',
                'google/gemini-2.0-flash-lite-preview-02-05:free',
                'deepseek/deepseek-r1:free',
                'mistralai/mistral-small-24b-instruct-2501:free',
                'meta-llama/llama-3.3-70b-instruct:free',
                'tngtech/tng-r1t-chimera:free',
                'qwen/qwen-2.5-72b-instruct:free',
                'google/gemini-2.0-pro-exp-02-05:free'
            ];

            if (openRouterKeys.length > 0) {
                outerLoop: for (let modelName of modelsToTry) {
                    for (let i = 0; i < openRouterKeys.length; i++) {
                        try {
                            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${openRouterKeys[i]}`,
                                    'Content-Type': 'application/json',
                                    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                                    'X-Title': 'TOiR AI Assistant'
                                },
                                body: JSON.stringify({
                                    model: modelName,
                                    messages: [{ role: 'user', content: prompt }],
                                    temperature: 0.1,
                                })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                resultText = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content;
                                if (resultText) {
                                    usedModel = `OpenRouter Key #${i + 1} (${data.model || modelName})`;
                                    break outerLoop;
                                }
                            } else {
                                const errorData = await response.json();
                                lastError = { model: modelName, keyIndex: i + 1, error: errorData };
                                console.warn(`OR Error (Key #${i + 1}, ${modelName}):`, errorData);
                            }
                        } catch (e) {
                            console.error(`OR Exception (Key #${i + 1}, ${modelName}):`, e.message);
                            lastError = { model: modelName, keyIndex: i + 1, exception: e.message };
                        }
                    }
                }
            }
        }

        if (!resultText) {
            return NextResponse.json({
                error: 'Все ключи API и модели исчерпаны или недоступны. Ошибка этапа 1.',
                details: lastError
            }, { status: 500 });
        }

        return NextResponse.json({
            result: resultText,
            model: usedModel
        });

    } catch (error) {
        return NextResponse.json({
            error: 'Ошибка сервера',
            details: error.message
        }, { status: 500 });
    }
}
