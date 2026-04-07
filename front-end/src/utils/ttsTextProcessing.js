const ROMAN_VALUES = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

const VI_DIGITS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

function numberUnder1000ToVietnamese(value, isLeadingGroup = false) {
  const hundreds = Math.floor(value / 100);
  const tensOnes = value % 100;
  const tens = Math.floor(tensOnes / 10);
  const ones = tensOnes % 10;
  const words = [];

  if (hundreds > 0) {
    words.push(`${VI_DIGITS[hundreds]} trăm`);
  } else if (!isLeadingGroup && tensOnes > 0) {
    words.push("không trăm");
  }

  if (tens > 1) {
    words.push(`${VI_DIGITS[tens]} mươi`);
    if (ones === 1) {
      words.push("mốt");
    } else if (ones === 4) {
      words.push("tư");
    } else if (ones === 5) {
      words.push("lăm");
    } else if (ones > 0) {
      words.push(VI_DIGITS[ones]);
    }
  } else if (tens === 1) {
    words.push("mười");
    if (ones === 5) {
      words.push("lăm");
    } else if (ones > 0) {
      words.push(VI_DIGITS[ones]);
    }
  } else if (tensOnes > 0) {
    if (!isLeadingGroup && hundreds > 0) {
      words.push("lẻ");
    }

    if (ones === 5 && hundreds > 0) {
      words.push("năm");
    } else if (ones > 0) {
      words.push(VI_DIGITS[ones]);
    }
  }

  return words.join(" ").trim();
}

export function numberToVietnameseWords(rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return String(rawValue);
  }

  if (numeric === 0) {
    return "không";
  }

  const negativePrefix = numeric < 0 ? "âm " : "";
  let n = Math.trunc(Math.abs(numeric));

  const units = ["", "nghìn", "triệu", "tỷ"];
  const groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const groupValue = groups[i];
    if (groupValue === 0) {
      continue;
    }

    const groupWords = numberUnder1000ToVietnamese(groupValue, i === groups.length - 1);
    const unit = units[i % units.length];
    const tier = Math.floor(i / units.length);
    const tierWords = tier > 0 ? ` ${"tỷ".repeat(tier)}` : "";
    const suffix = `${unit}${tierWords}`.trim();

    if (suffix) {
      parts.push(`${groupWords} ${suffix}`.trim());
    } else {
      parts.push(groupWords);
    }
  }

  return `${negativePrefix}${parts.join(" ")}`.replace(/\s+/g, " ").trim();
}

export function romanToInteger(value) {
  const input = String(value || "").toUpperCase();
  if (!/^[IVXLCDM]+$/.test(input)) {
    return null;
  }

  let total = 0;
  let previous = 0;
  for (let i = input.length - 1; i >= 0; i -= 1) {
    const current = ROMAN_VALUES[input[i]];
    if (!current) {
      return null;
    }

    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total > 0 && total < 4000 ? total : null;
}

function normalizeDateToken(token) {
  const match = String(token).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) {
    return token;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (day <= 0 || day > 31 || month <= 0 || month > 12) {
    return token;
  }

  return `ngày ${numberToVietnameseWords(day)} tháng ${numberToVietnameseWords(month)} năm ${numberToVietnameseWords(year)}`;
}

function normalizeTimeToken(token) {
  const match = String(token).match(/^(\d{1,2})[:h](\d{1,2})(?::(\d{1,2}))?$/i);
  if (!match) {
    return token;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] != null ? Number(match[3]) : null;
  if (hours > 23 || minutes > 59 || (seconds != null && seconds > 59)) {
    return token;
  }

  if (seconds != null) {
    return `${numberToVietnameseWords(hours)} giờ ${numberToVietnameseWords(minutes)} phút ${numberToVietnameseWords(seconds)} giây`;
  }

  return `${numberToVietnameseWords(hours)} giờ ${numberToVietnameseWords(minutes)} phút`;
}

function normalizeDecimalCommaToken(token) {
  const match = String(token).match(/^(\d+),(\d+)$/);
  if (!match) {
    return token;
  }

  const integerPart = numberToVietnameseWords(match[1]);
  const decimalDigits = match[2]
    .split("")
    .map((digit) => numberToVietnameseWords(digit))
    .join(" ");

  return `${integerPart} phẩy ${decimalDigits}`;
}

export function normalizeVietnameseTtsText(text) {
  let normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/\s+/g, " ");

  normalized = normalized.replace(/(\d+(?:,\d+)?)\s*[-–]\s*(\d+(?:,\d+)?)/g, (_, left, right) => {
    const leftWords = left.includes(",") ? normalizeDecimalCommaToken(left) : numberToVietnameseWords(left);
    const rightWords = right.includes(",") ? normalizeDecimalCommaToken(right) : numberToVietnameseWords(right);
    return `${leftWords} đến ${rightWords}`;
  });

  normalized = normalized.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, (token) => normalizeDateToken(token));
  normalized = normalized.replace(/\b\d{1,2}(?::\d{1,2})(?::\d{1,2})?\b|\b\d{1,2}h\d{1,2}(?::\d{1,2})?\b/gi, (token) =>
    normalizeTimeToken(token)
  );

  normalized = normalized.replace(/\b[IVXLCDM]{1,10}\b/g, (token) => {
    const value = romanToInteger(token);
    if (value == null) {
      return token;
    }
    return numberToVietnameseWords(value);
  });

  normalized = normalized.replace(/\b\d+,\d+\b/g, (token) => normalizeDecimalCommaToken(token));

  normalized = normalized.replace(/\b\d+\b/g, (token) => numberToVietnameseWords(token));

  return normalized.replace(/\s+/g, " ").trim();
}

export function chunkTextForTts(text, maxChars = 220) {
  const input = String(text || "").trim();
  if (!input) {
    return [];
  }

  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  const splitByWords = (value) => {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const longChunks = [];
    let wordBuffer = "";

    for (const word of words) {
      const candidate = wordBuffer ? `${wordBuffer} ${word}` : word;
      if (candidate.length > maxChars) {
        if (wordBuffer) {
          longChunks.push(wordBuffer.trim());
        }
        wordBuffer = word;
      } else {
        wordBuffer = candidate;
      }
    }

    if (wordBuffer.trim()) {
      longChunks.push(wordBuffer.trim());
    }

    return longChunks;
  };

  const splitLongSentence = (sentence) => {
    if (sentence.length <= maxChars) {
      return [sentence];
    }

    const phraseParts = sentence
      .split(/(?<=[,;:])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (phraseParts.length <= 1) {
      return splitByWords(sentence);
    }

    const result = [];
    let phraseBuffer = "";
    for (const phrase of phraseParts) {
      if (phrase.length > maxChars) {
        if (phraseBuffer) {
          result.push(phraseBuffer.trim());
          phraseBuffer = "";
        }
        result.push(...splitByWords(phrase));
        continue;
      }

      const candidate = phraseBuffer ? `${phraseBuffer} ${phrase}` : phrase;
      if (candidate.length > maxChars) {
        if (phraseBuffer) {
          result.push(phraseBuffer.trim());
        }
        phraseBuffer = phrase;
      } else {
        phraseBuffer = candidate;
      }
    }

    if (phraseBuffer.trim()) {
      result.push(phraseBuffer.trim());
    }
    return result;
  };

  const paragraphs = input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const sentenceParts = paragraph
      .split(/(?<=[.!?…;:])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (sentenceParts.length === 0) {
      sentenceParts.push(paragraph);
    }

    // Flush before moving to a new paragraph to preserve natural paragraph breaks.
    pushCurrent();

    for (const sentence of sentenceParts) {
      const sentencePieces = splitLongSentence(sentence);
      for (const piece of sentencePieces) {
        const candidate = current ? `${current} ${piece}` : piece;
        if (candidate.length > maxChars) {
          pushCurrent();
          current = piece;
        } else {
          current = candidate;
        }
      }
    }

    pushCurrent();
  }

  pushCurrent();
  return chunks;
}
