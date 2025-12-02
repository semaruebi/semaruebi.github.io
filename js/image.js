// ============================================
// 画像プレビュー処理
// ============================================

// 選択されたファイルを保持
let selectedImageFiles = [];
// 編集モード用：既存の画像URLを保持
let existingImageUrls = [];
// 投稿処理中フラグ
let isPosting = false;

function handleImagePreview(e) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    const files = Array.from(e.target.files);
    addImageFiles(files);
}

function addImageFiles(files) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    // 既存のファイルと新しいファイルを結合
    const allFiles = [...selectedImageFiles, ...files];
    
    if (allFiles.length > CONFIG.MAX_IMAGES) {
        showToast(`画像は${CONFIG.MAX_IMAGES}枚までなのよ。顔の筋肉を緩めすぎないようにね。`, 'warning');
        return;
    }
    
    // サイズチェック
    for (let file of files) {
        if (file.size > CONFIG.MAX_IMAGE_SIZE) {
            showToast(`${file.name}は2MB以下の画像にしてちょうだい。`, 'error');
            return;
        }
    }
    
    // ファイルを追加
    selectedImageFiles = allFiles;
    updateImagePreview();
    updateImageInput();
}

function removeImageFile(index) {
    selectedImageFiles.splice(index, 1);
    updateImagePreview();
    updateImageInput();
}

/**
 * 画像プレビューアイテムを作成
 */
function createPreviewItem(imageSrc, altText, removeCallback, isExisting = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'preview-img';
    img.alt = altText;
    img.setAttribute('loading', 'lazy');
    
    if (isExisting) {
        img.style.cursor = 'pointer';
        img.onclick = () => {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            if (modal && modalImg) {
                modalImg.src = imageSrc;
                modal.style.display = 'flex';
                modal.setAttribute('aria-hidden', 'false');
                modal.setAttribute('tabindex', '0');
                modal.focus();
            }
        };
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove-btn';
    removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
    removeBtn.setAttribute('aria-label', isExisting ? '既存画像を削除' : '画像を削除');
    removeBtn.onclick = removeCallback;
    
    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    
    if (isExisting) {
        const label = document.createElement('div');
        label.style.fontSize = '0.7em';
        label.style.color = 'var(--comment)';
        label.style.marginTop = '2px';
        label.textContent = '既存';
        wrapper.appendChild(label);
    }
    
    return wrapper;
}

function updateImagePreview() {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    // 既存の画像URLを表示（編集モード用）
    existingImageUrls.forEach((url, index) => {
        if (!url || url.trim() === '') return;
        const item = createPreviewItem(
            url,
            `既存画像 ${index + 1}`,
            () => {
                existingImageUrls.splice(index, 1);
                updateImagePreview();
            },
            true
        );
        preview.appendChild(item);
    });
    
    // 新規選択されたファイルを表示
    selectedImageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = evt => {
            const item = createPreviewItem(
                evt.target.result,
                `プレビュー画像 ${index + 1}`,
                () => removeImageFile(index),
                false
            );
            preview.appendChild(item);
        };
        reader.onerror = () => {
            showToast(`${file.name}の読み込みに失敗しちゃったわ。もう一度試してね`, 'error');
        };
        reader.readAsDataURL(file);
    });
}

function updateImageInput() {
    const input = document.getElementById('input-image');
    if (!input) return;
    
    // DataTransferを使ってファイルリストを更新
    const dataTransfer = new DataTransfer();
    selectedImageFiles.forEach(file => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
}

