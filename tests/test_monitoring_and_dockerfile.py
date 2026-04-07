import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MONITORING_ROOT = PROJECT_ROOT / "monitoring"


def test_prometheus_monitoring_config_includes_rules_and_targets():
    prometheus_config = (MONITORING_ROOT / "prometheus" / "prometheus.yml").read_text(encoding="utf-8")

    assert "rule_files:" in prometheus_config
    assert "/etc/prometheus/rules/*.yml" in prometheus_config
    assert "alertmanagers:" in prometheus_config
    assert "alertmanager:9093" in prometheus_config
    assert "job_name: prometheus" in prometheus_config
    assert "prometheus:9090" in prometheus_config
    assert "job_name: vietnamese-text-analyzer" in prometheus_config
    assert "vietnamese-text-analyzer:5000" in prometheus_config
    assert "job_name: grafana" in prometheus_config
    assert "grafana:3000" in prometheus_config


def test_grafana_provisioning_points_to_dashboard_directory():
    datasource_config = (MONITORING_ROOT / "grafana" / "provisioning" / "datasources" / "datasource.yml").read_text(encoding="utf-8")
    dashboard_config = (MONITORING_ROOT / "grafana" / "provisioning" / "dashboards" / "dashboard.yml").read_text(encoding="utf-8")

    assert "uid: prometheus" in datasource_config
    assert "url: http://prometheus:9090" in datasource_config
    assert "folder: Vietnamese Text Analyzer" in dashboard_config
    assert "/etc/grafana/provisioning/dashboards/json" in dashboard_config


def test_dashboard_json_files_have_expected_shape():
    overview_path = MONITORING_ROOT / "grafana" / "provisioning" / "dashboards" / "json" / "vta-overview.json"
    http_errors_path = MONITORING_ROOT / "grafana" / "provisioning" / "dashboards" / "json" / "vta-http-errors.json"

    overview = json.loads(overview_path.read_text(encoding="utf-8"))
    http_errors = json.loads(http_errors_path.read_text(encoding="utf-8"))

    assert overview["uid"] == "vta-overview"
    assert overview["title"] == "VTA Overview"
    assert len(overview["panels"]) >= 1

    assert http_errors["uid"] == "vta-http-errors"
    assert http_errors["title"] == "VTA HTTP & Errors"
    assert len(http_errors["panels"]) >= 1


def test_dockerfile_uses_runtime_java_and_gunicorn():
    dockerfile = (PROJECT_ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert "FROM node:20-alpine AS frontend-builder" in dockerfile
    assert "FROM python:3.11-slim AS runtime" in dockerfile
    assert "default-jre-headless" in dockerfile
    assert "build-essential" not in dockerfile
    assert "DEBIAN_FRONTEND=noninteractive" in dockerfile
    assert "COPY --from=frontend-builder /app/front-end/build ./front-end/build" in dockerfile
    assert "EXPOSE 5000" in dockerfile
    assert "CMD [\"gunicorn\", \"-c\", \"gunicorn.conf.py\", \"app:create_app()\"]" in dockerfile
