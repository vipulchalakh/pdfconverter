# Image to PDF Converter

A full-stack web application to convert images (JPG, PNG) into high-quality PDFs with custom settings.

## Features
- Upload and reorder images
- Choose PDF page size, orientation, and margins
- Add watermark to each page
- Download generated PDF
- Responsive, clean UI

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the app:
   ```bash
   flask run
   ```

## Deployment
- Compatible with Render, Railway, Heroku, or any Flask-compatible server.

## Folder Structure
```
imagepdfconverter/
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── uploads/
├── generated_pdfs/
├── requirements.txt
└── README.md
``` 