// Địa chỉ API backend, tự động lấy theo domain khi build production
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.origin.includes("localhost")
    ? "http://localhost:5000"
    : window.location.origin);

const TEST_SAMPLE_PATHS = {
  sentiment: [
    "../public/test_samples/sentiment/sentiment_sample.txt",
    "../public/test_samples/sentiment/sentiment_sample.csv"
  ],
  classification: [
    "../public/test_samples/classification/classification_sample.txt",
    "../public/test_samples/classification/classification_sample.csv"
  ],
  pos: [
    "../public/test_samples/pos/pos_sample.txt"
  ],
  ner: [
    "../public/test_samples/ner/ner_sample.txt"
  ],
  summary: [
    "../public/test_samples/summary/summary_sample.txt"
  ]
};

export { API_BASE, TEST_SAMPLE_PATHS };
export default API_BASE;

