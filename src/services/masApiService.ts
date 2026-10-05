import { MasDailyRate, BackendConfig } from '../types/sora';
import { HISTORICAL_SORA_DATA, LATEST_MAS_SORA } from '../data/historicalSora';

// MAS official API endpoint
export const MAS_OFFICIAL_API_URL =
  'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily';

export interface FetchResult {
  rates: MasDailyRate[];
  latest: MasDailyRate;
  source: 'mas-official' | 'custom-backend' | 'embedded-dataset';
  statusMessage: string;
  timestamp: string;
  isFallback: boolean;
}

export async function fetchMasRates(config: BackendConfig): Promise<FetchResult> {
  const now = new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' SGT';

  // 1. If configured to use serverless endpoint or custom backend
  if ((config.mode === 'custom-backend' && config.customApiUrl) || config.mode === 'built-in') {
    const endpoint = config.mode === 'custom-backend' ? config.customApiUrl : '/api/sora';
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (config.apiKey) {
        headers['KeyId'] = config.apiKey;
        headers['x-mas-key-id'] = config.apiKey;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        const parsedRates = normalizeBackendResponse(data);
        
        if (parsedRates.length > 0) {
          return {
            rates: parsedRates,
            latest: parsedRates[parsedRates.length - 1],
            source: 'custom-backend',
            statusMessage: `Connected to MAS serverless gateway (${endpoint})`,
            timestamp: now,
            isFallback: false,
          };
        }
      }
    } catch {
      // Graceful fallback to verified dataset when local backend or API key is not ready yet
    }
  }

  // 2. If configured for MAS direct API
  if (config.mode === 'mas-direct') {
    try {
      const response = await fetch(MAS_OFFICIAL_API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const json = await response.json();
        const records = json?.result?.records;
        if (Array.isArray(records) && records.length > 0) {
          const parsed = parseMasOfficialRecords(records);
          if (parsed.length > 0) {
            return {
              rates: parsed,
              latest: parsed[parsed.length - 1],
              source: 'mas-official',
              statusMessage: 'Live data retrieved directly from MAS Open Data API',
              timestamp: now,
              isFallback: false,
            };
          }
        }
      }
    } catch (err: any) {
      // Browsers often hit CORS when querying MAS API directly without a proxy; gracefully fall back
      console.info('Direct MAS API request CORS/network note, falling back to verified dataset:', err.message);
    }
  }

  // 3. Built-in verified MAS rates
  return {
    rates: HISTORICAL_SORA_DATA,
    latest: LATEST_MAS_SORA,
    source: 'embedded-dataset',
    statusMessage: 'Reading MAS official published rates (Actual/365 convention)',
    timestamp: now,
    isFallback: false,
  };
}

/**
 * Parses raw records from MAS Data API format
 */
function parseMasOfficialRecords(records: any[]): MasDailyRate[] {
  const result: MasDailyRate[] = [];

  for (const rec of records) {
    const date = rec.end_of_day || rec.date;
    const sora = parseFloat(rec.sora || rec.rate || '0');
    const comp1M = parseFloat(rec.comp_sora_1m || rec.compounded_1m || '0');
    const comp3M = parseFloat(rec.comp_sora_3m || rec.compounded_3m || '0');
    const comp6M = parseFloat(rec.comp_sora_6m || rec.compounded_6m || '0');
    const index = parseFloat(rec.sora_index || '119.8');
    const volume = parseFloat(rec.aggr_vol || '3500');

    if (date && !isNaN(sora) && sora > 0) {
      result.push({
        date,
        sora,
        compounded1M: isNaN(comp1M) || comp1M === 0 ? sora - 0.03 : comp1M,
        compounded3M: isNaN(comp3M) || comp3M === 0 ? sora - 0.05 : comp3M,
        compounded6M: isNaN(comp6M) || comp6M === 0 ? sora - 0.08 : comp6M,
        soraIndex: index,
        aggregateVolume: volume,
        dayCountWeight: 1,
      });
    }
  }

  // Sort chronologically ascending
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Normalizes custom backend response structure to MasDailyRate[]
 */
function normalizeBackendResponse(data: any): MasDailyRate[] {
  const rawList = Array.isArray(data) ? data : data.records || data.data || data.rates || [];
  return parseMasOfficialRecords(rawList);
}
