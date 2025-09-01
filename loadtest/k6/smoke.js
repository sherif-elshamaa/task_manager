import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/v1';

export default function () {
  const res = http.get(`${BASE_URL}/monitoring/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
