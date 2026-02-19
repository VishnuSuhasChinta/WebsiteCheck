import { NextResponse } from "next/server";
import { sites } from "@/lib/sites";

export interface ScanResult {
    name: string;
    url: string;
    status: "UP" | "DOWN";
    statusCode: number | null;
    responseTime: number | null;
}

async function checkSite(site: { name: string; url: string }): Promise<ScanResult> {
    const start = Date.now();
    try {
        const response = await fetch(site.url, {
            method: "GET",
            signal: AbortSignal.timeout(10000),
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        const responseTime = Date.now() - start;
        return {
            name: site.name,
            url: site.url,
            status: "UP",
            statusCode: response.status,
            responseTime,
        };
    } catch {
        const responseTime = Date.now() - start;
        return {
            name: site.name,
            url: site.url,
            status: "DOWN",
            statusCode: null,
            responseTime: responseTime > 100 ? responseTime : null,
        };
    }
}

export async function GET() {
    const results = await Promise.all(sites.map(checkSite));
    return NextResponse.json(results);
}
