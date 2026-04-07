# Monitoring Guide

This folder contains monitoring setup for the Vietnamese Text Analyzer stack.

## Structure

- `prometheus/prometheus.yml`: Prometheus scrape config
- `prometheus/rules/vta_rules.yml`: Recording rules and alert rules
- `alertmanager/alertmanager.yml`: Alert routing config
- `grafana/provisioning/datasources/datasource.yml`: Grafana datasource provisioning
- `grafana/provisioning/dashboards/dashboard.yml`: Grafana dashboard provider
- `grafana/provisioning/dashboards/json/vta-overview.json`: Overview dashboard
- `grafana/provisioning/dashboards/json/vta-http-errors.json`: HTTP and error dashboard

## Services

Monitoring is started by `docker-compose.yml` at project root:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`
  - user: `admin`
  - password: `admin`

## Quick Start

From project root:

```bash
docker compose up -d prometheus alertmanager grafana
```

If backend is not running yet, start full stack:

```bash
docker compose up -d
```

## Verify Prometheus Targets

1. Open `http://localhost:9090/targets`
2. Confirm target `vietnamese-text-analyzer:5000` is UP
3. Test metric query in Prometheus UI:
   - `vta_http_requests_total`
   - `vta_inference_requests_total`

4. Confirm extra targets are UP:

- `prometheus:9090`
- `grafana:3000`

## Verify Alerting

1. Open Prometheus rules page: `http://localhost:9090/rules`
2. Confirm groups `vta-recording-rules` and `vta-alert-rules` are loaded
3. Open Alertmanager: `http://localhost:9093`
4. Check active alerts at `http://localhost:9090/alerts`

Included alerts:

- API target down
- Prometheus target down
- Grafana target down
- High HTTP error rate (>10%)
- High P95 latency (>1.5s)
- Low inference success rate (<90%)
- High inference error rate (>10%)

## Verify Grafana Dashboards

1. Open `http://localhost:3001`
2. Go to Dashboards
3. Open folder `Vietnamese Text Analyzer`
4. You should see:
   - `VTA Overview`
   - `VTA HTTP & Errors`

## Reload After Dashboard Changes

If you edit JSON dashboards and do not see updates:

```bash
docker compose restart grafana
```

## Common Issues

### No data in Grafana

- Check backend `/metrics` endpoint is reachable
- Check Prometheus target status is UP
- Check datasource URL in Grafana provisioning points to `http://prometheus:9090`

### Alerts not firing

- Confirm `prometheus/rules/vta_rules.yml` is mounted into Prometheus
- Confirm Alertmanager is reachable at `alertmanager:9093`
- Check Prometheus `Status -> Rules` for expression errors

### Grafana starts but no provisioned dashboards

- Verify dashboard files are in:
  - `/etc/grafana/provisioning/dashboards/json`
- Verify `dashboard.yml` path is correct
- Restart Grafana container

## Notes

- Dashboard queries are based on `vta_*` Prometheus metrics exposed by backend.
- Datasource uses fixed UID `prometheus` so dashboard references stay stable.
- Grafana metrics scrape requires `GF_METRICS_ENABLED=true` (already set in compose).
