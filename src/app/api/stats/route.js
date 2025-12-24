import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'stats.json');

// Helper to read stats
function readData() {
    try {
        if (!fs.existsSync(STATS_FILE)) {
            return {
                total_requests: 0,
                telegram_posts: 0,
                analytics: 0,
                headlines: 0,
                history: [] // Added shared history
            };
        }
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.history) parsed.history = [];
        return parsed;
    } catch (error) {
        console.error('Error reading stats:', error);
        return { total_requests: 0, telegram_posts: 0, analytics: 0, headlines: 0, history: [] };
    }
}

// Helper to write stats
function writeData(data) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing stats:', error);
    }
}

export async function GET() {
    const data = readData();
    return NextResponse.json(data);
}

export async function POST(request) {
    try {
        const { type, entry } = await request.json();
        const data = readData();

        data.total_requests = (data.total_requests || 0) + 1;

        if (type === 'telegram') data.telegram_posts = (data.telegram_posts || 0) + 1;
        if (type === 'analytics') data.analytics = (data.analytics || 0) + 1;
        if (type === 'headlines') data.headlines = (data.headlines || 0) + 1;

        // Handle shared history
        if (entry) {
            data.history = [entry, ...(data.history || [])].slice(0, 5);
        }

        writeData(data);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }
}
