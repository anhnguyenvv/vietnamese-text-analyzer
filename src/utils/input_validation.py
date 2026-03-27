import io
from typing import Iterable, Optional, Tuple

import pandas as pd


MAX_TEXT_LENGTH = 20000
MAX_CSV_SIZE_MB = 5
MAX_CSV_ROWS = 5000


def validate_text_input(
    text: object,
    field_name: str = "text",
    max_length: int = MAX_TEXT_LENGTH,
) -> Tuple[Optional[str], Optional[Tuple[dict, int]]]:
    if not isinstance(text, str):
        return None, ({"error": f"{field_name} must be a string"}, 400)

    normalized = text.strip()
    if not normalized:
        return None, ({"error": f"{field_name} cannot be empty"}, 400)

    if len(normalized) > max_length:
        return None, ({"error": f"{field_name} exceeds max length {max_length}"}, 400)

    return normalized, None


def _read_utf8_csv_content(file_storage) -> Tuple[Optional[str], Optional[Tuple[dict, int]]]:
    raw_content = file_storage.read()
    file_storage.seek(0)

    for encoding in ("utf-8-sig", "utf-8"):
        try:
            return raw_content.decode(encoding), None
        except UnicodeDecodeError:
            continue

    return None, ({"error": "Unsupported file encoding. Please use UTF-8 CSV."}, 400)


def _validate_file_size(file_storage, max_mb: int) -> Optional[Tuple[dict, int]]:
    current_pos = file_storage.stream.tell()
    file_storage.stream.seek(0, 2)
    size_bytes = file_storage.stream.tell()
    file_storage.stream.seek(current_pos)

    if size_bytes > max_mb * 1024 * 1024:
        return {"error": f"File size exceeds {max_mb}MB"}, 400
    return None


def validate_csv_upload(
    file_storage,
    required_columns: Optional[Iterable[str]] = None,
    max_file_size_mb: int = MAX_CSV_SIZE_MB,
    max_rows: int = MAX_CSV_ROWS,
    text_column: str = "text",
    max_text_length: int = MAX_TEXT_LENGTH,
) -> Tuple[Optional[pd.DataFrame], Optional[Tuple[dict, int]]]:
    if file_storage is None:
        return None, ({"error": "No file uploaded"}, 400)

    filename = (file_storage.filename or "").strip().lower()
    if not filename.endswith(".csv"):
        return None, ({"error": "Only .csv files are supported"}, 400)

    file_size_error = _validate_file_size(file_storage, max_file_size_mb)
    if file_size_error is not None:
        return None, file_size_error

    decoded_content, decode_error = _read_utf8_csv_content(file_storage)
    if decode_error is not None:
        return None, decode_error

    try:
        df = pd.read_csv(io.StringIO(decoded_content))
    except Exception:
        return None, ({"error": "Invalid CSV format"}, 400)

    if len(df.index) > max_rows:
        return None, ({"error": f"CSV row count exceeds {max_rows}"}, 400)

    if required_columns:
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            return None, ({"error": f"Missing required columns: {', '.join(missing)}"}, 400)

    if text_column in df.columns:
        too_long = df[text_column].astype(str).str.len() > max_text_length
        if bool(too_long.any()):
            return None, ({"error": f"A row in '{text_column}' exceeds max length {max_text_length}"}, 400)

    return df, None
