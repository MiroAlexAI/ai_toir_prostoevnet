import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'global';

    const globalConfigs = [
        {
            name: 'Russia',
            sources: [
                { url: 'https://www.rt.com/rss/news/', type: 'rss' },
                { url: 'https://tass.com/rss/v2.xml', type: 'rss' }
            ]
        },
        {
            name: 'Europe',
            sources: [
                { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', type: 'rss' },
                { url: 'https://www.euronews.com/rss?level=vertical&name=news', type: 'rss' }
            ]
        },
        {
            name: 'The East',
            sources: [
                { url: 'https://www.aljazeera.com/xml/rss/all.xml', type: 'rss' },
                { url: 'https://www.tehrantimes.com/rss', type: 'rss' }
            ]
        },
        {
            name: 'USA',
            sources: [
                { url: 'https://feeds.npr.org/1001/rss.xml', type: 'rss' },
                { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', type: 'rss' }
            ]
        }
    ];

    const industryConfigs = [
        {
            name: 'Нефть и Газ (RU)',
            sources: [
                {
                    url: 'https://angi.ru/',
                    type: 'scrape',
                    selector: 'a[href^="/news/"]',
                    baseUrl: 'https://angi.ru'
                }
            ]
        },
        {
            name: 'Добыча (RU)',
            sources: [
                {
                    url: 'https://dprom.online/mainthemes/news/',
                    type: 'scrape',
                    selector: '.news-item__title',
                    baseUrl: 'https://dprom.online'
                }
            ]
        },
        {
            name: 'Энергетика (WW)',
            sources: [
                { url: 'https://www.eprussia.ru/news/rss.php', type: 'rss' },
                { url: 'https://www.worldoil.com/rss', type: 'rss' }
            ]
        },
        {
            name: 'Металлы',
            sources: [
                { url: 'https://www.mining.com/feed/', type: 'rss' },
                { url: 'https://www.mining-technology.com/feed/', type: 'rss' }
            ]
        }
    ];

    const regionConfigs = category === 'industry' ? industryConfigs : globalConfigs;

    try {
        const allHeadlines = [];

        const regionPromises = regionConfigs.map(async (region) => {
            const regionHeadlines = [];

            for (const source of region.sources) {
                if (regionHeadlines.length >= 2) break;

                try {
                    const response = await axios.get(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 10000
                    });

                    const data = response.data;
                    const $ = cheerio.load(data, { xmlMode: true });

                    if (source.type === 'rss' || data.includes('<rss') || data.includes('<feed')) {
                        const items = $('item').length > 0 ? $('item') : $('entry');
                        items.each((i, el) => {
                            if (regionHeadlines.length < 2) {
                                let title = $(el).find('title').text() || '';
                                // Улучшенный поиск ссылки для разных форматов RSS/Atom
                                let link = $(el).find('link').text() || $(el).find('link').attr('href') || $(el).find('guid').text() || '';

                                // Очистка от CDATA
                                title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                                link = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

                                if (title && link && title.length > 20) {
                                    if (!regionHeadlines.find(h => h.title === title)) {
                                        regionHeadlines.push({ title, link, source: region.name });
                                    }
                                }
                            }
                        });
                    } else {
                        // Manual scraping
                        $(source.selector).each((i, el) => {
                            if (regionHeadlines.length < 2) {
                                let title = $(el).text().trim();
                                let link = $(el).attr('href') || $(el).closest('a').attr('href') || '';

                                if (link && !link.startsWith('http')) {
                                    link = source.baseUrl + link;
                                }

                                if (title && link && title.length > 25 && !regionHeadlines.find(h => h.title === title)) {
                                    regionHeadlines.push({ title, link, source: region.name });
                                }
                            }
                        });
                    }
                } catch (err) {
                    // console.error(`Error:`, err.message);
                }
            }
            return regionHeadlines;
        });

        const results = await Promise.all(regionPromises);
        results.forEach(rh => allHeadlines.push(...rh));

        return NextResponse.json(allHeadlines);
    } catch (error) {
        return NextResponse.json([]);
    }
}
