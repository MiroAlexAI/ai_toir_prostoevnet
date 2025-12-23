import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET() {
    const regionConfigs = [
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

    try {
        const allHeadlines = [];

        // Processing regions in parallel
        const regionPromises = regionConfigs.map(async (region) => {
            const regionHeadlines = [];

            for (const source of region.sources) {
                if (regionHeadlines.length >= 2) break;

                try {
                    const response = await axios.get(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 8000
                    });

                    const $ = cheerio.load(response.data, { xmlMode: true });

                    // Universal search for feed items (RSS <item> or Atom <entry>)
                    const items = $('item').length > 0 ? $('item') : $('entry');

                    items.each((i, el) => {
                        if (regionHeadlines.length < 2) {
                            let title = $(el).find('title').text() || '';
                            let link = $(el).find('link').text() || $(el).find('link').attr('href') || '';

                            // Remove CDATA and trim
                            title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
                            link = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

                            if (title && link && title.length > 20) {
                                if (!regionHeadlines.find(h => h.title === title)) {
                                    regionHeadlines.push({
                                        title,
                                        link,
                                        source: region.name
                                    });
                                }
                            }
                        }
                    });
                } catch (err) {
                    console.error(`RSS Error [${region.name}]:`, err.message);
                }
            }
            return regionHeadlines;
        });

        const results = await Promise.all(regionPromises);
        results.forEach(rh => allHeadlines.push(...rh));

        return NextResponse.json(allHeadlines);
    } catch (error) {
        console.error('Regional Headlines API error:', error);
        return NextResponse.json([]);
    }
}
