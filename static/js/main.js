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

// Local storage key for user presets
const PRESETS_STORAGE_KEY = 'inkwallpaper_presets';

// Built-in presets (cannot be deleted)
const BUILTIN_PRESETS = {
    '📖 Kindle漫画': {
        devicePreset: 'kindle_paperwhite',
        customWidth: '1404',
        customHeight: '1872',
        resizeMode: 'fill',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '1.4',
        brightness: '1.1',
        sharpness: '1.5',
        gamma: '1.2',
        blur: '0',
        ditherMethod: 'floyd_steinberg',
        threshold: '128',
        invertColors: false,
        outputFormat: 'png',
    },
    '📚 电子书封面': {
        devicePreset: 'kindle_paperwhite',
        customWidth: '1404',
        customHeight: '1872',
        resizeMode: 'fill',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '1.3',
        brightness: '1.0',
        sharpness: '2.0',
        gamma: '1.1',
        blur: '0',
        ditherMethod: 'none',
        threshold: '128',
        invertColors: false,
        outputFormat: 'png',
    },
    '🎨 复古艺术风': {
        devicePreset: 'kobo_libra_2',
        customWidth: '1404',
        customHeight: '1872',
        resizeMode: 'fill',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '1.2',
        brightness: '1.0',
        sharpness: '1.0',
        gamma: '1.4',
        blur: '0',
        ditherMethod: 'atkinson',
        threshold: '128',
        invertColors: false,
        outputFormat: 'png',
    },
    '📱 手机壁纸': {
        devicePreset: 'iphone_15',
        customWidth: '1179',
        customHeight: '2556',
        resizeMode: 'fill',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '1.2',
        brightness: '1.0',
        sharpness: '1.5',
        gamma: '1.0',
        blur: '0',
        ditherMethod: 'none',
        threshold: '128',
        invertColors: false,
        outputFormat: 'png',
    },
    '🖼️ 高对比度': {
        devicePreset: '',
        customWidth: '1404',
        customHeight: '1872',
        resizeMode: 'stretch',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '2.0',
        brightness: '1.1',
        sharpness: '2.5',
        gamma: '1.3',
        blur: '0',
        ditherMethod: 'threshold',
        threshold: '128',
        invertColors: false,
        outputFormat: 'png',
    },
    '📄 文字扫描件': {
        devicePreset: '',
        customWidth: '1404',
        customHeight: '1872',
        resizeMode: 'stretch',
        enableCrop: false,
        cropSliderX: '0',
        cropSliderY: '0',
        grayscaleMethod: 'luminosity',
        contrast: '2.5',
        brightness: '1.2',
        sharpness: '3.0',
        gamma: '0.8',
        blur: '0',
        ditherMethod: 'threshold',
        threshold: '150',
        invertColors: false,
        outputFormat: 'png',
    },
};

let presets = {};

const DEVICE_GROUP_RULES = [
    { label: 'Kindle', prefixes: ['kindle_'] },
    { label: 'Kobo', prefixes: ['kobo_'] },
    { label: '文石 (Boox)', prefixes: ['boox_'] },
    { label: '汉王 (Hanvon)', prefixes: ['hanvon_'] },
    { label: '掌阅 (iReader)', prefixes: ['ireader_'] },
    { label: 'PocketBook', prefixes: ['pocketbook_'] },
    { label: 'Tolino', prefixes: ['tolino_'] },
    { label: 'MeeBook', prefixes: ['meebook_'] },
    { label: '海信 (Hisense)', prefixes: ['hisense_'] },
    { label: '大我 (Bigme)', prefixes: ['bigme_'] },
    { label: '墨案 (Moaan)', prefixes: ['moaan_'] },
    { label: '科大讯飞 (iFlytek)', prefixes: ['iflytek_'] },
    { label: '手机/平板', prefixes: ['iphone_', 'ipad_'] },
];

// ==================== DOM Elements ====================
const $ = (sel) => document.querySelector(sel);

const uploadArea = $('#uploadArea');
const fileInput = $('#fileInput');
const previewArea = $('#previewArea');
const previewImage = $('#previewImage');
const previewInfo = $('#previewInfo');
const previewLoading = $('#previewLoading');
const previewWrapper = $('#previewWrapper');

const presetSelect = $('#presetSelect');
const btnLoadPreset = $('#btnLoadPreset');
const btnDeletePreset = $('#btnDeletePreset');
const btnSavePreset = $('#btnSavePreset');
const presetName = $('#presetName');

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

// Transform buttons
const btnRotateLeft = $('#btnRotateLeft');
const btnRotate180 = $('#btnRotate180');
const btnRotateRight = $('#btnRotateRight');
const btnFlipH = $('#btnFlipH');
const btnFlipV = $('#btnFlipV');

const btnPreview = $('#btnPreview');
const btnDownload = $('#btnDownload');
const btnResetImage = $('#btnResetImage');
const tabCompare = $('#tabCompare');
const btnStartCreate = $('#btnStartCreate');
const tabEffect = $('#tabEffect');
const compareViewer = $('#compareViewer');
const compareOriginalImage = $('#compareOriginalImage');
const compareEffectImage = $('#compareEffectImage');
const compareEffectLayer = $('#compareEffectLayer');
const compareSlider = $('#compareSlider');
const tabOriginal = $('#tabOriginal');
const shareCard = $('#shareCard');

// ==================== Device Presets ====================
function getDeviceGroupKey(presetKey) {
    const matched = DEVICE_GROUP_RULES.find(group => group.prefixes.some(prefix => presetKey.startsWith(prefix)));
    return matched ? matched.label : '其他小众品牌';
}

function hydratePresetsFromCurrentOptions() {
    devicePreset.querySelectorAll('option[value]:not([value=""]):not([value="custom"])').forEach(option => {
        const match = option.textContent.match(/\((\d+)×(\d+)\)/);
        if (match) {
            presets[option.value] = {
                width: Number(match[1]),
                height: Number(match[2]),
            };
        }
    });
}

function renderDevicePresetOptions(serverPresets) {
    const selectedValue = devicePreset.value;
    const groups = new Map();
    presets = {};

    Object.entries(serverPresets).forEach(([key, preset]) => {
        if (key === 'custom') return;
        presets[key] = { width: preset.width, height: preset.height };
        const groupKey = getDeviceGroupKey(key);
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push({ key, ...preset });
    });

    devicePreset.innerHTML = '<option value="">-- 选择设备预设 --</option>';

    DEVICE_GROUP_RULES.map(group => group.label).concat('其他小众品牌').forEach(label => {
        const items = groups.get(label);
        if (!items || items.length === 0) return;

        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.key;
            option.textContent = `${item.name} (${item.width}×${item.height})`;
            optgroup.appendChild(option);
        });
        devicePreset.appendChild(optgroup);
    });

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = serverPresets.custom?.name || '自定义尺寸';
    devicePreset.appendChild(customOption);

    if (selectedValue && devicePreset.querySelector(`option[value="${CSS.escape(selectedValue)}"]`)) {
        devicePreset.value = selectedValue;
    }
}

async function loadDevicePresets() {
    hydratePresetsFromCurrentOptions();

    try {
        const response = await fetch('/api/presets');
        if (!response.ok) throw new Error('presets request failed');
        const serverPresets = await response.json();
        renderDevicePresetOptions(serverPresets);
    } catch (err) {
        showToast('设备列表加载失败，已使用本地预设', 'error');
    }
}

// Current display mode: 'compare', 'effect', or 'original'
let currentTab = 'compare';
let previewObjectUrl = null;
let previewAbortController = null;
let previewRequestSeq = 0;

// Transform state (accumulated)
let transformState = {
    rotation: 0,  // 0, 90, 180, 270
    flipH: false,
    flipV: false
};

// ==================== Tab Switching ====================
function setActiveTab(tab) {
    currentTab = tab;
    tabCompare.classList.toggle('active', tab === 'compare');
    tabEffect.classList.toggle('active', tab === 'effect');
    tabOriginal.classList.toggle('active', tab === 'original');
}

function updateComparePosition() {
    if (!compareViewer || !compareSlider) return;
    compareViewer.style.setProperty('--compare-position', `${compareSlider.value}%`);
}

function updatePreviewDisplay() {
    const showCompare = currentTab === 'compare' && !state.cropEnabled && compareEffectImage.src && compareOriginalImage.src;
    compareViewer.style.display = showCompare ? 'block' : 'none';
    previewImage.style.display = showCompare ? 'none' : 'block';
    cropOverlay.style.display = state.cropEnabled && currentTab !== 'original' && !showCompare ? 'block' : 'none';
}

function setPreviewObjectUrl(url) {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
    }
    previewObjectUrl = url;
    previewImage.src = url;
    compareEffectImage.src = url;
}

function initTabs() {
    tabCompare.addEventListener('click', () => {
        if (currentTab === 'compare') return;
        setActiveTab('compare');
        if (state.imageId) {
            if (state.cropEnabled) {
                showToast('裁剪模式下暂不显示对比滑块，已显示效果图', 'info');
                setActiveTab('effect');
            }
            generatePreview();
        }
        updatePreviewDisplay();
    });

    tabEffect.addEventListener('click', () => {
        if (currentTab === 'effect') return;
        setActiveTab('effect');
        if (state.imageId) {
            generatePreview();
        }
        updatePreviewDisplay();
    });

    tabOriginal.addEventListener('click', async () => {
        if (currentTab === 'original' || !state.imageId) return;
        setActiveTab('original');

        try {
            const url = `/api/original/${state.imageId}`;
            previewImage.src = url;
            updatePreviewDisplay();
        } catch (err) {
            showToast('加载原图失败', 'error');
        }
    });

    compareSlider.addEventListener('input', updateComparePosition);
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

// ==================== Preset Management ====================
function loadPresetsFromStorage() {
    try {
        const data = localStorage.getItem(PRESETS_STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function savePresetsToStorage(presets) {
    try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
        showToast('保存预设失败：存储空间不足', 'error');
    }
}

function refreshPresetList() {
    const userPresets = loadPresetsFromStorage();
    const userNames = Object.keys(userPresets);
    const builtinNames = Object.keys(BUILTIN_PRESETS);

    // Clear existing options
    presetSelect.innerHTML = '<option value="">-- 选择预设方案 --</option>';

    // Add built-in presets group
    if (builtinNames.length > 0) {
        const builtinGroup = document.createElement('optgroup');
        builtinGroup.label = '内置预设';
        builtinNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            opt.dataset.builtin = 'true';
            builtinGroup.appendChild(opt);
        });
        presetSelect.appendChild(builtinGroup);
    }

    // Add user presets group
    if (userNames.length > 0) {
        const userGroup = document.createElement('optgroup');
        userGroup.label = '我的预设';
        userNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            userGroup.appendChild(opt);
        });
        presetSelect.appendChild(userGroup);
    }

    btnLoadPreset.disabled = true;
    btnDeletePreset.disabled = true;
    btnDeletePreset.style.display = 'none';
}

function getCurrentSettings() {
    return {
        rotation: transformState.rotation,
        flipH: transformState.flipH,
        flipV: transformState.flipV,
        devicePreset: devicePreset.value,
        customWidth: customWidth.value,
        customHeight: customHeight.value,
        resizeMode: resizeMode.value,
        enableCrop: enableCrop.checked,
        cropSliderX: cropSliderX.value,
        cropSliderY: cropSliderY.value,
        grayscaleMethod: grayscaleMethod.value,
        contrast: contrastSlider.value,
        brightness: brightnessSlider.value,
        sharpness: sharpnessSlider.value,
        gamma: gammaSlider.value,
        blur: blurSlider.value,
        ditherMethod: ditherMethod.value,
        threshold: thresholdSlider.value,
        invertColors: invertColors.checked,
        outputFormat: outputFormat.value,
    };
}

function applySettingsToControls(settings) {
    // Transform
    if (settings.rotation !== undefined) transformState.rotation = settings.rotation;
    if (settings.flipH !== undefined) transformState.flipH = settings.flipH;
    if (settings.flipV !== undefined) transformState.flipV = settings.flipV;
    updateTransformButtons();

    // Device preset
    if (settings.devicePreset !== undefined) {
        devicePreset.value = settings.devicePreset;
        customSizeRow.style.display = settings.devicePreset === 'custom' ? 'flex' : 'none';
    }
    if (settings.customWidth !== undefined) customWidth.value = settings.customWidth;
    if (settings.customHeight !== undefined) customHeight.value = settings.customHeight;
    if (settings.resizeMode !== undefined) resizeMode.value = settings.resizeMode;

    // Crop
    if (settings.enableCrop !== undefined) {
        enableCrop.checked = settings.enableCrop;
        state.cropEnabled = settings.enableCrop;
        cropControls.style.display = settings.enableCrop ? 'block' : 'none';
        cropOverlay.style.display = settings.enableCrop ? 'block' : 'none';
    }

    // Grayscale
    if (settings.grayscaleMethod !== undefined) grayscaleMethod.value = settings.grayscaleMethod;

    // Adjustments
    if (settings.contrast !== undefined) {
        contrastSlider.value = settings.contrast;
        $('#contrastValue').textContent = settings.contrast;
    }
    if (settings.brightness !== undefined) {
        brightnessSlider.value = settings.brightness;
        $('#brightnessValue').textContent = settings.brightness;
    }
    if (settings.sharpness !== undefined) {
        sharpnessSlider.value = settings.sharpness;
        $('#sharpnessValue').textContent = settings.sharpness;
    }
    if (settings.gamma !== undefined) {
        gammaSlider.value = settings.gamma;
        $('#gammaValue').textContent = settings.gamma;
    }
    if (settings.blur !== undefined) {
        blurSlider.value = settings.blur;
        $('#blurValue').textContent = settings.blur;
    }

    // Dithering
    if (settings.ditherMethod !== undefined) {
        ditherMethod.value = settings.ditherMethod;
        thresholdGroup.style.display = settings.ditherMethod === 'threshold' ? 'block' : 'none';
    }
    if (settings.threshold !== undefined) {
        thresholdSlider.value = settings.threshold;
        $('#thresholdValue').textContent = settings.threshold;
    }

    // Invert
    if (settings.invertColors !== undefined) invertColors.checked = settings.invertColors;

    // Output format
    if (settings.outputFormat !== undefined) outputFormat.value = settings.outputFormat;

    // Reset crop box after applying settings (this recalculates from new device ratio)
    if (state.cropEnabled && state.imageId) {
        resetCropBox();
        updateCropOverlay();
        // Apply crop slider values after resetCropBox
        if (settings.cropSliderX !== undefined) {
            cropSliderX.value = settings.cropSliderX;
            cropSliderXValue.textContent = settings.cropSliderX;
        }
        if (settings.cropSliderY !== undefined) {
            cropSliderY.value = settings.cropSliderY;
            cropSliderYValue.textContent = settings.cropSliderY;
        }
        applyCropFromSliders();
    }
}

function initPresetSystem() {
    refreshPresetList();

    // Enable/disable load/delete buttons when selection changes
    presetSelect.addEventListener('change', () => {
        const hasSelection = presetSelect.value !== '';
        btnLoadPreset.disabled = !hasSelection;
        
        // Check if selected preset is built-in
        const selectedOption = presetSelect.options[presetSelect.selectedIndex];
        const isBuiltin = selectedOption && selectedOption.dataset.builtin === 'true';
        btnDeletePreset.disabled = !hasSelection || isBuiltin;
        btnDeletePreset.style.display = isBuiltin ? 'none' : '';
    });

    // Save preset
    btnSavePreset.addEventListener('click', () => {
        const name = presetName.value.trim();
        if (!name) {
            showToast('请输入预设名称', 'error');
            presetName.focus();
            return;
        }

        const presets = loadPresetsFromStorage();
        const isOverwrite = presets.hasOwnProperty(name);

        if (isOverwrite) {
            if (!confirm(`预设 "${name}" 已存在，是否覆盖？`)) return;
        }

        presets[name] = getCurrentSettings();
        savePresetsToStorage(presets);
        refreshPresetList();

        // Select the newly saved preset
        presetSelect.value = name;
        btnLoadPreset.disabled = false;
        btnDeletePreset.disabled = false;

        presetName.value = '';
        showToast(isOverwrite ? `预设 "${name}" 已更新` : `预设 "${name}" 已保存`, 'success');
    });

    // Allow saving with Enter key
    presetName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSavePreset.click();
        }
    });

    // Load preset (supports both built-in and user presets)
    btnLoadPreset.addEventListener('click', () => {
        const name = presetSelect.value;
        if (!name) return;

        // Check built-in presets first, then user presets
        let settings = BUILTIN_PRESETS[name];
        if (!settings) {
            const userPresets = loadPresetsFromStorage();
            settings = userPresets[name];
        }

        if (!settings) {
            showToast('预设未找到', 'error');
            return;
        }

        applySettingsToControls(settings);
        showToast(`已加载预设 "${name}"`, 'success');

        // Trigger preview if image is loaded
        if (state.imageId) {
            setTimeout(() => generatePreview(), 300);
        }
    });

    // Delete preset (only user presets can be deleted)
    btnDeletePreset.addEventListener('click', () => {
        const name = presetSelect.value;
        if (!name || BUILTIN_PRESETS[name]) return;

        if (!confirm(`确定要删除预设 "${name}" 吗？`)) return;

        const presets = loadPresetsFromStorage();
        delete presets[name];
        savePresetsToStorage(presets);
        refreshPresetList();

        showToast(`预设 "${name}" 已删除`, 'success');
    });
}

function initLandingExperience() {
    if (btnStartCreate) {
        btnStartCreate.addEventListener('click', () => {
            const workspace = $('#workspace');
            if (workspace) {
                workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setTimeout(() => fileInput.focus(), 450);
        });
    }

    document.querySelectorAll('.example-card[data-preset]').forEach(card => {
        card.addEventListener('click', () => {
            const presetKey = card.dataset.preset;
            const settings = BUILTIN_PRESETS[presetKey];
            if (!settings) return;

            applySettingsToControls(settings);
            presetSelect.value = presetKey;
            btnLoadPreset.disabled = false;
            btnDeletePreset.disabled = true;
            btnDeletePreset.style.display = 'none';

            showToast(state.imageId ? `已应用「${presetKey}」风格` : `已选择「${presetKey}」，上传图片即可生成类似效果`, 'success');
            if (state.imageId) {
                setTimeout(() => generatePreview(), 200);
            } else {
                const workspace = $('#workspace');
                if (workspace) workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
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
        case 'preset':
            presetSelect.value = '';
            presetName.value = '';
            btnLoadPreset.disabled = true;
            btnDeletePreset.disabled = true;
            break;
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
            transformState = { rotation: 0, flipH: false, flipV: false };
            updateTransformButtons();
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

    if (file.size > 10 * 1024 * 1024) {
        showToast('文件大小超过10MB限制', 'error');
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
        if (shareCard) shareCard.style.display = 'block';

        showToast('图片上传成功', 'success');
    } catch (err) {
        showToast('上传失败: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetImage() {
    if (previewAbortController) {
        previewAbortController.abort();
        previewAbortController = null;
    }
    previewRequestSeq++;
    state.isProcessing = false;

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
    compareViewer.style.display = 'none';
    if (shareCard) shareCard.style.display = 'none';
    compareOriginalImage.removeAttribute('src');
    compareEffectImage.removeAttribute('src');
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
    }
}

// ==================== Settings Collection ====================
function getSettings() {
    const settings = {};

    // Transform
    if (transformState.rotation !== 0) settings.rotation = transformState.rotation;
    if (transformState.flipH) settings.flip_h = true;
    if (transformState.flipV) settings.flip_v = true;

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
    if (!state.imageId) return;

    if (previewAbortController) {
        previewAbortController.abort();
    }

    const requestSeq = ++previewRequestSeq;
    previewAbortController = new AbortController();

    if (currentTab === 'original') {
        setActiveTab('effect');
    }
    if (currentTab === 'compare' && state.cropEnabled) {
        setActiveTab('effect');
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
            signal: previewAbortController.signal,
        });

        if (requestSeq !== previewRequestSeq) return;

        if (!response.ok) {
            const errData = await response.json();
            showToast(errData.error || '预览生成失败', 'error');
            return;
        }

        const blob = await response.blob();
        if (requestSeq !== previewRequestSeq) return;

        const url = URL.createObjectURL(blob);

        setPreviewObjectUrl(url);
        compareOriginalImage.src = `/api/original/${state.imageId}`;
        updateComparePosition();
        updatePreviewDisplay();

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
            updatePreviewDisplay();
        };
    } catch (err) {
        if (err.name === 'AbortError') return;
        showToast('预览生成失败: ' + err.message, 'error');
    } finally {
        if (requestSeq === previewRequestSeq) {
            state.isProcessing = false;
            previewAbortController = null;
            showLoading(false);
        }
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

        showToast('下载成功，适合直接拿去小红书晒图', 'success');
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

    const imgW = getEffectiveWidth();
    const imgH = getEffectiveHeight();
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
        state.cropBox = { x: 0, y: 0, w: getEffectiveWidth(), h: getEffectiveHeight() };
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

function getEffectiveWidth() {
    const rot = transformState.rotation;
    return (rot === 90 || rot === 270) ? state.originalHeight : state.originalWidth;
}

function getEffectiveHeight() {
    const rot = transformState.rotation;
    return (rot === 90 || rot === 270) ? state.originalWidth : state.originalHeight;
}

function getDisplayScale() {
    if (!previewImage.naturalWidth) return { scaleX: 1, scaleY: 1, displayWidth: 1, displayHeight: 1 };
    const displayWidth = previewImage.clientWidth;
    const displayHeight = previewImage.clientHeight;
    const imgW = getEffectiveWidth();
    const imgH = getEffectiveHeight();
    return {
        scaleX: displayWidth / imgW,
        scaleY: displayHeight / imgH,
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
        if (state.cropEnabled && currentTab === 'compare') {
            setActiveTab('effect');
            showToast('裁剪模式下暂不显示对比滑块，已切换到效果图', 'info');
        }
        if (state.cropEnabled) {
            resetCropBox();
            updateCropOverlay();
        }
        updatePreviewDisplay();
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

// ==================== Transform Controls ====================
function updateTransformButtons() {
    btnFlipH.classList.toggle('active', transformState.flipH);
    btnFlipV.classList.toggle('active', transformState.flipV);
}

function applyTransform(type) {
    if (!state.imageId) return;
    switch(type) {
        case 'rotate_left': transformState.rotation = (transformState.rotation - 90 + 360) % 360; break;
        case 'rotate_right': transformState.rotation = (transformState.rotation + 90) % 360; break;
        case 'rotate_180': transformState.rotation = (transformState.rotation + 180) % 360; break;
        case 'flip_h': transformState.flipH = !transformState.flipH; break;
        case 'flip_v': transformState.flipV = !transformState.flipV; break;
    }
    updateTransformButtons();
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(() => { generatePreview(); }, 200);
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

    // Transform button events
    btnRotateLeft.addEventListener('click', () => applyTransform('rotate_left'));
    btnRotate180.addEventListener('click', () => applyTransform('rotate_180'));
    btnRotateRight.addEventListener('click', () => applyTransform('rotate_right'));
    btnFlipH.addEventListener('click', () => applyTransform('flip_h'));
    btnFlipV.addEventListener('click', () => applyTransform('flip_v'));
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

// ==================== Accordion (Collapsible Sections) ====================
function initAccordion() {
    document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking a button inside the header
            if (e.target.closest('.btn-reset')) return;

            const section = header.closest('.control-section');
            if (!section) return;

            const isCollapsed = section.classList.contains('collapsed');
            const icon = header.querySelector('.collapse-icon');

            if (isCollapsed) {
                // Expand
                section.classList.remove('collapsed');
                if (icon) icon.textContent = '▼';
            } else {
                // Collapse
                section.classList.add('collapsed');
                if (icon) icon.textContent = '▶';
            }
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
async function init() {
    await loadDevicePresets();
    initUpload();
    initCrop();
    initControls();
    initAutoPreview();
    initResizeHandler();
    initResetButtons();
    initTabs();
    initPresetSystem();
    initLandingExperience();
    initAccordion();
}

document.addEventListener('DOMContentLoaded', init);