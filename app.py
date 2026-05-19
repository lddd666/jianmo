import os
import uuid
import json
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file, session
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import numpy as np

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'tiff'}

# E-ink device presets (width x height)
EINK_PRESETS = {
    # Kindle
    "kindle_paperwhite": {"name": "Kindle Paperwhite", "width": 1236, "height": 1648},
    "kindle_oasis": {"name": "Kindle Oasis", "width": 1264, "height": 1680},
    "kindle_scribe": {"name": "Kindle Scribe", "width": 1860, "height": 2480},
    # Kobo
    "kobo_clara_hd": {"name": "Kobo Clara HD", "width": 1072, "height": 1448},
    "kobo_libra_2": {"name": "Kobo Libra 2", "width": 1264, "height": 1680},
    "kobo_sage": {"name": "Kobo Sage", "width": 1440, "height": 1920},
    # Boox (文石)
    "boox_poke_4": {"name": "Boox Poke 4", "width": 1072, "height": 1448},
    "boox_poke_5": {"name": "Boox Poke 5", "width": 1072, "height": 1448},
    "boox_note_air": {"name": "Boox Note Air", "width": 1404, "height": 1872},
    "boox_note_air_2": {"name": "Boox Note Air 2", "width": 1404, "height": 1872},
    "boox_tab_ultra": {"name": "Boox Tab Ultra", "width": 1860, "height": 2480},
    "boox_tab_ultra_c": {"name": "Boox Tab Ultra C", "width": 1860, "height": 2480},
    "boox_page": {"name": "Boox Page", "width": 1264, "height": 1680},
    # 汉王 (Hanvon)
    "hanvon_n10": {"name": "汉王 N10", "width": 1404, "height": 1872},
    "hanvon_n10_mini": {"name": "汉王 N10 Mini", "width": 1448, "height": 1072},
    "hanvon_n10_max": {"name": "汉王 N10 Max", "width": 1872, "height": 2560},
    # 掌阅 (iReader)
    "ireader_ocean_3": {"name": "掌阅 Ocean 3", "width": 1264, "height": 1680},
    "ireader_c6": {"name": "掌阅 C6", "width": 1404, "height": 1872},
    "ireader_smart_3": {"name": "掌阅 Smart 3", "width": 1404, "height": 1872},
    "ireader_smart_4": {"name": "掌阅 Smart 4", "width": 1404, "height": 1872},
    "ireader_c7": {"name": "掌阅 C7", "width": 1264, "height": 1680},
    # 其他阅读器
    "meebook_p78": {"name": "MeeBook P78", "width": 1404, "height": 1872},
    "pocketbook_inkpad_4": {"name": "PocketBook InkPad 4", "width": 1404, "height": 1872},
    # 手机/平板
    "iphone_se": {"name": "iPhone SE", "width": 750, "height": 1334},
    "iphone_15": {"name": "iPhone 15", "width": 1179, "height": 2556},
    "iphone_15_pro_max": {"name": "iPhone 15 Pro Max", "width": 1290, "height": 2796},
    "ipad_mini": {"name": "iPad Mini", "width": 1488, "height": 2266},
    "ipad_air": {"name": "iPad Air", "width": 1640, "height": 2360},
    "custom": {"name": "自定义尺寸", "width": 0, "height": 0},
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def floyd_steinberg_dithering(image):
    """Floyd-Steinberg dithering algorithm"""
    img_array = np.array(image, dtype=np.float64)
    height, width = img_array.shape

    for y in range(height):
        for x in range(width):
            old_pixel = img_array[y, x]
            new_pixel = 255.0 if old_pixel > 127.5 else 0.0
            img_array[y, x] = new_pixel
            error = old_pixel - new_pixel

            if x + 1 < width:
                img_array[y, x + 1] += error * 7 / 16
            if y + 1 < height:
                if x - 1 >= 0:
                    img_array[y + 1, x - 1] += error * 3 / 16
                img_array[y + 1, x] += error * 5 / 16
                if x + 1 < width:
                    img_array[y + 1, x + 1] += error * 1 / 16

    return Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8), mode='L')


def ordered_dithering(image, matrix_size=4):
    """Ordered (Bayer) dithering algorithm"""
    # Bayer matrices
    bayer_matrices = {
        2: np.array([[0, 2], [3, 1]]) / 4.0,
        4: np.array([
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ]) / 16.0,
        8: None  # Will be generated
    }

    if matrix_size == 8:
        m4 = bayer_matrices[4]
        bayer_matrices[8] = np.block([
            [4 * m4 + 0, 4 * m4 + 2],
            [4 * m4 + 3, 4 * m4 + 1]
        ]) / 64.0

    matrix = bayer_matrices.get(matrix_size, bayer_matrices[4])
    img_array = np.array(image, dtype=np.float64)
    height, width = img_array.shape

    # Tile the matrix to cover the image
    tiled_matrix = np.tile(matrix, (height // matrix.shape[0] + 1, width // matrix.shape[1] + 1))
    tiled_matrix = tiled_matrix[:height, :width]

    # Normalize image to 0-1 range and apply threshold
    normalized = img_array / 255.0
    result = np.where(normalized > tiled_matrix, 255, 0).astype(np.uint8)

    return Image.fromarray(result, mode='L')


def atkinson_dithering(image):
    """Atkinson dithering algorithm"""
    img_array = np.array(image, dtype=np.float64)
    height, width = img_array.shape

    for y in range(height):
        for x in range(width):
            old_pixel = img_array[y, x]
            new_pixel = 255.0 if old_pixel > 127.5 else 0.0
            img_array[y, x] = new_pixel
            error = (old_pixel - new_pixel) / 8.0

            # Atkinson distributes error to 6 neighbors (not 7 like Floyd-Steinberg)
            neighbors = [
                (0, 1), (0, 2),
                (1, -1), (1, 0), (1, 1),
                (2, 0)
            ]

            for dy, dx in neighbors:
                ny, nx = y + dy, x + dx
                if 0 <= ny < height and 0 <= nx < width:
                    img_array[ny, nx] += error

    return Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8), mode='L')


def threshold_dithering(image, threshold=128):
    """Simple threshold dithering"""
    img_array = np.array(image, dtype=np.uint8)
    result = np.where(img_array > threshold, 255, 0).astype(np.uint8)
    return Image.fromarray(result, mode='L')


def process_image(image, settings):
    """Process image with given settings"""
    # Convert to RGB if necessary (handle RGBA, palette, etc.)
    if image.mode in ('RGBA', 'LA', 'PA'):
        # Create white background
        bg = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'RGBA':
            bg.paste(image, mask=image.split()[3])
        else:
            bg.paste(image)
        image = bg
    elif image.mode == 'P':
        image = image.convert('RGB')
    elif image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')

    # Apply crop if specified
    crop_box = settings.get('crop_box')
    if crop_box and ('left' in crop_box and 'top' in crop_box and 'right' in crop_box and 'bottom' in crop_box):
        left = crop_box.get('left', 0)
        top = crop_box.get('top', 0)
        right = crop_box.get('right', image.width)
        bottom = crop_box.get('bottom', image.height)
        # Clamp values
        left = max(0, min(left, image.width))
        top = max(0, min(top, image.height))
        right = max(left, min(right, image.width))
        bottom = max(top, min(bottom, image.height))
        if right > left and bottom > top:
            image = image.crop((left, top, right, bottom))

    # Apply brightness
    brightness = settings.get('brightness', 1.0)
    if brightness != 1.0:
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(brightness)

    # Apply contrast
    contrast = settings.get('contrast', 1.0)
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(contrast)

    # Apply sharpness
    sharpness = settings.get('sharpness', 1.0)
    if sharpness != 1.0:
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(sharpness)

    # Convert to grayscale
    grayscale_method = settings.get('grayscale_method', 'luminosity')
    if grayscale_method == 'luminosity':
        image = ImageOps.grayscale(image)
    elif grayscale_method == 'average':
        img_array = np.array(image, dtype=np.float64)
        gray = np.mean(img_array, axis=2).astype(np.uint8)
        image = Image.fromarray(gray, mode='L')
    elif grayscale_method == 'desaturation':
        img_array = np.array(image, dtype=np.float64)
        gray = ((np.max(img_array, axis=2) + np.min(img_array, axis=2)) / 2).astype(np.uint8)
        image = Image.fromarray(gray, mode='L')
    elif grayscale_method == 'red_channel':
        image = image.split()[0]
    elif grayscale_method == 'green_channel':
        image = image.split()[1]
    elif grayscale_method == 'blue_channel':
        image = image.split()[2]
    else:
        image = ImageOps.grayscale(image)

    # Apply gamma correction
    gamma = settings.get('gamma', 1.0)
    if gamma != 1.0:
        img_array = np.array(image, dtype=np.float64) / 255.0
        img_array = np.power(img_array, 1.0 / gamma)
        img_array = (img_array * 255).clip(0, 255).astype(np.uint8)
        image = Image.fromarray(img_array, mode='L')

    # Apply Gaussian blur (pre-resize)
    blur_radius = settings.get('blur', 0)
    if blur_radius > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # Resize to target dimensions (before dithering for better quality)
    target_width = settings.get('target_width', 0)
    target_height = settings.get('target_height', 0)
    if target_width > 0 and target_height > 0:
        resize_mode = settings.get('resize_mode', 'stretch')
        if resize_mode == 'stretch':
            image = image.resize((target_width, target_height), Image.LANCZOS)
        elif resize_mode == 'fit':
            # Fit within bounds, maintain aspect ratio
            image.thumbnail((target_width, target_height), Image.LANCZOS)
        elif resize_mode == 'fill':
            # Fill and crop to exact size
            img_ratio = image.width / image.height
            target_ratio = target_width / target_height

            if img_ratio > target_ratio:
                # Image is wider, resize by height
                new_height = target_height
                new_width = int(target_height * img_ratio)
            else:
                # Image is taller, resize by width
                new_width = target_width
                new_height = int(target_width / img_ratio)

            image = image.resize((new_width, new_height), Image.LANCZOS)
            # Center crop
            left = (new_width - target_width) // 2
            top = (new_height - target_height) // 2
            image = image.crop((left, top, left + target_width, top + target_height))

    # Apply dithering (AFTER resizing for smoother results)
    dither_method = settings.get('dither_method', 'none')
    if dither_method == 'floyd_steinberg':
        image = floyd_steinberg_dithering(image)
    elif dither_method == 'ordered_4':
        image = ordered_dithering(image, 4)
    elif dither_method == 'ordered_8':
        image = ordered_dithering(image, 8)
    elif dither_method == 'atkinson':
        image = atkinson_dithering(image)
    elif dither_method == 'threshold':
        threshold = settings.get('threshold', 128)
        image = threshold_dithering(image, threshold)
    elif dither_method == 'none':
        # Just grayscale, no dithering - keep as grayscale
        pass

    # Apply inversion
    if settings.get('invert', False):
        image = ImageOps.invert(image)

    return image


@app.route('/')
def index():
    return render_template('index.html', presets=EINK_PRESETS)


@app.route('/api/presets')
def get_presets():
    return jsonify(EINK_PRESETS)


@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式'}), 400

    try:
        image = Image.open(file.stream)
        # Generate unique ID for this image
        image_id = str(uuid.uuid4())

        # Store in session
        if 'images' not in session:
            session['images'] = {}

        # Save original image temporarily
        original_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{image_id}_original.png')
        image.save(original_path, 'PNG')

        session['images'][image_id] = {
            'original_path': original_path,
            'width': image.width,
            'height': image.height,
            'filename': file.filename
        }
        session.modified = True

        return jsonify({
            'success': True,
            'image_id': image_id,
            'width': image.width,
            'height': image.height,
            'filename': file.filename
        })
    except Exception as e:
        return jsonify({'error': f'处理图片时出错: {str(e)}'}), 500


@app.route('/api/preview', methods=['POST'])
def preview_image():
    data = request.json
    image_id = data.get('image_id')

    if not image_id:
        return jsonify({'error': '缺少图片ID'}), 400

    # Load original image
    original_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{image_id}_original.png')
    if not os.path.exists(original_path):
        return jsonify({'error': '图片未找到，请重新上传'}), 404

    try:
        image = Image.open(original_path)
        settings = data.get('settings', {})
        processed = process_image(image, settings)

        # Generate preview (limit size for web display)
        preview = processed.copy()
        max_preview_size = 1200
        if preview.width > max_preview_size or preview.height > max_preview_size:
            preview.thumbnail((max_preview_size, max_preview_size), Image.LANCZOS)

        buf = BytesIO()
        preview.save(buf, format='PNG', optimize=True)
        buf.seek(0)

        return send_file(buf, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': f'处理图片时出错: {str(e)}'}), 500


@app.route('/api/download', methods=['POST'])
def download_image():
    data = request.json
    image_id = data.get('image_id')

    if not image_id:
        return jsonify({'error': '缺少图片ID'}), 400

    original_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{image_id}_original.png')
    if not os.path.exists(original_path):
        return jsonify({'error': '图片未找到，请重新上传'}), 404

    try:
        image = Image.open(original_path)
        settings = data.get('settings', {})
        output_format = data.get('format', 'png').lower()

        processed = process_image(image, settings)

        buf = BytesIO()
        if output_format == 'bmp':
            processed.save(buf, format='BMP')
            mime_type = 'image/bmp'
            ext = 'bmp'
        elif output_format == 'jpg' or output_format == 'jpeg':
            processed.save(buf, format='JPEG', quality=95)
            mime_type = 'image/jpeg'
            ext = 'jpg'
        else:
            processed.save(buf, format='PNG', optimize=True)
            mime_type = 'image/png'
            ext = 'png'

        buf.seek(0)

        filename = f'inkwallpaper_{processed.width}x{processed.height}.{ext}'
        return send_file(buf, mimetype=mime_type, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error': f'处理图片时出错: {str(e)}'}), 500


@app.route('/api/original/<image_id>')
def get_original_image(image_id):
    """Return the original uploaded image without any processing"""
    original_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{image_id}_original.png')
    if not os.path.exists(original_path):
        return jsonify({'error': '图片未找到'}), 404

    try:
        image = Image.open(original_path)

        # Generate preview-size version for web display
        preview = image.copy()
        max_preview_size = 1200
        if preview.width > max_preview_size or preview.height > max_preview_size:
            preview.thumbnail((max_preview_size, max_preview_size), Image.LANCZOS)

        buf = BytesIO()
        preview.save(buf, format='PNG', optimize=True)
        buf.seek(0)

        return send_file(buf, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': f'获取原图出错: {str(e)}'}), 500


@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    """Clean up uploaded files"""
    data = request.json
    image_id = data.get('image_id')
    if image_id:
        original_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{image_id}_original.png')
        if os.path.exists(original_path):
            os.remove(original_path)
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)