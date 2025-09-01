#!/usr/bin/env node
/* Simple smoke tests against API_BASE_URL */
const https = require('https');
const http = require('http');

const base = process.env.API_BASE_URL || 'http://localhost:3000';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = `${base}${path}`;
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      const { statusCode } = res;
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => resolve({ statusCode, body: raw }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timeout'));
    });
  });
}

(async () => {
  try {
    const health = await get('/v1/monitoring/health');
    if (health.statusCode !== 200) throw new Error(`Health check failed: ${health.statusCode}`);

    const ready = await get('/v1/monitoring/ready');
    if (ready.statusCode !== 200) throw new Error(`Readiness failed: ${ready.statusCode}`);

    // Optionally verify metrics are exposed
    const metrics = await get('/v1/monitoring/metrics');
    if (metrics.statusCode !== 200 || !/process_cpu_user_seconds_total/.test(metrics.body)) {
      throw new Error('Metrics endpoint not healthy');
    }

    console.log('Smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke tests failed:', err.message);
    process.exit(1);
  }
})();
