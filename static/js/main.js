// ==================== State ====================
const state = {
    imageId: null,
    originalWidth: 0,
    originalHeight: 0,
    filename: '',
    cropEnabled: false,
    cropBox: { x: 0, y: 0, w: 0, h: 0 },
    isProcessing: false,
};

// Presets data
const presets = {
    // Kindle
    kindle_paperwhite: { width: 1236, height: 1648 },
    kindle_oasis: { width: 1264, height: 1680 },
    kindle_scribe: { width: 1860, height: 2480 },
    // Kobo
    kobo_clara_hd: { width: 1072, height: 1448 },
    kobo_libra_2: { width: 1264, height: 1680 },
    kobo_sage: { width: 1440, height: 1920 },
    // Boox (文石)
    boox_poke_4: { width: 1072, height: 1448 },
    boox_poke_5: { width: 1072, height: 1448 },
    boox_page: { width: 1264, height: 1680 },
    boox_note_air: { width: 1404, height: 1872 },
    boox_note_air_2: { width: 1404, height: 1872 },
    boox_tab_ultra: { width: 1860, height: 2480 },
    boox_tab_ultra_c: { width: 1860, height: 2480 },
    // 汉王 (Hanvon)
    hanvon_n10: { width: 1404, height: 1872 },
    hanvon_n10_mini: { width: 1448, height: 1072 },
    hanvon_n10_max: { width: 1872, height: 2560 },
    // 掌阅 (iReader)
    ireader_ocean_3: { width: 1264, height: 1680 },
    ireader_c6: { width: 1404, height: 1872 },
    ireader_c7: { width: 1264, height: 1680 },
    ireader_smart_3: { width: 1404, height: 1872 },
    ireader_smart_4: { width: 1404, height: 1872 },
    // 其他
    meebook_p78: { width: 1404, height: 1872 },
    pocketbook_inkpad_4: { width: 1404, height: 1872 },
    // 手机/平板
    iphone_se: { width: 750, height: 1334 },
    iphone_15: { width: 1179, height: 2556 },
    iphone_15_pro_max: { width: 1290, height: 2796 },
    ipad_mini: { width: 1488, height: 2266 },
    ipad_air: { width: 1640, height: 2360 },
};

// ==================== DOM Elements ====================
const $ = (sel) => document.querySelector(sel);

const uploadArea = $('#uploadArea');
const fileInput = $('#fileInput');
const previewArea = $('#previewArea');
const previewImage = $('#previewImage');
const previewInfo = $('#previewInfo');
const previewLoading = $('#previewLoading');
const previewWrapper = $('#previewWrapper');

const devicePreset = $('#devicePreset');
const customSizeRow = $('#customSizeRow');
const customWidth = $('#customWidth');
const customHeight = $('#customHeight');
const resizeMode = $('#resizeMode');

const enableCrop = $('#enableCrop');
const cropControls = $('#cropControls');
const cropOverlay = $('#cropOverlay');
const cropBox = $('#cropBox');
const cropDimensions = $('#cropDimensions');
const cropInfoText = $('#cropInfoText');

const grayscaleMethod = $('#grayscaleMethod');
const contrastSlider = $('#contrast');
const brightnessSlider = $('#brightness');
const sharpnessSlider = $('#sharpness');
const gammaSlider = $('#gamma');
const blurSlider = $('#blur');

const ditherMethod = $('#ditherMethod');
const thresholdGroup = $('#thresholdGroup');
const thresholdSlider = $('#threshold');

const invertColors = $('#invertColors');
const outputFormat = $('#outputFormat');

const btnPreview = $('#btnPreview');
const btnDownload = $('#btnDownload');
const btnResetImage = $('#btnResetImage');
const tabEffect = $('#tabEffect');
const tabOriginal = $('#tabOriginal');

// Current display mode: 'effect' or 'original'
let currentTab = 'effect';

// ==================== Tab Switching ====================
function initTabs() {
    tabEffect.addEventListener('click', () => {
        if (currentTab === 'effect') return;
        currentTab = 'effect';
        tabEffect.classList.add('active');
        tabOriginal.classList.remove('active');
        // Show crop overlay if enabled
        if (state.cropEnabled) {
            cropOverlay.style.display = 'block';
        }
        // Reload effect preview
        if (state.imageId) {
            generatePreview();
        }
    });

    tabOriginal.addEventListener('click', async () => {
        if (currentTab === 'original' || !state.imageId) return;
        currentTab = 'original';
        tabOriginal.classList.add('active');
        tabEffect.classList.remove('active');
        // Hide crop overlay when viewing original
        cropOverlay.style.display = 'none';

        try {
            const url = `/api/original/${state.imageId}`;
            if (previewImage.src.startsWith('blob:')) {
                URL.revokeObjectURL(previewImage.src);
            }
            previewImage.src = url;
        } catch (err) {
            showToast('加载原图失败', 'error');
        }
    });
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

// ==================== Reset Functions ====================
function initResetButtons() {
    document.querySelectorAll('.btn-reset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.reset;
            resetSection(section);
        });
    });
}

function resetSection(section) {
    switch (section) {
        case 'device':
            devicePreset.value = '';
            customSizeRow.style.display = 'none';
            customWidth.value = 1404;
            customHeight.value = 1872;
            resizeMode.value = 'stretch';
            break;
        case 'crop':
            enableCrop.checked = false;
            state.cropEnabled = false;
            cropControls.style.display = 'none';
            cropOverlay.style.display = 'none';
            resetCropBox();
            break;
        case 'grayscale':
            grayscaleMethod.value = 'luminosity';
            break;
        case 'adjustments':
            contrastSlider.value = 1;
            brightnessSlider.value = 1;
            sharpnessSlider.value = 1;
            gammaSlider.value = 1;
            blurSlider.value = 0;
            $('#contrastValue').textContent = '1.0';
            $('#brightnessValue').textContent = '1.0';
            $('#sharpnessValue').textContent = '1.0';
            $('#gammaValue').textContent = '1.0';
            $('#blurValue').textContent = '0';
            break;
        case 'dithering':
            ditherMethod.value = 'none';
            thresholdGroup.style.display = 'none';
            thresholdSlider.value = 128;
            $('#thresholdValue').textContent = '128';
            break;
        case 'other':
            invertColors.checked = false;
            break;
        case 'output':
            outputFormat.value = 'png';
            break;
    }
    showToast('已重置设置');
}

// ==================== File Upload ====================
function initUpload() {
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    btnResetImage.addEventListener('click', resetImage);
}

async function handleFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/webp', 'image/tiff'];
    if (!validTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
        showToast('不支持的文件格式', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast('文件大小超过50MB限制', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    showLoading(true);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        state.imageId = data.image_id;
        state.originalWidth = data.width;
        state.originalHeight = data.height;
        state.filename = data.filename;

        uploadArea.style.display = 'none';
        previewArea.style.display = 'block';

        previewInfo.textContent = `${data.filename} - ${data.width} × ${data.height} px`;

        resetCropBox();
        await generatePreview();

        btnPreview.disabled = false;
        btnDownload.disabled = false;

        showToast('图片上传成功', 'success');
    } catch (err) {
        showToast('上传失败: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetImage() {
    if (state.imageId) {
        fetch('/api/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_id: state.imageId }),
        });
    }

    state.imageId = null;
    state.originalWidth = 0;
    state.originalHeight = 0;
    state.filename = '';

    uploadArea.style.display = 'block';
    previewArea.style.display = 'none';
    btnPreview.disabled = true;
    btnDownload.disabled = true;

    fileInput.value = '';
    enableCrop.checked = false;
    state.cropEnabled = false;
    cropControls.style.display = 'none';
    cropOverlay.style.display = 'none';
}

// ==================== Settings Collection ====================
function getSettings() {
    const settings = {};

    const preset = devicePreset.value;
    if (preset && preset !== 'custom') {
        const p = presets[preset];
        if (p) {
            settings.target_width = p.width;
            settings.target_height = p.height;
        }
    } else if (preset === 'custom') {
        settings.target_width = parseInt(customWidth.value) || 0;
        settings.target_height = parseInt(customHeight.value) || 0;
    } else {
        settings.target_width = 0;
        settings.target_height = 0;
    }

    settings.resize_mode = resizeMode.value;

    if (state.cropEnabled && state.cropBox.w > 0 && state.cropBox.h > 0) {
        settings.crop_box = {
            left: state.cropBox.x,
            top: state.cropBox.y,
            right: state.cropBox.x + state.cropBox.w,
            bottom: state.cropBox.y + state.cropBox.h,
        };
    }

    settings.grayscale_method = grayscaleMethod.value;
    settings.contrast = parseFloat(contrastSlider.value);
    settings.brightness = parseFloat(brightnessSlider.value);
    settings.sharpness = parseFloat(sharpnessSlider.value);
    settings.gamma = parseFloat(gammaSlider.value);
    settings.blur = parseFloat(blurSlider.value);
    settings.dither_method = ditherMethod.value;

    if (ditherMethod.value === 'threshold') {
        settings.threshold = parseInt(thresholdSlider.value);
    }

    settings.invert = invertColors.checked;

    return settings;
}

// ==================== Preview Generation ====================
async function generatePreview() {
    if (!state.imageId || state.isProcessing) return;

    // Switch to effect tab if viewing original
    if (currentTab === 'original') {
        currentTab = 'effect';
        tabEffect.classList.add('active');
        tabOriginal.classList.remove('active');
        if (state.cropEnabled) {
            cropOverlay.style.display = 'block';
        }
    }

    state.isProcessing = true;
    showLoading(true);

    try {
        // When crop is enabled, preview without crop/resize so overlay aligns
        const previewSettings = getSettings();
        if (state.cropEnabled) {
            delete previewSettings.crop_box;
            delete previewSettings.target_width;
            delete previewSettings.target_height;
            delete previewSettings.resize_mode;
        }
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_id: state.imageId,
                settings: previewSettings,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            showToast(errData.error || '预览生成失败', 'error');
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (previewImage.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage.src);
        }

        previewImage.src = url;

        previewImage.onload = () => {
            if (state.cropEnabled) {
                // Recalculate crop layout after preview loads (in case device changed)
                cropLayout = calculateCropFromRatio();
                if (cropLayout) {
                    cropSliderXGroup.style.display = cropLayout.canSlideX ? 'block' : 'none';
                    cropSliderYGroup.style.display = cropLayout.canSlideY ? 'block' : 'none';
                }
                applyCropFromSliders();
            }
        };
    } catch (err) {
        showToast('预览生成失败: ' + err.message, 'error');
    } finally {
        state.isProcessing = false;
        showLoading(false);
    }
}

function showLoading(show) {
    previewLoading.style.display = show ? 'flex' : 'none';
}

// ==================== Download ====================
async function downloadImage() {
    if (!state.imageId) return;

    showLoading(true);

    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_id: state.imageId,
                settings: getSettings(),
                format: outputFormat.value,
            }),
        });

        if (!response.ok) {
            const errData = await response.json();
            showToast(errData.error || '下载失败', 'error');
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            const match = disposition.match(/filename=(.+)/);
            if (match) a.download = match[1];
        }
        if (!a.download) {
            a.download = `inkwallpaper.${outputFormat.value}`;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('下载成功', 'success');
    } catch (err) {
        showToast('下载失败: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== Crop Functionality ====================
const cropSliderX = $('#cropSliderX');
const cropSliderY = $('#cropSliderY');
const cropSliderXGroup = $('#cropSliderXGroup');
const cropSliderYGroup = $('#cropSliderYGroup');
const cropSliderXValue = $('#cropSliderXValue');
const cropSliderYValue = $('#cropSliderYValue');

// Store current crop layout info
let cropLayout = null; // { canSlideX, canSlideY, cropW, cropH, maxX, maxY }

/**
 * Get target device aspect ratio from current settings.
 * Returns {ratio, targetWidth, targetHeight} or null if no device selected.
 */
function getTargetAspectRatio() {
    const preset = devicePreset.value;
    let tw = 0, th = 0;

    if (preset && preset !== 'custom') {
        const p = presets[preset];
        if (p) { tw = p.width; th = p.height; }
    } else if (preset === 'custom') {
        tw = parseInt(customWidth.value) || 0;
        th = parseInt(customHeight.value) || 0;
    }

    if (tw <= 0 || th <= 0) return null;

    return { ratio: tw / th, targetWidth: tw, targetHeight: th };
}

/**
 * Calculate crop dimensions from target aspect ratio.
 * Returns { cropW, cropH, canSlideX, canSlideY, maxX, maxY } or null.
 */
function calculateCropFromRatio() {
    const ar = getTargetAspectRatio();
    if (!ar || state.originalWidth <= 0 || state.originalHeight <= 0) return null;

    const imgW = state.originalWidth;
    const imgH = state.originalHeight;
    const imgRatio = imgW / imgH;

    let cropW, cropH, canSlideX = false, canSlideY = false;

    if (Math.abs(imgRatio - ar.ratio) < 0.01) {
        return { cropW: imgW, cropH: imgH, canSlideX: false, canSlideY: false, maxX: 0, maxY: 0 };
    } else if (imgRatio > ar.ratio) {
        // Image is wider → crop width, full height, slide horizontally
        cropH = imgH;
        cropW = Math.round(imgH * ar.ratio);
        cropW = Math.min(cropW, imgW);
        canSlideX = true;
    } else {
        // Image is taller → crop height, full width, slide vertically
        cropW = imgW;
        cropH = Math.round(imgW / ar.ratio);
        cropH = Math.min(cropH, imgH);
        canSlideY = true;
    }

    const maxX = imgW - cropW;
    const maxY = imgH - cropH;

    return { cropW, cropH, canSlideX, canSlideY, maxX, maxY };
}

function resetCropBox() {
    cropLayout = calculateCropFromRatio();
    
    // Reset sliders to 0 (center)
    cropSliderX.value = 0;
    cropSliderY.value = 0;
    if (cropSliderXValue) cropSliderXValue.textContent = '0';
    if (cropSliderYValue) cropSliderYValue.textContent = '0';

    // Show/hide sliders based on slide direction
    if (cropLayout) {
        cropSliderXGroup.style.display = cropLayout.canSlideX ? 'block' : 'none';
        cropSliderYGroup.style.display = cropLayout.canSlideY ? 'block' : 'none';
    } else {
        cropSliderXGroup.style.display = 'none';
        cropSliderYGroup.style.display = 'none';
    }

    applyCropFromSliders();
    updateCropInfo();
}

/**
 * Convert slider value (0-100) to crop position and update state + overlay.
 */
function applyCropFromSliders() {
    if (!cropLayout) {
        state.cropBox = { x: 0, y: 0, w: state.originalWidth, h: state.originalHeight };
        updateCropOverlay();
        return;
    }

    const { cropW, cropH, canSlideX, canSlideY, maxX, maxY } = cropLayout;
    const sliderX = parseInt(cropSliderX.value) || 0;
    const sliderY = parseInt(cropSliderY.value) || 0;

    let x = 0, y = 0;

    if (canSlideX && maxX > 0) {
        x = Math.round((sliderX / 100) * maxX);
    }
    if (canSlideY && maxY > 0) {
        y = Math.round((sliderY / 100) * maxY);
    }

    state.cropBox = { x, y, w: cropW, h: cropH };
    updateCropOverlay();
}

function updateCropInfo() {
    if (cropInfoText) {
        const ar = getTargetAspectRatio();
        if (ar) {
            cropInfoText.textContent = `裁剪区域：${Math.round(state.cropBox.x)}, ${Math.round(state.cropBox.y)} - ${Math.round(state.cropBox.w)} × ${Math.round(state.cropBox.h)} px`;
        } else {
            cropInfoText.textContent = `裁剪区域：全图（请先选择目标设备以启用比例锁定）`;
        }
    }
}

function getDisplayScale() {
    if (!previewImage.naturalWidth) return { scaleX: 1, scaleY: 1, displayWidth: 1, displayHeight: 1 };
    const displayWidth = previewImage.clientWidth;
    const displayHeight = previewImage.clientHeight;
    return {
        scaleX: displayWidth / state.originalWidth,
        scaleY: displayHeight / state.originalHeight,
        displayWidth,
        displayHeight,
    };
}

function updateCropOverlay() {
    const scale = getDisplayScale();

    const left = state.cropBox.x * scale.scaleX;
    const top = state.cropBox.y * scale.scaleY;
    const width = state.cropBox.w * scale.scaleX;
    const height = state.cropBox.h * scale.scaleY;

    cropBox.style.left = left + 'px';
    cropBox.style.top = top + 'px';
    cropBox.style.width = width + 'px';
    cropBox.style.height = height + 'px';

    const dw = scale.displayWidth;
    const dh = scale.displayHeight;

    $('#cropShadeTop').style.height = Math.max(0, top) + 'px';
    $('#cropShadeBottom').style.height = Math.max(0, dh - top - height) + 'px';
    $('#cropShadeLeft').style.top = top + 'px';
    $('#cropShadeLeft').style.width = Math.max(0, left) + 'px';
    $('#cropShadeLeft').style.height = height + 'px';
    $('#cropShadeRight').style.top = top + 'px';
    $('#cropShadeRight').style.width = Math.max(0, dw - left - width) + 'px';
    $('#cropShadeRight').style.height = height + 'px';

    cropDimensions.textContent = `${Math.round(state.cropBox.w)} × ${Math.round(state.cropBox.h)}`;

    updateCropInfo();
}

function initCrop() {
    enableCrop.addEventListener('change', () => {
        state.cropEnabled = enableCrop.checked;
        cropControls.style.display = state.cropEnabled ? 'block' : 'none';
        cropOverlay.style.display = state.cropEnabled ? 'block' : 'none';
        if (state.cropEnabled) {
            resetCropBox();
            updateCropOverlay();
        }
    });

    // Recalculate crop when device changes
    devicePreset.addEventListener('change', () => {
        if (state.cropEnabled && state.imageId) {
            resetCropBox();
            updateCropOverlay();
        }
    });
    customWidth.addEventListener('change', () => {
        if (state.cropEnabled && state.imageId && devicePreset.value === 'custom') {
            resetCropBox();
            updateCropOverlay();
        }
    });
    customHeight.addEventListener('change', () => {
        if (state.cropEnabled && state.imageId && devicePreset.value === 'custom') {
            resetCropBox();
            updateCropOverlay();
        }
    });

    // Slider event listeners
    cropSliderX.addEventListener('input', () => {
        cropSliderXValue.textContent = cropSliderX.value;
        applyCropFromSliders();
    });
    cropSliderX.addEventListener('change', () => {
        // Trigger preview on release
        if (state.imageId) {
            clearTimeout(previewDebounce);
            previewDebounce = setTimeout(() => { generatePreview(); }, 200);
        }
    });

    cropSliderY.addEventListener('input', () => {
        cropSliderYValue.textContent = cropSliderY.value;
        applyCropFromSliders();
    });
    cropSliderY.addEventListener('change', () => {
        if (state.imageId) {
            clearTimeout(previewDebounce);
            previewDebounce = setTimeout(() => { generatePreview(); }, 200);
        }
    });
}

// ==================== Controls Binding ====================
function initControls() {
    devicePreset.addEventListener('change', () => {
        const val = devicePreset.value;
        customSizeRow.style.display = val === 'custom' ? 'flex' : 'none';
    });

    ditherMethod.addEventListener('change', () => {
        thresholdGroup.style.display = ditherMethod.value === 'threshold' ? 'block' : 'none';
    });

    const sliderConfigs = [
        { slider: contrastSlider, display: '#contrastValue' },
        { slider: brightnessSlider, display: '#brightnessValue' },
        { slider: sharpnessSlider, display: '#sharpnessValue' },
        { slider: gammaSlider, display: '#gammaValue' },
        { slider: blurSlider, display: '#blurValue' },
        { slider: thresholdSlider, display: '#thresholdValue' },
    ];

    sliderConfigs.forEach(({ slider, display }) => {
        slider.addEventListener('input', () => {
            $(display).textContent = slider.value;
        });
    });

    btnPreview.addEventListener('click', generatePreview);
    btnDownload.addEventListener('click', downloadImage);
}

// ==================== Auto-preview on Setting Changes ====================
let previewDebounce = null;

function initAutoPreview() {
    const autoPreviewElements = [
        devicePreset, customWidth, customHeight, resizeMode,
        grayscaleMethod, contrastSlider, brightnessSlider,
        sharpnessSlider, gammaSlider, blurSlider,
        ditherMethod, thresholdSlider, invertColors,
    ];

    autoPreviewElements.forEach((el) => {
        el.addEventListener('change', () => {
            if (!state.imageId) return;
            clearTimeout(previewDebounce);
            previewDebounce = setTimeout(() => {
                generatePreview();
            }, 300);
        });
    });

    const rangeSliders = [contrastSlider, brightnessSlider, sharpnessSlider, gammaSlider, blurSlider, thresholdSlider];
    rangeSliders.forEach((slider) => {
        slider.addEventListener('input', () => {
            if (!state.imageId) return;
            clearTimeout(previewDebounce);
            previewDebounce = setTimeout(() => {
                generatePreview();
            }, 500);
        });
    });
}

// ==================== Window Resize Handler ====================
function initResizeHandler() {
    window.addEventListener('resize', () => {
        if (state.cropEnabled) {
            updateCropOverlay();
        }
    });
}

// ==================== Initialization ====================
function init() {
    initUpload();
    initCrop();
    initControls();
    initAutoPreview();
    initResizeHandler();
    initResetButtons();
    initTabs();
}

document.addEventListener('DOMContentLoaded', init);