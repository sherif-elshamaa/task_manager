# Load Testing

This folder contains k6 and Artillery smoke test examples.

## k6

Run with Docker:

```bash
docker run --rm -i grafana/k6 run -e BASE_URL=http://host.docker.internal:3000/v1 - < loadtest/k6/smoke.js
```

Or locally (if k6 installed):

```bash
k6 run -e BASE_URL=http://localhost:3000/v1 loadtest/k6/smoke.js
```

## Artillery

```bash
npx artillery run loadtest/artillery/smoke.yaml
```
