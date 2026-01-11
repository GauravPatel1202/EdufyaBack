# SRE Runbook: Edufya Performance & Reliability

This runbook provides guidance for responding to performance alerts based on the **Latency, Performance, and Optimization Matrix**.

## 1. High API Latency (p95 > 200ms)

**Signal:** `http_request_duration_seconds` quantile 0.95 is rising.

### Diagnosis

1. Check **Database Latency**: Is `db_query_duration_seconds` also rising for the same route?
2. Check **Throughput**: Is there a spike in `RPS`?
3. Check **System Resources**: CPU/Memory utilization on the backend server.

### Remediation

- **If DB is slow:** Optimize slow queries (add indexes) or check DB connection pool.
- **If RPS is high:** Scale horizontal instances or check if a specific IP/User is flooding (Rate Limiting).

## 2. Rising Error Rate (> 0.1%)

**Signal:** `http_request_duration_seconds_count` for 5xx status codes is increasing.

### Diagnosis

1. Check **Structured Logs**: Look for "Error" level logs in the backend.
2. Check **Dependency Failures**: Are database connections failing?
3. Check **Circuit Breakers**: Are any external service integrations failing?

### Remediation

- Roll back the latest deployment if it coincides with the error spike.
- Increase timeout values if errors are caused by slow dependencies.

## 3. Database Bottlenecks

**Signal:** `db_query_duration_seconds` p95 > 50ms.

### Diagnosis

1. Identify the **Collection** and **Operation** from Prometheus labels.
2. Run `explain()` on the identified slow query in MongoDB.

### Remediation

- Create missing indexes.
- Refactor aggregate pipelines to use `$match` earlier.
- Increase DB instance size if IOPS are saturated.

## 4. Frontend Performance Degressions (TTFB > 100ms)

**Signal:** `[Performance] TTFB` logs from clients or browser monitoring.

### Diagnosis

1. Check **CDN Cache Hit Ratio**.
2. Check **Backend Response Start** time.

### Remediation

- Ensure static assets are properly cached.
- Optimize backend initialization and middleware chain.

---

**Golden Rule:** High utilization + rising latency = bottleneck. Always check resource saturation first.
