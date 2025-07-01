# Vietnamese NLP Backend

This project is a backend system for processing Vietnamese natural language using various NLP techniques. It provides functionalities such as text preprocessing, part-of-speech tagging, named entity recognition, sentiment analysis, text classification, summarization, statistics

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
   git clone <repository-url>
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

## Usage

To run the application, execute the following command:
```
python src/app.py
```

The application will start on `http://127.0.0.1:5000/`.

## API Endpoints

The API provides various endpoints for different functionalities. Refer to the documentation for detailed information on each endpoint.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.