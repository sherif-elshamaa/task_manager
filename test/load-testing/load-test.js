import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    errors: ['rate<0.1'], // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test data
const testTenant = {
  name: `Load Test Tenant ${Math.random()}`,
  plan: 'enterprise',
};

const testUser = {
  first_name: 'Load',
  last_name: 'Tester',
  email: `loadtest${Math.random()}@example.com`,
  password: 'LoadTest123!',
};

let authToken = '';
let tenantId = '';
let userId = '';
let projectId = '';

export function setup() {
  // Create tenant and user for load testing
  console.log('Setting up load test data...');
  
  const signupResponse = http.post(`${BASE_URL}/v1/auth/signup`, JSON.stringify({
    tenant_name: testTenant.name,
    owner: testUser,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (signupResponse.status === 201) {
    const data = JSON.parse(signupResponse.body);
    return {
      authToken: data.access_token,
      tenantId: data.tenant.tenant_id,
      userId: data.user.user_id,
    };
  }

  throw new Error('Failed to setup test data');
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.authToken}`,
  };

  // Test scenarios with different weights
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Read operations (list tasks, projects)
    testReadOperations(headers);
  } else if (scenario < 0.6) {
    // 30% - Write operations (create tasks, update tasks)
    testWriteOperations(headers, data.tenantId);
  } else if (scenario < 0.8) {
    // 20% - Search and filter operations
    testSearchOperations(headers);
  } else {
    // 20% - Complex operations (bulk operations, reports)
    testComplexOperations(headers, data.tenantId);
  }

  sleep(1); // Think time between requests
}

function testReadOperations(headers) {
  // List projects
  let response = http.get(`${BASE_URL}/v1/projects`, { headers });
  check(response, {
    'list projects status is 200': (r) => r.status === 200,
    'list projects response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  // List tasks
  response = http.get(`${BASE_URL}/v1/tasks`, { headers });
  check(response, {
    'list tasks status is 200': (r) => r.status === 200,
    'list tasks response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  // Get user profile
  response = http.get(`${BASE_URL}/v1/users/me`, { headers });
  check(response, {
    'get profile status is 200': (r) => r.status === 200,
    'get profile response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
}

function testWriteOperations(headers, tenantId) {
  // Create project
  let response = http.post(`${BASE_URL}/v1/projects`, JSON.stringify({
    name: `Load Test Project ${Math.random()}`,
    description: 'Created during load testing',
    visibility: 'private',
  }), { headers });

  check(response, {
    'create project status is 201': (r) => r.status === 201,
    'create project response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  if (response.status === 201) {
    const project = JSON.parse(response.body);
    
    // Create task in the project
    response = http.post(`${BASE_URL}/v1/projects/${project.project_id}/tasks`, JSON.stringify({
      title: `Load Test Task ${Math.random()}`,
      description: 'Created during load testing',
      priority: 'medium',
      due_date: '2024-12-31',
    }), { headers });

    check(response, {
      'create task status is 201': (r) => r.status === 201,
      'create task response time < 400ms': (r) => r.timings.duration < 400,
    }) || errorRate.add(1);
  }
}

function testSearchOperations(headers) {
  // Search tasks
  let response = http.get(`${BASE_URL}/v1/tasks?q=test&status=todo&limit=20`, { headers });
  check(response, {
    'search tasks status is 200': (r) => r.status === 200,
    'search tasks response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  // Search projects
  response = http.get(`${BASE_URL}/v1/projects?search=load&limit=10`, { headers });
  check(response, {
    'search projects status is 200': (r) => r.status === 200,
    'search projects response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
}

function testComplexOperations(headers, tenantId) {
  // Get activity logs (complex query)
  let response = http.get(`${BASE_URL}/v1/activity-logs?limit=50&resource_type=task`, { headers });
  check(response, {
    'activity logs status is 200': (r) => r.status === 200,
    'activity logs response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1);

  // Health check
  response = http.get(`${BASE_URL}/v1/monitoring/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 50ms': (r) => r.timings.duration < 50,
  }) || errorRate.add(1);

  // Metrics endpoint
  response = http.get(`${BASE_URL}/v1/monitoring/metrics`);
  check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
}

export function teardown(data) {
  console.log('Cleaning up load test data...');
  // In a real scenario, you might want to clean up test data
  // For now, we'll leave it for analysis
}
