# Vietnamese NLP 

This project is a web application for processing Vietnamese natural language using various NLP techniques. It provides functionalities such as text preprocessing, part-of-speech tagging, named entity recognition, sentiment analysis, text classification, summarization, statistics

## Features

- **Text Preprocessing**: Normalize, tokenize, and remove stopwords from Vietnamese text.
- **Part-of-Speech Tagging**: Tag words in a sentence with their corresponding parts of speech.
- **Named Entity Recognition**: Identify and classify named entities in text.
- **Sentiment Analysis**: Analyze the sentiment of a given text (positive, negative, neutral).
- **Text Classification**: Classify text into predefined categories.
- **Text Summarization**: Generate concise summaries of longer texts.
- **Statistics**: Provide various statistics about the text, such as word count, sentence length, etc.

## Project Structure

```
vietnamese-nlp
├── src
│   ├── app.py
│   ├── config
│   ├── database
│   ├── modules
│   ├── routes
│   ├── utils
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/anhnguyenvv/vietnamese-text-analyzer.git
   cd vietnamese-nlp-backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables in the `.env` file as needed.

5. download the necessary models and resources.
   ```
   pip install gdown
   gdown --id 1xlc5ggWtrVxOlI4UDnzNyPYsIaNtaDKJ -O src\model\vispam\PhoBERT_vispamReview.pth
   gdown --id 19VDgdzUmbntuN0dwztwAK4BGyodhQjl_ -O src\model\vispam\ViSoBERT_vispamReview.pth
   gdown --id 17uObntzxDg3UwaA98F9GMNwmAzdpGw_Z -O src\model\clf\PhoBERT_topic_classification.pth

   ```
6. **Run the backend server:**
   ```
   python src/app.py
   ```

   The backend will be available at `http://127.0.0.1:5000/`.

## Frontend Installation & Usage

The frontend is built with React (Create React App).

### 1. Development mode

1. Go to the `front-end` directory:
   ```
   cd front-end
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables (optional):
   - Create a `.env` file in `front-end` and add:
     ```
     REACT_APP_API_BASE=http://127.0.0.1:5000
     ```
     *(Replace with your backend address if needed)*

4. Run the frontend in development mode:
   ```
   npm start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

### 2. Production build & deployment with Flask

1. Build the frontend:
   ```
   npm run build
   ```
The production build will be in the [build](front-end/build) folder.


3. Just run the backend as usual:
```
python src/app.py
```

Then access the app at [http://localhost:5000](http://localhost:5000).

## Usage

To run the application, execute the following command:
```
python src/app.py
```

The application will start on `http://127.0.0.1:5000/`.
**Note:**  
- Make sure the backend is running and accessible at the address specified in `REACT_APP_API_BASE` if you use development mode.
- When deploying, only `npm run build` is needed for the frontend; Flask will serve the static files automatically.
- For further deployment instructions, see the frontend's [README](/front-end/README.md).