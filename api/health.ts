import type { Request, Response } from 'express';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: {
    nodeEnv: string;
    masKeyConfigured: boolean;
  };
  endpoints: {
    sora: string;
    health: string;
  };
}

/**
 * Serverless / Express health check endpoint
 * Path: /api/health
 */
export default async function handler(req: Request | any, res: Response | any) {
  // Support CORS
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, KeyId, x-mas-key-id, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status?.(200).end?.() || res.end?.();
  }

  const masKeyConfigured = Boolean(process.env.MAS_KEY_ID || req.headers?.['x-mas-key-id'] || req.headers?.['keyid']);

  const responseData: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      masKeyConfigured,
    },
    endpoints: {
      sora: '/api/sora',
      health: '/api/health',
    },
  };

  if (res.json) {
    return res.status(200).json(responseData);
  } else {
    // For standard web Response/serverless runtimes
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
