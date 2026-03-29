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
- [X. Model Training and Evaluation](#x-model-training-and-evaluation)
- [XI. Operations and Monitoring](#xi-operations-and-monitoring)
- [XII. Troubleshooting](#xii-troubleshooting)
- [XIII. Documentation and Resources](#xiii-documentation-and-resources)
- [XIV. Docker Deployment](#xiv-docker-deployment)

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

- Flask 3.x: primary REST API framework.
- Flask-CORS: cross-origin access between frontend and backend.
- Flask-Limiter: rate limiting for heavy NLP endpoints.
- Pydantic v2: request/response schema validation.
- Structured JSON logging + request_id: operational traceability.
- Service/Repository/Schema architecture: maintainable business and data layers.

### Frontend

- React (Create React App): web user interface.
- Axios: HTTP client for API integration.
- PapaParse: CSV parsing for batch processing workflows.
- Chart.js: metrics and visualization support.
- Component/page-level CSS: modular styling structure.

### AI/NLP

- PyTorch + Hugging Face Transformers: model runtime and inference.
- PhoBERT, ViSoBERT: classification and sentiment models.
- VnCoreNLP and Underthesea: Vietnamese POS/NER processing and model comparison.
- SentencePiece: tokenizer support for transformer pipelines.
- Vietnamese stopword set and text preprocessing pipeline.

### Data and Storage

- SQLite: local persistence for history, feedback, and online metrics.
- Pandas + NumPy: tabular processing and analytics utilities.

### Testing

- Pytest: backend and route behavior testing.

### DevOps and Delivery

- GitHub Actions: CI/CD for tests, frontend build, and delivery artifacts.
- Docker + Docker Compose: containerized deployment for local/prod-like runs.
- GHCR/Docker Hub workflow: automated image publishing.

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

## X. Model Training and Evaluation

Training and evaluation assets are maintained in `train_eval/` as task-oriented notebooks.

### 1. Available Training/Evaluation Notebooks

- `vntc-classification-using-phobert-transformer.ipynb`: topic classification pipeline and experiments.
- `pt-vispamreviews-inference.ipynb`: sentiment inference and model behavior checks.
- `vit5-base-vietnews-summarization-eva.ipynb`: summarization quality evaluation.
- `pos-ner-eval (1).ipynb`: POS/NER benchmarking and comparison workflows.
- `paultran-vn-essay-idf.ipynb`: essay-related feature exploration.

### 2. Recommended Workflow

1. Start from a copied notebook and avoid overwriting baseline experiment files.
2. Keep model checkpoints and dataset references versioned and documented.
3. Export final metrics (accuracy/F1/ROUGE as applicable) into reproducible reports.
4. Promote stable notebook pipelines into Python scripts for CI execution when possible.

### 3. Reproducibility Notes

- Pin package versions from `requirements.txt` before rerunning experiments.
- Record random seeds and train/validation/test split strategy.
- Save evaluation outputs with timestamped filenames for experiment tracking.

## XI. Operations and Monitoring

Recommended for production:

- Track latency per NLP endpoint.
- Track `4xx/5xx` error rates.
- Monitor RAM/CPU usage during model loading.
- Add a model health dashboard (version, load status, average response time).

### CI/CD Pipeline (GitHub Actions)

This project is configured with a CI/CD workflow at `.github/workflows/ci-cd.yml`.

Container image publishing workflow is available at `.github/workflows/publish-image.yml`.

- CI on `push` and `pull_request`:
  - Run backend tests with `pytest`.
  - Build frontend React app.
- CD on `push` to `main`:
  - Collect backend source + frontend build output.
  - Publish a `delivery-package` artifact in GitHub Actions.
- Image publish on `push` to `main` and git tag `v*`:
  - Push image to GitHub Container Registry (GHCR).
  - Optionally push image to Docker Hub if secrets are configured.

Notes:

- CI disables startup model preload via `PRELOAD_MODELS_ON_STARTUP=False` to keep pipeline deterministic and faster.
- You can download generated artifacts from the successful workflow run page.

Required repository secrets for Docker Hub publish:

- `DOCKERHUB_USERNAME`: your Docker Hub username.
- `DOCKERHUB_TOKEN`: Docker Hub access token.

GHCR publish uses `GITHUB_TOKEN` automatically and does not require extra secrets.

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

### 6. Docker Command Not Recognized on Windows

If you see `docker` or `docker-compose` is not recognized:

1. Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Fully close and reopen PowerShell after installation.
3. Verify installation:

```powershell
docker --version
docker compose version
```

4. If command is still missing, sign out/in Windows or restart your machine to refresh PATH.

## XIII. Documentation and Resources

- Frontend guide: `front-end/README.md`
- Demo video: [YouTube](https://www.youtube.com/watch?v=K1Yqx6mqJoY)
- Backend entrypoint: `src/app.py`
- Test suite: `tests/`

## XIV. Docker Deployment

Docker deployment files included:

- `Dockerfile`: multi-stage build (frontend build + backend runtime).
- `docker-compose.yml`: one-command service startup with persistent SQLite volume.
- `.dockerignore`: optimized context for faster image builds.

### 1. Build and run with Docker Compose

```bash
docker compose up --build -d
```

Access app at `http://localhost:5000`.

Stop service:

```bash
docker compose down
```

Stop and remove DB volume:

```bash
docker compose down -v
```

If your environment still uses legacy Compose v1, `docker-compose` may work, but Docker Desktop (Compose v2) uses `docker compose`.

### 2. Build and run with Docker CLI

```bash
docker build -t vietnamese-text-analyzer:latest .
docker run -d --name vietnamese-text-analyzer -p 5000:5000 vietnamese-text-analyzer:latest
```

### 3. Recommended environment flags

- `PRELOAD_MODELS_ON_STARTUP=False` for faster container startup.
- `DEBUG=False` for production runs.

### 4. Notes for model files

- If local model files are already present in `src/model`, they are copied into the image.
- If some Hugging Face models are remote, first request may download and cache model weights.

## License

This project is distributed under the MIT License (see LICENSE if available in this repository).

## Disclaimer

This system is intended for education, research, and technical reference for Vietnamese NLP.
Model outputs may be inaccurate in some real-world contexts. Always validate results before using them in important decisions.
