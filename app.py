import os
import uuid
import threading
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
from fpdf import FPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
PDF_FOLDER = os.path.join(BASE_DIR, 'generated_pdfs')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_IMAGES = 10
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
CLEANUP_INTERVAL = 1800  # 30 minutes
FILE_LIFETIME = 3600  # 1 hour

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PDF_FOLDER'] = PDF_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_files():
    while True:
        now = time.time()
        for folder in [UPLOAD_FOLDER, PDF_FOLDER]:
            for fname in os.listdir(folder):
                fpath = os.path.join(folder, fname)
                if os.path.isfile(fpath):
                    if now - os.path.getmtime(fpath) > FILE_LIFETIME:
                        try:
                            os.remove(fpath)
                        except Exception:
                            pass
        time.sleep(CLEANUP_INTERVAL)

threading.Thread(target=cleanup_files, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload-images', methods=['POST'])
def upload_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    files = request.files.getlist('images')
    if len(files) == 0:
        return jsonify({'error': 'No files selected'}), 400
    if len(files) > MAX_IMAGES:
        return jsonify({'error': 'Max 10 images allowed'}), 400
    saved_files = []
    total_size = 0
    for file in files:
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only JPG and PNG allowed'}), 400
        file.seek(0, os.SEEK_END)
        size = file.tell()
        total_size += size
        file.seek(0)
        if total_size > MAX_CONTENT_LENGTH:
            return jsonify({'error': 'Total upload size exceeds 10MB'}), 400
        ext = file.filename.rsplit('.', 1)[1].lower()
        fname = f"{uuid.uuid4().hex}.{ext}"
        path = os.path.join(UPLOAD_FOLDER, fname)
        file.save(path)
        saved_files.append(fname)
    return jsonify({'filenames': saved_files}), 200

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    data = request.json
    image_files = data.get('filenames', [])
    options = data.get('options', {})
    if not image_files or not isinstance(image_files, list):
        return jsonify({'error': 'No images provided'}), 400
    # Validate all files exist
    for fname in image_files:
        if not os.path.exists(os.path.join(UPLOAD_FOLDER, fname)):
            return jsonify({'error': f'File {fname} not found'}), 400
    # PDF options
    page_size = options.get('page_size', 'A4')
    orientation = options.get('orientation', 'Portrait')
    margin = options.get('margin', 'Medium')
    # Page size mapping
    sizes = {
        'A4': (210, 297),
        'Letter': (216, 279),
    }
    if page_size == 'Custom':
        width = int(options.get('custom_width', 210))
        height = int(options.get('custom_height', 297))
        size = (width, height)
    else:
        size = sizes.get(page_size, (210, 297))
    if orientation == 'Landscape':
        size = (size[1], size[0])
    # Margin mapping (in mm)
    margin_map = {
        'None': 0,
        'Small': 5,
        'Medium': 10,
        'Large': 20,
    }
    margin_val = margin_map.get(margin, 10)
    pdf = FPDF(orientation='P' if orientation=='Portrait' else 'L', unit='mm', format=size)
    for fname in image_files:
        img_path = os.path.join(UPLOAD_FOLDER, fname)
        try:
            with Image.open(img_path) as img:
                img_format = img.format
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                temp_img_path = img_path + '_pdf.jpg'
                img.save(temp_img_path, 'JPEG')
        except Exception as e:
            return jsonify({'error': f'Error processing image {fname}: {str(e)}'}), 400
        pdf.add_page()
        pdf.image(temp_img_path, x=margin_val, y=margin_val, w=size[0]-2*margin_val, h=size[1]-2*margin_val)
        # Watermark
        pdf.set_font('Arial', '', 8)
        pdf.set_text_color(180, 180, 180)
        pdf.set_y(size[1] - 8)
        pdf.set_x(0)
        pdf.cell(size[0], 8, 'imagepdfconverter.in', align='C')
        os.remove(temp_img_path)
    pdf_id = uuid.uuid4().hex
    pdf_filename = f'{pdf_id}.pdf'
    pdf_path = os.path.join(PDF_FOLDER, pdf_filename)
    pdf.output(pdf_path)
    return jsonify({'pdf_url': f'/download/{pdf_filename}'}), 200

@app.route('/download/<filename>')
def download_pdf(filename):
    return send_from_directory(PDF_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True) 