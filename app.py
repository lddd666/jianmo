import os
import uuid
import json
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import numpy as np

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload

# In-memory image storage (keyed by image_id)
# This avoids reliance on ephemeral filesystem on Render.com
image_store = {}

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'tiff'}

# E-ink device presets (width x height)
EINK_PRESETS = {
    # Kindle
    "kindle_basic_2022": {"name": "Kindle (2022)", "width": 1072, "height": 1448},
    "kindle_2024": {"name": "Kindle (2024)", "width": 1072, "height": 1448},
    "kindle_paperwhite_2": {"name": "Kindle Paperwhite 2", "width": 758, "height": 1024},
    "kindle_paperwhite_3": {"name": "Kindle Paperwhite 3", "width": 1080, "height": 1440},
    "kindle_paperwhite_4": {"name": "Kindle Paperwhite 4", "width": 1080, "height": 1440},
    "kindle_paperwhite": {"name": "Kindle Paperwhite 5", "width": 1236, "height": 1648},
    "kindle_paperwhite_6": {"name": "Kindle Paperwhite 6", "width": 1264, "height": 1680},
    "kindle_oasis_1": {"name": "Kindle Oasis 1", "width": 1080, "height": 1440},
    "kindle_oasis_2": {"name": "Kindle Oasis 2", "width": 1264, "height": 1680},
    "kindle_oasis": {"name": "Kindle Oasis 3", "width": 1264, "height": 1680},
    "kindle_scribe": {"name": "Kindle Scribe", "width": 1860, "height": 2480},
    # Kobo
    "kobo_nia": {"name": "Kobo Nia", "width": 758, "height": 1024},
    "kobo_clara_hd": {"name": "Kobo Clara HD", "width": 1072, "height": 1448},
    "kobo_clara_2e": {"name": "Kobo Clara 2E", "width": 1072, "height": 1448},
    "kobo_clara_bw": {"name": "Kobo Clara BW", "width": 1072, "height": 1448},
    "kobo_clara_colour": {"name": "Kobo Clara Colour", "width": 1072, "height": 1448},
    "kobo_libra_h2o": {"name": "Kobo Libra H2O", "width": 1264, "height": 1680},
    "kobo_libra_2": {"name": "Kobo Libra 2", "width": 1264, "height": 1680},
    "kobo_libra_colour": {"name": "Kobo Libra Colour", "width": 1264, "height": 1680},
    "kobo_forma": {"name": "Kobo Forma", "width": 1440, "height": 1920},
    "kobo_sage": {"name": "Kobo Sage", "width": 1440, "height": 1920},
    "kobo_elipsa": {"name": "Kobo Elipsa", "width": 1404, "height": 1872},
    "kobo_elipsa_2e": {"name": "Kobo Elipsa 2E", "width": 1404, "height": 1872},
    "kobo_aura": {"name": "Kobo Aura", "width": 758, "height": 1024},
    # Boox (文石)
    "boox_poke_2": {"name": "Boox Poke 2", "width": 1072, "height": 1448},
    "boox_poke_3": {"name": "Boox Poke 3", "width": 1072, "height": 1448},
    "boox_poke_4": {"name": "Boox Poke 4", "width": 1072, "height": 1448},
    "boox_poke_5": {"name": "Boox Poke 5", "width": 1072, "height": 1448},
    "boox_poke_6": {"name": "Boox Poke 6", "width": 1072, "height": 1448},
    "boox_leaf": {"name": "Boox Leaf", "width": 1264, "height": 1680},
    "boox_leaf_2": {"name": "Boox Leaf 2", "width": 1264, "height": 1680},
    "boox_leaf_5_plus": {"name": "Boox Leaf 5+", "width": 1264, "height": 1680},
    "boox_page": {"name": "Boox Page", "width": 1264, "height": 1680},
    "boox_page_2": {"name": "Boox Page 2", "width": 1264, "height": 1680},
    "boox_go": {"name": "Boox Go", "width": 1072, "height": 1448},
    "boox_go_color_7": {"name": "Boox Go Color 7", "width": 1264, "height": 1680},
    "boox_go_10_3": {"name": "Boox Go 10.3", "width": 1404, "height": 1872},
    "boox_nova_3": {"name": "Boox Nova 3", "width": 1404, "height": 1872},
    "boox_nova_air": {"name": "Boox Nova Air", "width": 1404, "height": 1872},
    "boox_nova_air_2": {"name": "Boox Nova Air 2", "width": 1404, "height": 1872},
    "boox_tab_mini_c": {"name": "Boox Tab Mini C", "width": 1404, "height": 1872},
    "boox_note_air": {"name": "Boox Note Air", "width": 1404, "height": 1872},
    "boox_note_air_2": {"name": "Boox Note Air 2", "width": 1404, "height": 1872},
    "boox_note_air_3": {"name": "Boox Note Air 3", "width": 1404, "height": 1872},
    "boox_note_air_3c": {"name": "Boox Note Air 3 C", "width": 1404, "height": 1872},
    "boox_notex": {"name": "Boox Note X", "width": 1404, "height": 1872},
    "boox_tab_ultra": {"name": "Boox Tab Ultra", "width": 1860, "height": 2480},
    "boox_tab_ultra_c": {"name": "Boox Tab Ultra C", "width": 1860, "height": 2480},
    "boox_max_lumi": {"name": "Boox Max Lumi", "width": 1650, "height": 2200},
    "boox_tab_x": {"name": "Boox Tab X", "width": 1650, "height": 2200},
    "boox_p6": {"name": "Boox P6", "width": 824, "height": 1648},
    "boox_p6_pro": {"name": "Boox P6 Pro", "width": 824, "height": 1648},
    "boox_xiaobai_p6": {"name": "文石小白马 P6", "width": 824, "height": 1648},
    "boox_xiaobai_p6_plus": {"name": "文石小白马 P6+", "width": 824, "height": 1648},
    "boox_obook_5": {"name": "OBOOK 5", "width": 720, "height": 1280},
    # 汉王 (Hanvon)
    "hanvon_n10": {"name": "汉王 N10", "width": 1404, "height": 1872},
    "hanvon_n10_plus": {"name": "汉王 N10 Plus", "width": 1404, "height": 1872},
    "hanvon_n10_mini": {"name": "汉王 N10 Mini", "width": 1448, "height": 1072},
    "hanvon_n10_max": {"name": "汉王 N10 Max", "width": 1872, "height": 2560},
    "hanvon_n10_pro": {"name": "汉王 N10 Pro", "width": 1404, "height": 1872},
    "hanvon_n10pro_3": {"name": "汉王 N10Pro 三代", "width": 1404, "height": 1872},
    "hanvon_n10c": {"name": "汉王 N10C", "width": 1404, "height": 1872},
    "hanvon_n10_touch": {"name": "汉王 N10 Touch", "width": 1404, "height": 1872},
    "hanvon_cm": {"name": "汉王 CM", "width": 1072, "height": 1448},
    "hanvon_n518": {"name": "汉王 N518", "width": 600, "height": 800},
    "hanvon_e920": {"name": "汉王 E920", "width": 825, "height": 1200},
    "hanvon_k4": {"name": "汉王 K4", "width": 758, "height": 1024},
    "hanvon_k5": {"name": "汉王 K5", "width": 758, "height": 1024},
    "hanvon_kt": {"name": "汉王 KT", "width": 758, "height": 1024},
    "hanvon_7_jinli": {"name": "汉王 7 锦鲤", "width": 1264, "height": 1680},
    "hanvon_c7t": {"name": "汉王 C7T", "width": 1264, "height": 1680},
    "hanvon_c6t": {"name": "汉王 C6T", "width": 1072, "height": 1448},
    "hanvon_s10": {"name": "汉王 S10", "width": 1404, "height": 1872},
    # 掌阅 (iReader)
    "ireader_a6": {"name": "掌阅 A6", "width": 1072, "height": 1448},
    "ireader_t6": {"name": "掌阅 T6", "width": 1072, "height": 1448},
    "ireader_light_2": {"name": "掌阅 Light 2", "width": 1072, "height": 1448},
    "ireader_light_2_pro": {"name": "掌阅 Light 2 Pro", "width": 1072, "height": 1448},
    "ireader_light_3": {"name": "掌阅 Light 3", "width": 1072, "height": 1448},
    "ireader_ocean_2": {"name": "掌阅 Ocean 2", "width": 1264, "height": 1680},
    "ireader_ocean_3": {"name": "掌阅 Ocean 3", "width": 1264, "height": 1680},
    "ireader_ocean_4_plus": {"name": "掌阅 Ocean 4 Plus", "width": 1404, "height": 1872},
    "ireader_o5p": {"name": "掌阅 O5P", "width": 1264, "height": 1680},
    "ireader_tango": {"name": "掌阅 Tango", "width": 1264, "height": 1680},
    "ireader_neo_3": {"name": "掌阅 Neo 3", "width": 1072, "height": 1448},
    "ireader_c6": {"name": "掌阅 C6", "width": 1404, "height": 1872},
    "ireader_c6_pro": {"name": "掌阅 C6 Pro", "width": 1072, "height": 1448},
    "ireader_c7": {"name": "掌阅 C7", "width": 1264, "height": 1680},
    "ireader_smart_2": {"name": "掌阅 Smart 2", "width": 1404, "height": 1872},
    "ireader_smart_3": {"name": "掌阅 Smart 3", "width": 1404, "height": 1872},
    "ireader_smart_4": {"name": "掌阅 Smart 4", "width": 1404, "height": 1872},
    "ireader_smart_6_pro": {"name": "掌阅 Smart 6 Pro", "width": 1860, "height": 2480},
    "ireader_x3_pro": {"name": "掌阅 X3 Pro", "width": 1404, "height": 1872},
    "ireader_ultra": {"name": "掌阅 Ultra", "width": 1860, "height": 2480},
    # PocketBook
    "pocketbook_basic_lux_2": {"name": "PocketBook Basic Lux 2", "width": 758, "height": 1024},
    "pocketbook_basic_lux_3": {"name": "PocketBook Basic Lux 3", "width": 758, "height": 1024},
    "pocketbook_verse_lite": {"name": "PocketBook Verse Lite", "width": 758, "height": 1024},
    "pocketbook_touch_hd_3": {"name": "PocketBook Touch HD 3", "width": 1072, "height": 1448},
    "pocketbook_verse": {"name": "PocketBook Verse", "width": 1072, "height": 1448},
    "pocketbook_verse_pro": {"name": "PocketBook Verse Pro", "width": 1072, "height": 1448},
    "pocketbook_era": {"name": "PocketBook Era", "width": 1264, "height": 1680},
    "pocketbook_era_pro": {"name": "PocketBook Era Pro", "width": 1264, "height": 1680},
    "pocketbook_inkpad_3": {"name": "PocketBook InkPad 3", "width": 1404, "height": 1872},
    "pocketbook_inkpad_3_pro": {"name": "PocketBook InkPad 3 Pro", "width": 1404, "height": 1872},
    "pocketbook_inkpad_color": {"name": "PocketBook InkPad Color", "width": 1404, "height": 1872},
    "pocketbook_inkpad_color_2": {"name": "PocketBook InkPad Color 2", "width": 1404, "height": 1872},
    "pocketbook_inkpad_4": {"name": "PocketBook InkPad 4", "width": 1404, "height": 1872},
    # Tolino (德国市场)
    "tolino_shine_4": {"name": "Tolino Shine 4", "width": 1072, "height": 1448},
    "tolino_vision_6": {"name": "Tolino Vision 6", "width": 1072, "height": 1448},
    "tolino_epos_3": {"name": "Tolino Epos 3", "width": 1404, "height": 1872},
    # MeeBook
    "meebook_p6": {"name": "MeeBook P6", "width": 1072, "height": 1448},
    "meebook_p78": {"name": "MeeBook P78", "width": 1404, "height": 1872},
    "meebook_p10_pro": {"name": "MeeBook P10 Pro", "width": 1404, "height": 1872},
    "meebook_m8c": {"name": "MeeBook M8C", "width": 1404, "height": 1872},
    # 海信 (Hisense) 墨水屏手机
    "hisense_a5": {"name": "海信 A5", "width": 720, "height": 1520},
    "hisense_a5_pro": {"name": "海信 A5 Pro", "width": 720, "height": 1520},
    "hisense_a7": {"name": "海信 A7", "width": 1080, "height": 2340},
    "hisense_a9": {"name": "海信 A9", "width": 1080, "height": 2340},
    "hisense_hi_reader": {"name": "海信 Hi Reader", "width": 1080, "height": 1920},
    "hisense_touch_lite": {"name": "海信 Touch Lite", "width": 720, "height": 1440},
    # 大我 (Bigme)
    "bigme_b751c": {"name": "大我 B751C", "width": 1404, "height": 1872},
    "bigme_751c": {"name": "大我 751C", "width": 1264, "height": 1680},
    "bigme_hibreak_pro": {"name": "大我 HiBreak Pro", "width": 824, "height": 1648},
    "bigme_b1051c": {"name": "大我 B1051C", "width": 1860, "height": 2480},
    "bigme_galy": {"name": "大我 Galy", "width": 1860, "height": 2480},
    # 墨案 (Moaan)
    "moaan_inkpalm_5": {"name": "墨案 InkPalm 5", "width": 1072, "height": 1448},
    "moaan_x": {"name": "墨案 X", "width": 1404, "height": 1872},
    "moaan_mix_7": {"name": "墨案 Mix 7", "width": 1264, "height": 1680},
    "moaan_note": {"name": "墨案 Note", "width": 1404, "height": 1872},
    # 科大讯飞 (iFlytek)
    "iflytek_t2": {"name": "讯飞 T2", "width": 1404, "height": 1872},
    "iflytek_air": {"name": "讯飞 Air", "width": 1404, "height": 1872},
    "iflytek_fika": {"name": "讯飞 Fika", "width": 1072, "height": 1448},
    # 手机/平板
    "iphone_se": {"name": "iPhone SE", "width": 750, "height": 1334},
    "iphone_15": {"name": "iPhone 15", "width": 1179, "height": 2556},
    "iphone_15_pro_max": {"name": "iPhone 15 Pro Max", "width": 1290, "height": 2796},
    "ipad_mini": {"name": "iPad Mini", "width": 1488, "height": 2266},
    "ipad_air": {"name": "iPad Air", "width": 1640, "height": 2360},
    # 其他小众品牌
    "hanvon_dumo_nana": {"name": "读墨 Nana", "width": 1264, "height": 1680},
    "likebook_mars": {"name": "Likebook Mars", "width": 1404, "height": 1872},
    "remarkable_2": {"name": "reMarkable 2", "width": 1404, "height": 1872},
    "supernote_a5x": {"name": "Supernote A5 X", "width": 1404, "height": 1872},
    "fujitsu_quaderno_a4": {"name": "Fujitsu Quaderno A4", "width": 1650, "height": 2200},
    "durobo_krono": {"name": "Durobo Krono", "width": 1404, "height": 1872},
    "mofei_m4": {"name": "墨非 M4", "width": 480, "height": 800},
    "nook_7": {"name": "Nook 7", "width": 1264, "height": 1680},
    "bambook_sd968": {"name": "盛大锦书 SD968", "width": 600, "height": 800},
    "guowen_xiaofanggao": {"name": "国文小方糕", "width": 720, "height": 1280},
    "yuexingtong_x4": {"name": "阅星瞳 X4", "width": 824, "height": 1648},
    "huawei_matepad_paper": {"name": "华为 MatePad Paper", "width": 1404, "height": 1872},
    "custom": {"name": "自定义尺寸", "width": 0, "height": 0},
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def floyd_steinberg_dithering(image):
    """Floyd-Steinberg dithering algorithm (optimized)"""
    img = np.array(image, dtype=np.float64)
    h, w = img.shape

    # Pre-computed error diffusion fractions
    R = 0.4375    # 7/16 - right
    DL = 0.1875   # 3/16 - down-left
    D = 0.3125    # 5/16 - down
    DR = 0.0625   # 1/16 - down-right

    for y in range(h):
        row = img[y]
        nxt = img[y + 1] if y + 1 < h else None

        for x in range(w):
            old = row[x]
            new = 255.0 if old > 127.5 else 0.0
            row[x] = new
            err = old - new

            if x + 1 < w:
                row[x + 1] += err * R
            if nxt is not None:
                if x > 0:
                    nxt[x - 1] += err * DL
                nxt[x] += err * D
                if x + 1 < w:
                    nxt[x + 1] += err * DR

    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), mode='L')


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
    """Atkinson dithering algorithm (optimized)"""
    img = np.array(image, dtype=np.float64)
    h, w = img.shape

    # Pre-compute fraction
    FRAC = 0.125  # 1/8

    for y in range(h):
        row = img[y]
        nxt1 = img[y + 1] if y + 1 < h else None
        nxt2 = img[y + 2] if y + 2 < h else None

        for x in range(w):
            old = row[x]
            new = 255.0 if old > 127.5 else 0.0
            row[x] = new
            err = (old - new) * FRAC

            # Same row: right, right+1
            if x + 1 < w:
                row[x + 1] += err
            if x + 2 < w:
                row[x + 2] += err

            # Next row: left, center, right
            if nxt1 is not None:
                if x > 0:
                    nxt1[x - 1] += err
                nxt1[x] += err
                if x + 1 < w:
                    nxt1[x + 1] += err

            # Two rows down: center
            if nxt2 is not None:
                nxt2[x] += err

    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), mode='L')


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

    # Apply rotation/flip (before crop, crop coordinates are in rotated space)
    rotation = settings.get('rotation', 0)
    if rotation == 90:
        image = image.transpose(Image.ROTATE_90)
    elif rotation == 180:
        image = image.transpose(Image.ROTATE_180)
    elif rotation == 270:
        image = image.transpose(Image.ROTATE_270)
    if settings.get('flip_h', False):
        image = image.transpose(Image.FLIP_LEFT_RIGHT)
    if settings.get('flip_v', False):
        image = image.transpose(Image.FLIP_TOP_BOTTOM)

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

        # Convert image to bytes for in-memory storage
        buf = BytesIO()
        image.save(buf, format='PNG')
        buf.seek(0)

        # Store in memory (dict) instead of filesystem
        image_store[image_id] = {
            'data': buf.getvalue(),
            'width': image.width,
            'height': image.height,
            'filename': file.filename
        }

        # Limit stored images to prevent memory issues (keep last 50)
        if len(image_store) > 50:
            oldest_keys = list(image_store.keys())[:-50]
            for key in oldest_keys:
                del image_store[key]

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

    # Load original image from memory store
    stored = image_store.get(image_id)
    if not stored:
        return jsonify({'error': '图片未找到，请重新上传'}), 404

    try:
        image = Image.open(BytesIO(stored['data']))
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

    # Load original image from memory store
    stored = image_store.get(image_id)
    if not stored:
        return jsonify({'error': '图片未找到，请重新上传'}), 404

    try:
        image = Image.open(BytesIO(stored['data']))
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
    stored = image_store.get(image_id)
    if not stored:
        return jsonify({'error': '图片未找到'}), 404

    try:
        image = Image.open(BytesIO(stored['data']))

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
    """Clean up uploaded images from memory"""
    data = request.json
    image_id = data.get('image_id')
    if image_id and image_id in image_store:
        del image_store[image_id]
    return jsonify({'success': True})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
