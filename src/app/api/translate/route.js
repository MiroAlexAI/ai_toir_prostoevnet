import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { content, title, action = 'analytics' } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        // Get API key from environment
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'OPENROUTER_API_KEY не настроен в .env.local' },
                { status: 500 }
            );
        }

        // Limit content to ~3000 chars
        const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '...' : content;

        let prompt = "";

        if (action === 'telegram') {
            prompt = `Ты — профессиональный SMM-менеджер и историк. Составь пост для Telegram на основе следующей статьи. 
Твой ответ должен быть на РУССКОМ языке и состоять из двух частей:

1. **Главное из статьи:** (Краткий пересказ ключевых моментов).
2. **Похожее событие в мировой истории:** (Проведи параллель с событием из прошлого, объяснив, в чем сходство).

Не используй эмодзи и хэштеги. Пиши только чистый текст.
---
Заголовок: ${title || 'Без заголовка'}
Контент: ${truncatedContent}
---`;
        } else if (action === 'headlines_analysis') {
            prompt = `Ты — эксперт по медиа-анализу и когнитивной психологии. Проанализируй следующий список новостных заголовков из разных стран мира.
Твоя задача: составить короткую общую сводку о том, какими событиями и как именно пытаются на нас повлиять мировые СМИ.

Твой ответ должен быть на РУССКОМ языке и строго структурирован:
1. **🌍 Общая повестка дня:** (Коротко о чем кричат все заголовки).
2. **🧠 Вектор влияния:** (Какое мнение или эмоцию пытаются навязать читателю: страх, оптимизм, враждебность и т.д.).
3. **⚠️ Скрытые манипуляции:** (На что стоит обратить внимание критически мыслящему человеку).

Не используй эмодзи.

Заголовки для анализа:
${content}`;
        } else {
            // Analytics (default)
            prompt = `Ты — эксперт-аналитик. Твоя задача: прочитать статью и составить краткий, осмысленный отчет на РУССКОМ языке.
Используй только предоставленный заголовок и контент. 

Структура ответа:
1. **📌 Суть статьи:** (Кратко и емко — 1-2 абзаца о главном).
2. **⚖️ Влияние на политику:** (Как эти новости могут повлиять на геополитику или внутренние законы).
3. **📈 Влияние на рынок акций:** (Прогноз: какие секторы или компании могут вырасти/упасть).

---
Заголовок: ${title || 'Без заголовка'}
Контент: ${truncatedContent}
---`;
        }

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'AI Reader App'
            },
            body: JSON.stringify({
                model: 'z-ai/glm-4.5-air:free',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = errorText;
            }

            console.error('OpenRouter API Error:', errorData);
            return NextResponse.json(
                {
                    error: 'Ошибка OpenRouter API',
                    details: errorData
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract translated text from response
        const translatedText = data.choices?.[0]?.message?.content || 'Перевод не получен';

        return NextResponse.json({
            translation: translatedText,
            model: data.model,
            usage: data.usage
        });

    } catch (error) {
        console.error('Translation error:', error);

        return NextResponse.json(
            {
                error: 'Ошибка при переводе статьи',
                details: error.message
            },
            { status: 500 }
        );
    }
}
