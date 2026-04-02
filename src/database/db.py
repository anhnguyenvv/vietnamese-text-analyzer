import sqlite3
from datetime import datetime
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "main.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("PRAGMA journal_mode = WAL")
    except sqlite3.OperationalError:
        # If another process/thread holds the DB lock, continue with default mode.
        pass
    # Bảng lưu lịch sử phân tích
    c.execute("""
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feature TEXT,
            input_text TEXT,
            result TEXT,
            created_at TEXT
        )
    """)
    # Bảng lưu feedback
    c.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            message TEXT,
            created_at TEXT
        )
    """)
    # Bảng lưu online inference metrics
    c.execute("""
        CREATE TABLE IF NOT EXISTS inference_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT,
            model_name TEXT,
            latency_ms REAL,
            is_success INTEGER,
            confidence_score REAL,
            ab_experiment TEXT,
            ab_variant TEXT,
            request_id TEXT,
            created_at TEXT
        )
    """)
    # Bảng lưu feedback đúng/sai cho output model
    c.execute("""
        CREATE TABLE IF NOT EXISTS inference_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inference_id TEXT,
            task TEXT,
            model_name TEXT,
            input_text TEXT,
            predicted_label TEXT,
            is_correct INTEGER,
            correct_label TEXT,
            comment TEXT,
            metadata_json TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

# --------- Lịch sử phân tích ---------
def save_history(feature, input_text, result):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO analysis_history (feature, input_text, result, created_at) VALUES (?, ?, ?, ?)",
        (feature, input_text, result, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_history(limit=50):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, feature, input_text, result, created_at FROM analysis_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# --------- Feedback ---------
def save_feedback(email, message):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO feedback (email, message, created_at) VALUES (?, ?, ?)",
        (email, message, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def load_feedback(limit=50):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, email, message, created_at FROM feedback ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_system_log(level, message, module="system"):
    conn = get_connection()
    c = conn.cursor()
    # Tạo bảng nếu chưa có
    c.execute("""
        CREATE TABLE IF NOT EXISTS system_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT,
            message TEXT,
            module TEXT,
            created_at TEXT
        )
    """)
    c.execute(
        "INSERT INTO system_log (level, message, module, created_at) VALUES (?, ?, ?, ?)",
        (level, message, module, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def load_system_log(limit=100):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, level, message, module, created_at FROM system_log ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def record_inference_metric(
    task,
    model_name,
    latency_ms,
    is_success,
    confidence_score=None,
    ab_experiment=None,
    ab_variant=None,
    request_id=None,
):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO inference_metrics (
            task, model_name, latency_ms, is_success, confidence_score,
            ab_experiment, ab_variant, request_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task,
            model_name,
            float(latency_ms or 0),
            1 if is_success else 0,
            float(confidence_score) if confidence_score is not None else None,
            ab_experiment,
            ab_variant,
            request_id,
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def get_online_metrics_summary(limit=1000):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        SELECT task, model_name, latency_ms, is_success, confidence_score
        FROM inference_metrics
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = [dict(row) for row in c.fetchall()]
    conn.close()

    total = len(rows)
    if total == 0:
        return {
            "window_size": limit,
            "total_requests": 0,
            "avg_latency_ms": 0,
            "error_rate": 0,
            "avg_confidence": 0,
            "by_task": {},
        }

    success_count = sum(1 for r in rows if r["is_success"] == 1)
    latencies = [float(r["latency_ms"] or 0) for r in rows]
    confidences = [float(r["confidence_score"]) for r in rows if r["confidence_score"] is not None]

    by_task = {}
    for r in rows:
        task = r["task"] or "unknown"
        if task not in by_task:
            by_task[task] = {
                "total": 0,
                "errors": 0,
                "latency_sum": 0,
                "confidence_values": [],
            }
        item = by_task[task]
        item["total"] += 1
        item["latency_sum"] += float(r["latency_ms"] or 0)
        if r["is_success"] != 1:
            item["errors"] += 1
        if r["confidence_score"] is not None:
            item["confidence_values"].append(float(r["confidence_score"]))

    normalized_by_task = {}
    for task, item in by_task.items():
        normalized_by_task[task] = {
            "total_requests": item["total"],
            "avg_latency_ms": round(item["latency_sum"] / item["total"], 4) if item["total"] else 0,
            "error_rate": round(item["errors"] / item["total"], 4) if item["total"] else 0,
            "avg_confidence": round(sum(item["confidence_values"]) / len(item["confidence_values"]), 4)
            if item["confidence_values"]
            else 0,
        }

    return {
        "window_size": limit,
        "total_requests": total,
        "avg_latency_ms": round(sum(latencies) / total, 4),
        "error_rate": round((total - success_count) / total, 4),
        "avg_confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0,
        "by_task": normalized_by_task,
    }


def save_inference_feedback(
    inference_id,
    task,
    model_name,
    input_text,
    predicted_label,
    is_correct,
    correct_label=None,
    comment=None,
    metadata=None,
):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO inference_feedback (
            inference_id, task, model_name, input_text, predicted_label,
            is_correct, correct_label, comment, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            inference_id,
            task,
            model_name,
            input_text,
            predicted_label,
            1 if is_correct else 0,
            correct_label,
            comment,
            json.dumps(metadata or {}, ensure_ascii=False),
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def load_inference_feedback(limit=100):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        SELECT id, inference_id, task, model_name, input_text, predicted_label,
               is_correct, correct_label, comment, metadata_json, created_at
        FROM inference_feedback
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows


# Khởi tạo database khi import module
init_db()