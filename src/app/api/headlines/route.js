import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { kv } from '@vercel/kv';

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
            sources: [{ url: 'https://angi.ru/', type: 'scrape', selector: 'a[href^="/news/"]', baseUrl: 'https://angi.ru' }]
        },
        {
            name: 'Технологии (WW)',
            sources: [{ url: 'https://techcrunch.com/feed/', type: 'rss' }]
        },
        {
            name: 'Логистика',
            sources: [{ url: 'https://gcaptain.com/feed/', type: 'rss' }]
        },
        {
            name: 'Металлы / Mining',
            sources: [{ url: 'https://www.mining.com/feed/', type: 'rss' }]
        },
        {
            name: 'Агропром (RU)',
            sources: [{ url: 'https://www.agroxxi.ru/news/rss.xml', type: 'rss' }]
        },
        {
            name: 'Энергетика (WW)',
            sources: [{ url: 'https://www.worldoil.com/rss', type: 'rss' }]
        }
    ];

    const financeConfigs = [
        { name: 'Financial Times', sources: [{ url: 'https://www.ft.com/?format=rss', type: 'rss' }] },
        { name: 'Bloomberg', sources: [{ url: 'https://www.bloomberg.com/feeds/bview/rss', type: 'rss' }] },
        { name: 'Nikkei Asia', sources: [{ url: 'https://asia.nikkei.com/rss/feed/nar', type: 'rss' }] },
        { name: 'SCMP Business', sources: [{ url: 'https://www.scmp.com/rss/91/feed.xml', type: 'rss' }] },
        { name: 'Gulf Business', sources: [{ url: 'https://gulfbusiness.com/feed/', type: 'rss' }] },
        { name: 'CNBC Markets', sources: [{ url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', type: 'rss' }] },
        { name: 'MarketWatch', sources: [{ url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', type: 'rss' }] },
        { name: 'Fortune', sources: [{ url: 'https://fortune.com/feed/', type: 'rss' }] },
        { name: 'Forbes', sources: [{ url: 'https://www.forbes.com/business/feed/', type: 'rss' }] }
    ];

    const reliabilityConfigs = [
        { name: 'ECA GMP Academy', sources: [{ url: 'https://www.gmp-compliance.org/gmp-news/rss', type: 'rss' }] },
        { name: 'Pharma Manufacturing (GMP)', sources: [{ url: 'https://www.pharmamanufacturing.com/rss', type: 'rss' }] },
        { name: 'Maintworld (EU)', sources: [{ url: 'https://www.maintworld.com/feed', type: 'rss' }] },
        { name: 'Uptime Magazine', sources: [{ url: 'https://www.uptimemagazine.com/feed/', type: 'rss' }] },
        { name: 'FacilitiesNet', sources: [{ url: 'https://www.facilitiesnet.com/rss/all/RSS2.xml', type: 'rss' }] },
        { name: '1С:ТОИР (RU)', sources: [{ url: 'https://1ctoir.ru/news/', type: 'scrape', selector: '.news-item__title a', baseUrl: 'https://1ctoir.ru' }] },
        { name: 'Управление производством (RU)', sources: [{ url: 'https://up-pro.ru/feed/', type: 'rss' }] },
        { name: 'Prostoev.net (RU)', sources: [{ url: 'https://prostoev.net/feed/', type: 'rss' }] },
        { name: 'CNews.ru (RU)', sources: [{ url: 'https://www.cnews.ru/rss', type: 'rss' }] },
        { name: 'Avtprom.ru (RU)', sources: [{ url: 'https://avtprom.ru/rss.xml', type: 'rss' }] },
        { name: 'Ipc2u (RU)', sources: [{ url: 'https://ipc2u.ru/news/rss/', type: 'rss' }] },
        { name: 'CTA (RU)', sources: [{ url: 'https://www.cta.ru/rss/', type: 'rss' }] },
        { name: 'Asian Power (Asia)', sources: [{ url: 'https://asian-power.com/rss', type: 'rss' }] },
        { name: 'IA Asia (Asia)', sources: [{ url: 'https://iaasiaonline.com/feed', type: 'rss' }] },
        { name: 'IA India (India)', sources: [{ url: 'https://www.industrialautomationindia.in/rss', type: 'rss' }] },
        { name: 'Asia Automate (Asia)', sources: [{ url: 'https://www.asiaautomate.com/feed', type: 'rss' }] },
        { name: 'Control Eng (EU)', sources: [{ url: 'https://controlengeurope.com/feed', type: 'rss' }] },
        { name: 'IEN (EU)', sources: [{ url: 'https://www.ien.eu/rss', type: 'rss' }] },
        { name: 'Reliable Plant (WW)', sources: [{ url: 'https://www.reliableplant.com/rss', type: 'rss' }] },
        { name: 'Control Eng (USA)', sources: [{ url: 'https://www.controleng.com/feed/', type: 'rss' }] },
        { name: 'Automation.com (USA)', sources: [{ url: 'https://www.automation.com/en-us/automation-rss-feed.aspx', type: 'rss' }] },
        { name: 'MRO Magazine (CA)', sources: [{ url: 'https://www.mromagazine.com/feed/', type: 'rss' }] },
        { name: 'ReliabilityWeb', sources: [{ url: 'https://reliabilityweb.com/rss', type: 'rss' }] },
        { name: 'Maintenance World', sources: [{ url: 'https://www.maintenanceworld.com/feed/', type: 'rss' }] },
        { name: 'Engineering.com', sources: [{ url: 'https://www.engineering.com/Rss.aspx', type: 'rss' }] },
        { name: 'Accendo Reliability', sources: [{ url: 'https://accendoreliability.com/feed/', type: 'rss' }] },
        { name: 'Plant Engineering', sources: [{ url: 'https://www.plantengineering.com/feed/', type: 'rss' }] },
        { name: 'Efficient Plant', sources: [{ url: 'https://www.efficientplantmag.com/feed/', type: 'rss' }] },
        { name: 'Reliability Connect', sources: [{ url: 'https://reliabilityconnect.com/feed/', type: 'rss' }] },
        { name: 'BIC Magazine', sources: [{ url: 'https://www.bicmagazine.com/feed/', type: 'rss' }] },
        { name: 'Processing Magazine', sources: [{ url: 'https://www.processingmagazine.com/maintenance-safety/feed/', type: 'rss' }] }
    ];

    let regionConfigs;
    if (category === 'industry') {
        regionConfigs = industryConfigs;
    } else if (category === 'finance') {
        regionConfigs = financeConfigs;
    } else if (category === 'reliability') {
        regionConfigs = reliabilityConfigs;
    } else {
        regionConfigs = globalConfigs;
    }

    const reliabilityKeywords = [
        'тоир', 'ремонт', 'обслуживание', 'надежность', 'надёжность', 'диагностика', 'мониторинг',
        'предиктив', 'смазка', 'вибродиагностика', 'сенсоры', 'датчики', 'оборудование', 'активы',
        'управление активами', 'ппр', 'эксплуатация', 'фонды', 'инспекция', 'контроль',
        'maintenance', 'reliability', 'asset', 'management', 'rcm', 'fmea', 'tpm', 'predictive',
        'condition', 'monitoring', 'vibration', 'lubrication', 'ultrasound', 'sensors', 'iot',
        'industry 4.0', 'spare parts', 'inventory', 'cmms', 'eam', 'iso 55000', 'iso 55001',
        'oee', 'downtime', 'failure', 'root cause', 'rca', 'mro', 'availability', 'integrity'
    ];

    const CACHE_KEY = `headlines_${category}`;
    const CACHE_TTL = 900; // 15 минут в секундах

    try {
        // Пробуем получить из кеша
        const cachedData = await kv.get(CACHE_KEY);
        if (cachedData) {
            console.log(`>>> Serving ${category} headlines from cache`);
            return NextResponse.json(cachedData);
        }

        const allHeadlines = [];

        const regionPromises = regionConfigs.map(async (region) => {
            const regionHeadlines = [];
            // Забираем больше для фильтрации в ТОиР
            const fetchLimit = category === 'reliability' ? 15 : ((category === 'finance') ? 3 : 5);
            const finalLimit = (category === 'finance' || category === 'reliability') ? 1 : 2;

            for (const source of region.sources) {
                if (regionHeadlines.length >= finalLimit) break;

                try {
                    const response = await axios.get(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
                        },
                        timeout: 5000 // Сокращаем до 5 секунд для Vercel
                    });

                    const data = response.data;
                    const $ = cheerio.load(data, { xmlMode: true });
                    const tempItems = [];

                    if (source.type === 'rss' || data.includes('<rss') || data.includes('<feed')) {
                        const items = $('item').length > 0 ? $('item') : $('entry');
                        items.each((i, el) => {
                            if (tempItems.length < fetchLimit) {
                                let title = $(el).find('title').text() || '';
                                let link = $(el).find('link').text() || $(el).find('link').attr('href') || $(el).find('guid').text() || '';

                                title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                                link = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

                                if (title && link && title.length > 15) {
                                    tempItems.push({ title, link, source: region.name });
                                }
                            }
                        });
                    } else {
                        // Manual scraping
                        $(source.selector).each((i, el) => {
                            if (tempItems.length < fetchLimit) {
                                let title = $(el).text().trim();
                                let link = $(el).attr('href') || $(el).closest('a').attr('href') || '';

                                if (link && !link.startsWith('http')) {
                                    link = source.baseUrl + link;
                                }

                                if (title && link && title.length > 15) {
                                    tempItems.push({ title, link, source: region.name });
                                }
                            }
                        });
                    }

                    // Применяем фильтрацию для ТОиР
                    if (category === 'reliability') {
                        const filtered = tempItems.filter(item => {
                            const lowTitle = item.title.toLowerCase();
                            return reliabilityKeywords.some(kw => lowTitle.includes(kw));
                        });

                        // Если есть релевантные - берем их, если нет - берем первую (fallback), 
                        // но помечаем или просто ограничиваем количество
                        if (filtered.length > 0) {
                            regionHeadlines.push(...filtered.slice(0, finalLimit));
                        } else {
                            // Если совсем ничего тематического нет, берем самую свежую,
                            // чтобы источник не казался "мертвым", но только одну.
                            regionHeadlines.push(tempItems[0]);
                        }
                    } else {
                        regionHeadlines.push(...tempItems.slice(0, finalLimit));
                    }

                } catch (err) {
                    // console.error(`Error:`, err.message);
                }
            }
            return regionHeadlines;
        });

        const results = await Promise.all(regionPromises);
        results.forEach(rh => {
            rh.forEach(item => {
                if (item && !allHeadlines.find(h => h.link === item.link)) {
                    allHeadlines.push(item);
                }
            });
        });

        // Сохраняем в кеш перед отправкой
        if (allHeadlines.length > 0) {
            await kv.set(CACHE_KEY, allHeadlines, { ex: CACHE_TTL });
        }

        return NextResponse.json(allHeadlines);
    } catch (error) {
        console.error("Headlines API Error:", error.message);
        return NextResponse.json([]);
    }
}
