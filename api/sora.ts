import type { Request, Response } from 'express';

// Target MAS API Gateway endpoint
export const MAS_DOMESTIC_RATES_ENDPOINT =
  'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily';

// Simple in-memory cache to optimize rate limits and response speed
interface CacheEntry {
  data: any;
  timestamp: number;
}
let cachedResponse: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Serverless / Express handler for MAS Daily SORA rates
 * Path: /api/sora
 */
export default async function handler(req: Request | any, res: Response | any) {
  // CORS configuration
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, KeyId, x-mas-key-id, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status?.(200).end?.() || res.end?.();
  }

  // 1. Resolve MAS KeyId (never hardcoded, resolved from environment or client header)
  const masKeyId =
    process.env.MAS_KEY_ID ||
    (req.headers?.['keyid'] as string) ||
    (req.headers?.['x-mas-key-id'] as string) ||
    (req.headers?.['authorization']?.replace(/^Bearer\s+/i, '')) ||
    (req.query?.keyId as string);

  // If no API key is provided, return informative error response
  if (!masKeyId) {
    return res.status(401).json({
      error: 'MAS_KEY_ID_REQUIRED',
      message: 'MAS KeyId header is missing. Please set the MAS_KEY_ID environment variable or supply KeyId in request headers.',
      documentation: 'All requests to MAS API gateway require the "KeyId: <MAS_KEY_ID>" header.',
      targetEndpoint: MAS_DOMESTIC_RATES_ENDPOINT,
      configuredInEnv: false,
    });
  }

  // 2. Check in-memory cache unless bypass is requested
  const bypassCache = req.query?.refresh === 'true' || req.query?.nocache === 'true';
  const now = Date.now();
  if (!bypassCache && cachedResponse && now - cachedResponse.timestamp < CACHE_TTL_MS) {
    res.setHeader?.('X-Cache-Status', 'HIT');
    return res.status(200).json({
      ...cachedResponse.data,
      cached: true,
      cacheAgeSeconds: Math.floor((now - cachedResponse.timestamp) / 1000),
    });
  }

  // 3. Fetch from official MAS API gateway
  try {
    const queryParams = new URLSearchParams();
    if (req.query?.limit) queryParams.set('limit', String(req.query.limit));
    if (req.query?.start_date) queryParams.set('start_date', String(req.query.start_date));
    if (req.query?.end_date) queryParams.set('end_date', String(req.query.end_date));
    if (req.query?.sort) queryParams.set('sort', String(req.query.sort));

    const queryString = queryParams.toString();
    const fetchUrl = queryString
      ? `${MAS_DOMESTIC_RATES_ENDPOINT}?${queryString}`
      : MAS_DOMESTIC_RATES_ENDPOINT;

    const masResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'KeyId': masKeyId,
      },
    });

    if (!masResponse.ok) {
      const errorText = await masResponse.text();
      return res.status(masResponse.status).json({
        error: 'MAS_GATEWAY_ERROR',
        status: masResponse.status,
        statusText: masResponse.statusText,
        details: errorText,
        targetEndpoint: MAS_DOMESTIC_RATES_ENDPOINT,
      });
    }

    const rawData = await masResponse.json();

    // 4. Normalize records for Singapore SORA standard consumption
    const rawRecords = Array.isArray(rawData)
      ? rawData
      : rawData?.result?.records || rawData?.records || rawData?.data || [];

    const normalizedRecords = rawRecords.map((item: any) => {
      const date = item.end_of_day || item.date || item.report_date;
      const sora = parseFloat(item.sora || item.rate || '0');
      const comp1M = parseFloat(item.comp_sora_1m || item.compounded_1m || item.comp_sora1m || '0');
      const comp3M = parseFloat(item.comp_sora_3m || item.compounded_3m || item.comp_sora3m || '0');
      const comp6M = parseFloat(item.comp_sora_6m || item.compounded_6m || item.comp_sora6m || '0');
      const soraIndex = parseFloat(item.sora_index || item.soraindex || '0');
      const aggregateVolume = parseFloat(item.aggr_vol || item.aggr_volume || item.volume || '0');

      return {
        date,
        sora,
        compounded1M: comp1M,
        compounded3M: comp3M,
        compounded6M: comp6M,
        soraIndex,
        aggregateVolume,
        raw: item,
      };
    });

    const responsePayload = {
      success: true,
      source: 'mas-apimg-gw',
      endpoint: MAS_DOMESTIC_RATES_ENDPOINT,
      fetchedAt: new Date().toISOString(),
      recordCount: normalizedRecords.length,
      latest: normalizedRecords.length > 0 ? normalizedRecords[normalizedRecords.length - 1] : null,
      records: normalizedRecords,
      raw: rawData,
    };

    // Update cache
    cachedResponse = {
      data: responsePayload,
      timestamp: now,
    };

    res.setHeader?.('X-Cache-Status', 'MISS');
    res.setHeader?.('Cache-Control', 'public, max-age=300');
    return res.status(200).json(responsePayload);
  } catch (error: any) {
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: error?.message || 'Failed to reach MAS API gateway',
      targetEndpoint: MAS_DOMESTIC_RATES_ENDPOINT,
    });
  }
}
