# Production Deployment Guide — ParkSwift API

## Database Connection Pool Sizing

### Overview
The API maintains a connection pool to the PostgreSQL database. Each HTTP request acquires a connection from the pool, executes queries, then releases it. Pool exhaustion causes request timeouts and cascading failures.

### Configuration

**Environment Variable:** `DATABASE_POOL_SIZE` (default: 20)

```bash
# Development
DATABASE_POOL_SIZE=5

# Staging (5 instances)
DATABASE_POOL_SIZE=10  # 5 instances × 2 connections each

# Production (20 instances)
DATABASE_POOL_SIZE=40  # 20 instances × 2 connections each
```

**Formula:**
```
DATABASE_POOL_SIZE = min(100, APP_INSTANCES × 2)
```

Where:
- `APP_INSTANCES` = number of app replicas running
- `100` = hard cap (PostgreSQL default `max_connections` is 100)
- `2` = connections per instance (conservative estimate)

### Recommended Scaling

| Deployment | Instances | Pool Size | Notes |
|---|---|---|---|
| **Development** | 1 | 5 | Local machine |
| **Staging** | 3 | 6 | Testing environment |
| **Production** | 10 | 20 | Initial launch |
| **Production** | 20 | 40 | 2–3x user growth |
| **Production** | 50 | 100 | Max pool (before scaling DB) |

### Monitoring

**CloudSQL Metrics to Watch:**

1. **Active Connections** (Monitoring → SQL Instances)
   - Alert if `active_connections > 70 × pool_size`
   - Example: pool=20, alert at 14 connections

2. **Connection Timeouts** (Logs → Error rate spike)
   - `Error: could not find a free connection after 30000 ms`
   - Action: increase `DATABASE_POOL_SIZE`

3. **Query Duration** (Query Insights)
   - Spikes indicate connection starvation
   - Action: scale instances horizontally

**Recommended Alerts (Google Cloud Console):**

```yaml
# Alert if pool exhausted
resource: cloudsql_database
metric: database/active_connections
condition: value > 18  # 90% of 20-pool
duration: 5min
action: page on-call engineer
```

```yaml
# Alert if connection errors spike
resource: Cloud Run service
metric: request_count
filter: status_code="500" AND error~="connection"
condition: rate > 1/min
duration: 1min
action: page + auto-scaling disabled
```

### Scaling Strategy

#### Horizontal (Recommended)
When active connections exceed 70% of pool:

```bash
# Increase instances (not pool size)
gcloud run deploy parking-api \
  --instances=15 \
  --max-instances=50

# Pool size stays at 20 (5 × 2 × 2 = 20)
# Connection pressure distributes across more instances
```

#### Vertical (Last Resort)
Only increase pool if horizontal scaling is maxed out (100 instances):

```bash
# Increase pool (up to 100)
export DATABASE_POOL_SIZE=60
# Redeploy containers
```

### Connection Pool Exhaustion Troubleshooting

**Symptom:** `Error: could not find a free connection after 30000 ms`

**Diagnosis:**
```sql
-- Check current active connections (run in CloudSQL)
SELECT datname, count(*) FROM pg_stat_activity 
GROUP BY datname 
ORDER BY count DESC;

-- Expected: current < pool_size (20 by default)
-- Exceeded: indicates query leaks or slow queries
```

**Root Causes:**
1. **Slow Queries** — Query taking > 30 seconds, holding connection
   - Fix: Optimize query, add index, or increase timeout
2. **Connection Leak** — Code not closing connection (Prisma handles this automatically)
   - Fix: Check for missing `.finally()` in transaction blocks
3. **Cascade Failures** — One slow service blocks all others
   - Fix: Set per-query timeouts in Prisma

**Temporary Mitigation:**
```bash
# Increase pool temporarily (max 100)
export DATABASE_POOL_SIZE=50
# Monitor & find root cause simultaneously
```

### Connection Lifecycle

```
Request arrives
    ↓
Acquire connection from pool (waits if none available, max 30s)
    ↓
Execute queries (transaction)
    ↓
Release connection back to pool
    ↓
Response sent
```

If any step takes > 30 seconds, other requests queue and timeout.

### Best Practices

1. **Always use transactions for multi-query operations** (Prisma `$transaction()`)
2. **Index foreign key columns** to avoid slow joins
3. **Monitor query performance** in CloudSQL Query Insights
4. **Set read-only replicas** for reporting/analytics (separate pool)
5. **Use connection pooling middleware** (pgBouncer) for 100+ instances

### Database Upgrade Path

If PostgreSQL `max_connections` becomes a bottleneck:

| Current | Max Pool | Next Step |
|---|---|---|
| 100 instances | 100 | Upgrade to Cloud SQL Plus (higher max) |
| 200 instances | 100 | Deploy read-only replica + pgBouncer |
| 500 instances | 100 | Shard database by user region |

---

## Other Production Checklist

- [ ] `DATABASE_POOL_SIZE` env var set
- [ ] Error alerts on connection timeouts
- [ ] Connection monitoring dashboards created
- [ ] Rate limiting enabled (middleware/rateLimit.ts)
- [ ] Request timeout set (30s default)
- [ ] Slow query logs enabled (CloudSQL)
- [ ] Backup schedule configured (daily to GCS)
- [ ] Read replicas deployed (if > 50 instances)
