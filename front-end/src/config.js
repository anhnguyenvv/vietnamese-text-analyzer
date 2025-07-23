// Địa chỉ API backend, tự động lấy theo domain khi build production
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.origin.includes("localhost")
    ? "http://localhost:5000"
    : window.location.origin);

const TEST_SAMPLE_PATHS = {
  preprocess: [
    "/test_samples/preprocess/preprocess_sample.txt",
    "/test_samples/preprocess/preprocess_sample.csv"
  ],
  sentiment: [
    "/test_samples/sentiment/sentiment_sample.txt",
    "/test_samples/sentiment/sentiment_sample.csv"
  ],
  spam: [
    "/test_samples/spam/spam_detection_sample.txt",
    "/test_samples/spam/spam_detection_sample.csv"
  ],
  essay_identification: [
    "/test_samples/essay_identification/essay_identification_sample.txt",
    "/test_samples/essay_identification/essay_identification_sample.csv"
  ],
  classification: [
    "/test_samples/classify/classification_sample.txt",
    "/test_samples/classify/classification_sample.csv"
  ],
  pos: [
    "/test_samples/pos/pos_sample.txt"
  ],
  ner: [
    "/test_samples/ner/ner_sample.txt"
  ],
  summary: [
    "/test_samples/summary/summary_sample.txt"
  ],
  stats: [
    "/test_samples/stats/statistic_sample.txt"
  ]
};

export { API_BASE, TEST_SAMPLE_PATHS };
export default API_BASE;

