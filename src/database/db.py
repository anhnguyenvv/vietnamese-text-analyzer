import sqlite3
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "main.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
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

# Khởi tạo database khi import module
init_db()