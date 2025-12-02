// ============================================
// メイン初期化
// ============================================

// ドラッグアンドドロップ機能
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const postForm = document.getElementById('post-form-container');
    if (!dropZone && !postForm) return;
    
    const targetElement = dropZone || postForm;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        targetElement.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        targetElement.addEventListener(eventName, () => {
            if (dropZone) dropZone.classList.add('drag-over');
            if (postForm) postForm.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        targetElement.addEventListener(eventName, () => {
            if (dropZone) dropZone.classList.remove('drag-over');
            if (postForm) postForm.classList.remove('drag-over');
        }, false);
    });
    
    targetElement.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    
    if (files.length === 0) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        addImageFiles(imageFiles);
    } else {
        showToast('画像ファイルをドロップしてちょうだい。', 'warning');
    }
}

// 初期化
window.onload = function() {
    // テーマ読み込み
    loadTheme();
    
    // データ取得
    fetchData();
    
    // 検索履歴の外側クリックで閉じる
    initSearchHistoryCloseHandler();
    
    // スワイプ検知
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
        sidebar.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, false);
        sidebar.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            checkSwipeDirection();
        }, false);
    }
    
    // 画像プレビュー
    const imageInput = document.getElementById('input-image');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // ドラッグアンドドロップ機能
    setupDragAndDrop();
    
    // 下書き保存機能の初期化
    if (typeof setupAutoSave === 'function') {
        setupAutoSave();
        
        // ページロード時に下書きを復元
        setTimeout(() => {
            if (typeof loadDraft === 'function') {
                loadDraft();
            }
        }, 500);
    }
    
    // 画像クリックイベントのデリゲーション
    setupImageClickHandler();
};

/**
 * 画像クリックハンドラーをセットアップ
 */
function setupImageClickHandler() {
    // bodyにイベントリスナーを追加（動的に追加される要素にも対応）
    document.body.addEventListener('click', (e) => {
        // 画像クリックを検出
        if (!e.target.classList.contains('post-image')) return;
        
        // すぐにイベント伝播を停止
        e.stopPropagation();
        e.preventDefault();
        
        const img = e.target;
        const gallery = img.closest('.image-gallery');
        if (!gallery) return;
        
        const imagesJson = gallery.dataset.images;
        if (!imagesJson) return;
        
        try {
            const images = JSON.parse(decodeURIComponent(imagesJson));
            const index = parseInt(img.dataset.index || '0');
            const clickedUrl = images[index];
            
            if (images.length > 1) {
                openImageModal(clickedUrl, images);
            } else {
                openImageModal(clickedUrl);
            }
        } catch (err) {
            console.error('Image click error:', err);
        }
    }, true); // useCapture = true で確実にキャッチ
}

