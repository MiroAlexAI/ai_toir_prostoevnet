import { NextResponse } from 'next/server';

export async function POST(request) {
    console.log(">>> POST /api/translate called");
    try {
        const { content, title, action = 'analytics' } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Собираем все доступные ключи
        const googleKey = process.env.GOOGLE_API_KEY;
        const openRouterKeys = [
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY2,
            process.env.OPENROUTER_API_KEY3
        ].filter(Boolean);

        const truncatedContent = content.length > 4000 ? content.substring(0, 4000) + '...' : content;
        let prompt = "";

        // Промпты для действий
        if (action === 'telegram') {
            prompt = `Ты — профессиональный SMM-менеджер и историк. Составь пост для Telegram на основе следующей статьи. 
Твой ответ должен быть на РУССКОМ языке и состоять из двух частей:
1. **Главное из статьи:** (Краткий пересказ ключевых моментов).
2. **Похожее событие в мировой истории:** (Проведи параллель с событием из прошлого, объяснив, в чем сходство).
Не используй эмодзи и хэштеги.

Заголовок: ${title || 'Без заголовка'}
Контент: ${truncatedContent}`;
        } else if (action === 'headlines_analysis') {
            prompt = `Ты — эксперт по медиа-анализу и когнитивной психологии. Проанализируй заголовки:
1. **🌍 Общая повестка дня:** (О чем кричат все заголовки).
2. **🧠 Вектор влияния:** (Какое мнение навязывают).
3. **⚠️ Скрытые манипуляции:** (На что обратить внимание).
Заголовки для анализа:
${content}`;
        } else if (action === 'summarize') {
            prompt = `Ты — профессиональный переводчик и редактор. Твоя задача: перевести следующий текст на РУССКИЙ язык и СОКРАТИТЬ его примерно на 30%. 
Требования:
1. Выдай только сам текст статьи в сокращенном виде.
2. НЕ добавляй никаких выводов, анализа, комментариев от себя или заголовков разделов.
3. Сохрани суть и структуру оригинала, но убери лишние детали и повторы.

Заголовок (переведи тоже): ${title || 'Без заголовка'}
Текст для сокращенного перевода: ${truncatedContent}`;
        } else {
            prompt = `Ты — эксперт-аналитик. Составь краткий отчет на РУССКОМ языке:
1. **📌 Суть статьи:** (1-2 абзаца).
2. **⚖️ Влияние на политику:** (Геополитика и законы).
3. **📈 Влияние на рынок акций:** (Секторы и компании).

Заголовок: ${title || 'Без заголовка'}
Контент: ${truncatedContent}`;
        }

        let resultText = "";
        let usedModel = "";
        let lastError = null;

        // Определяем список моделей для OpenRouter (сначала Gemini, потом Chimera как резерв)
        const modelsToTry = [
            'google/gemini-2.0-flash-exp:free',
            'tngtech/tng-r1t-chimera:free'
        ];

        // 1. Пытаемся вызвать прямой Google API подороже (если есть ключ)
        if (googleKey) {
            try {
                console.log("Attempting direct Google Gemini API...");
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
                    usedModel = "Google Direct (Failed)";
                    console.warn("Direct Google API failed, will try OpenRouter...");
                }
            } catch (e) {
                console.error("Google Direct Error:", e.message);
            }
        }

        // 2. Если Google не сработал — идем по списку OpenRouter ключей и моделей
        if (!resultText) {
            if (openRouterKeys.length === 0) {
                return NextResponse.json({ error: 'Нет доступных ключей API', model: usedModel || "None" }, { status: 500 });
            }

            outerLoop: for (let modelName of modelsToTry) {
                for (let i = 0; i < openRouterKeys.length; i++) {
                    try {
                        console.log(`Trying OpenRouter Key #${i + 1} with model ${modelName}...`);
                        usedModel = `OpenRouter Key #${i + 1} (${modelName})`;

                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${openRouterKeys[i]}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                                'X-Title': 'News Analyst Desert Ops'
                            },
                            body: JSON.stringify({
                                model: modelName,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.3,
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            resultText = data.choices?.[0]?.message?.content;
                            if (resultText) {
                                usedModel = `OpenRouter Key #${i + 1} (${data.model})`;
                                break outerLoop;
                            }
                        } else {
                            lastError = await response.json();
                            console.error(`OpenRouter Key #${i + 1} with ${modelName} failed:`, lastError);
                            // Если ошибка 429 или 401, пробуем следующий ключ для ЭТОЙ ЖЕ модели
                            continue;
                        }
                    } catch (e) {
                        console.error(`OpenRouter Error (Key #${i + 1}, ${modelName}):`, e.message);
                    }
                }
            }
        }

        if (!resultText) {
            return NextResponse.json({
                error: 'Все ключи API и модели исчерпаны или недоступны.',
                details: lastError,
                model: usedModel || "All Failed"
            }, { status: 500 });
        }

        return NextResponse.json({
            translation: resultText,
            model: usedModel
        });

    } catch (error) {
        console.error('Translate Route Error:', error);
        return NextResponse.json({
            error: 'Ошибка сервера',
            details: error.message,
            model: "Critical Error"
        }, { status: 500 });
    }
}
