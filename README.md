# Vietnamese Text Analyzer Platform

A Vietnamese natural language processing platform with a backend + frontend architecture, integrating multiple NLP tasks such as text preprocessing, POS tagging, NER, sentiment analysis, topic classification, summarization, and text statistics.

## Table of Contents

- [I. Overview](#i-overview)
- [II. System Architecture](#ii-system-architecture)
- [III. Project Structure](#iii-project-structure)
- [IV. Technology Stack](#iv-technology-stack)
- [V. Quick Start Guide](#v-quick-start-guide)
- [VI. Model and Data Setup](#vi-model-and-data-setup)
- [VII. Running the Application](#vii-running-the-application)
- [VIII. API and Key Features](#viii-api-and-key-features)
- [IX. Testing and Quality Assurance](#ix-testing-and-quality-assurance)
- [X. Development Guide](#x-development-guide)
- [XI. Operations and Monitoring](#xi-operations-and-monitoring)
- [XII. Troubleshooting](#xii-troubleshooting)
- [XIII. Documentation and Resources](#xiii-documentation-and-resources)

## I. Overview

Vietnamese Text Analyzer is a web application that supports multiple Vietnamese NLP tasks in one unified system:

- Text Preprocessing: normalize text, tokenize, and remove stopwords.
- POS Tagging: assign part-of-speech tags.
- Named Entity Recognition: detect and classify entities.
- Sentiment Analysis: classify text sentiment.
- Text Classification: categorize text into predefined topics.
- Summarization: generate concise summaries.
- Statistics: provide word, sentence, and length-based metrics.

The platform is suitable for academic use, model experimentation, and integration into Vietnamese text-processing systems.

## II. System Architecture

The project follows a layered architecture for maintainability and scalability:

- API Layer: `src/routes` handles request/response logic.
- Service Layer: `src/services` orchestrates business logic.
- Repository Layer: `src/repositories` handles persistence and data access.
- Schema Layer: `src/schemas` validates input/output contracts.
- NLP Core: `src/modules` contains task-specific processing logic.
- Shared Utilities: `src/utils` provides reusable helpers.
- Frontend: `front-end` (React) provides the user interface.

## III. Project Structure

```text
vietnamese-text-analyzer/
├── README.md
├── requirements.txt
├── pytest.ini
├── front-end/
│   ├── package.json
│   ├── README.md
│   ├── public/
│   │   ├── index.html
│   │   └── test_samples/
│   └── src/
│       ├── App.js
│       ├── config.js
│       ├── components/
│       └── pages/
├── src/
│   ├── app.py
│   ├── extensions.py
│   ├── config/
│   │   └── settings.py
│   ├── database/
│   │   └── db.py
│   ├── model/
│   │   ├── clf/
│   │   ├── vispam/
│   │   └── vncorenlp/
│   ├── modules/
│   │   ├── classification/
│   │   ├── pos_ner/
│   │   ├── preprocessing/
│   │   ├── sentiment/
│   │   ├── statistics/
│   │   └── summarization/
│   ├── routes/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── utils/
├── tests/
│   ├── conftest.py
│   ├── test_app_factory.py
│   └── test_feedback_routes.py
└── train_eval/
    └── *.ipynb
```

## IV. Technology Stack

### Backend

- Flask: primary API framework.
- Flask extensions: shared middleware and runtime configuration.
- PyTorch/Transformers: model execution and inference.
- Internal NLP modules: pipeline implementation for each task.

### Frontend

- React (Create React App): web UI.
- Component/page-level CSS: modular styling structure.

### AI/NLP

- PhoBERT, ViSoBERT: classification/sentiment models.
- VnCoreNLP: Vietnamese POS/NER processing.
- Vietnamese stopword set and text preprocessing pipeline.

### Testing

- Pytest: backend and route behavior testing.

## V. Quick Start Guide

### 1. Prerequisites

```bash
# Python and Node.js
python --version
pip --version
node --version
npm --version

```

Recommended:

- Python 3.9+
- Node.js 18+
- Minimum 8GB RAM (16GB recommended for larger models)

### 2. Clone and Set Up Environment

```bash
git clone https://github.com/anhnguyenvv/vietnamese-text-analyzer.git
cd vietnamese-text-analyzer
```

#### Linux/macOS

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd front-end
npm install
cd ..
```

### 4. Configure Environment Variables

Create `.env` files as needed for backend/frontend settings.

Frontend example (`front-end/.env`):

```env
REACT_APP_API_BASE=http://127.0.0.1:5000
```

## VI. Model and Data Setup

After installing dependencies, download required model weights:

```bash
pip install gdown
gdown --id 1xlc5ggWtrVxOlI4UDnzNyPYsIaNtaDKJ -O src/model/vispam/PhoBERT_vispamReview.pth
gdown --id 19VDgdzUmbntuN0dwztwAK4BGyodhQjl_ -O src/model/vispam/ViSoBERT_vispamReview.pth
gdown --id 17uObntzxDg3UwaA98F9GMNwmAzdpGw_Z -O src/model/clf/PhoBERT_topic_classification.pth
```

Notes:

- Ensure model files are saved in the exact directories above.
- Verify VnCoreNLP resources under `src/model/vncorenlp` before running POS/NER.

## VII. Running the Application

### 1. Run Backend

```bash
python src/app.py
```

Default backend URL: `http://127.0.0.1:5000`

### 2. Run Frontend (Development Mode)

```bash
cd front-end
npm.cmd start
```

Frontend dev server: `http://localhost:3000`

### 3. Build Frontend for Production

```bash
cd front-end
npm.cmd run build
```

After building, run the backend as usual. Flask serves static assets based on the current project configuration.

## VIII. API and Key Features

### 1. Capability Endpoint

- `GET /api/capabilities/`: returns endpoint catalog and system limits.

### 2. Main Endpoint Groups

- Preprocessing
- POS Tagging
- NER
- Sentiment
- Classification
- Summarization
- Statistics
- Feedback

### 3. Platform Safeguards

- Structured logging with `request_id`.
- Rate limiting for heavy NLP endpoints.
- Input validation:
  - Maximum text length: `20000` characters.
  - Upload format: `.csv`.
  - Accepted encoding: `utf-8` or `utf-8-sig`.
  - Maximum upload size: `5MB`.
  - Maximum CSV rows: `5000`.

## IX. Testing and Quality Assurance

### 1. Install Test Tools

```bash
pip install pytest
```

### 2. Run Backend Tests

```bash
pytest
```

Current tests:

- `tests/test_app_factory.py`: app factory smoke tests.
- `tests/test_feedback_routes.py`: feedback API route tests.
- `tests/conftest.py`: shared test bootstrap.

## X. Development Guide

### 1. Architectural Conventions

- `routes` should only handle request/response flow.
- Business logic should be implemented in `services`.
- DB/IO access should be implemented in `repositories`.
- Validation contracts should be defined in `schemas`.

### 2. Suggested Improvements

- Increase unit test coverage for `src/modules`.
- Add full API integration tests for NLP routes.
- Move heavy jobs to a worker queue (Celery/RQ).
- Add caching (Redis/in-memory) for repeated queries.
- Convert notebook-based evaluation into CI-ready scripts.

## XI. Operations and Monitoring

Recommended for production:

- Track latency per NLP endpoint.
- Track `4xx/5xx` error rates.
- Monitor RAM/CPU usage during model loading.
- Add a model health dashboard (version, load status, average response time).

## XII. Troubleshooting

### 1. Model File Not Found

- Re-check model paths under `src/model/...`.
- Confirm `.pth` files were downloaded completely.

### 2. POS/NER Not Working

- Verify resources in `src/model/vncorenlp`.
- Verify Java runtime availability if required by your pipeline.

If you see `FileNotFoundError: Java was not found, please install JRE or JDK >= 1.8 first`:

```powershell
# Install JDK 17 on Windows
winget install EclipseAdoptium.Temurin.17.JDK

# Re-open terminal, then verify
java -version
javac -version
```

### 3. Frontend Cannot Reach Backend

- Check `REACT_APP_API_BASE` in `front-end/.env`.
- Confirm backend is running on port `5000`.

### 4. Test Failures

- Activate the correct virtual environment.
- Reinstall dependencies from `requirements.txt`.
- Run `pytest -q` for concise output.

### 5. npm/React Frontend Issues on Windows PowerShell

If PowerShell blocks `npm` with `running scripts is disabled`:

```powershell
# Use npm.cmd directly
npm.cmd --version
npm.cmd install
npm.cmd start
npm.cmd run build
```

Or enable scripts only for the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

If you see `react-scripts is not recognized`:

```powershell
cd front-end
npm.cmd install
npm.cmd install react-scripts@5.0.1 --save
```

## XIII. Documentation and Resources

- Frontend guide: `front-end/README.md`
- Demo video: https://www.youtube.com/watch?v=K1Yqx6mqJoY
- Backend entrypoint: `src/app.py`
- Test suite: `tests/`

## License

This project is distributed under the MIT License (see LICENSE if available in this repository).

## Disclaimer

This system is intended for education, research, and technical reference for Vietnamese NLP.
Model outputs may be inaccurate in some real-world contexts. Always validate results before using them in important decisions.
