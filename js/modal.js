// ============================================
// モーダル関連
// ============================================

function togglePostForm() {
    const form = document.getElementById('post-form-container');
    if (!form) return;
    form.classList.toggle('closed');
    const isClosed = form.classList.contains('closed');
    form.setAttribute('aria-expanded', !isClosed);
}

function closePostForm() {
    const form = document.getElementById('post-form-container');
    if (!form) return;
    form.classList.add('closed');
    form.setAttribute('aria-expanded', 'false');
}

// ギャラリーの状態管理
let galleryImages = [];
let currentGalleryIndex = 0;

function openImageModal(imageUrl, allImages = null) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    if (!modal || !modalImage) return;
    
    // 初期スタイルをリセット
    modalImage.style.opacity = '1';
    modalImage.style.transform = 'translate(-50%, -50%) scale(1)';
    
    // ギャラリーモード（複数画像）の場合
    if (allImages && Array.isArray(allImages) && allImages.length > 1) {
        galleryImages = allImages.map(url => url.trim());
        // URLの正規化して比較
        const normalizedUrl = imageUrl.trim();
        currentGalleryIndex = galleryImages.findIndex(url => url === normalizedUrl);
        if (currentGalleryIndex === -1) currentGalleryIndex = 0;
        
        modal.style.display = 'block';
        modalImage.src = galleryImages[currentGalleryIndex];
        modalImage.alt = `画像 ${currentGalleryIndex + 1} / ${galleryImages.length}`;
        
        showGalleryControls();
        updateGalleryCounter();
    } else {
        // シングル画像モード
        galleryImages = [];
        currentGalleryIndex = 0;
        
        modal.style.display = 'block';
        modalImage.src = imageUrl;
        modalImage.alt = '拡大画像';
        hideGalleryControls();
    }
    
    document.body.classList.add('modal-open');
    modal.classList.remove('closing');
    modalImage.classList.remove('closing');
    modal.setAttribute('aria-hidden', 'false');
    
    // フォーカストラップ
    modal.focus();
}

function showGalleryImage(index) {
    if (index < 0 || index >= galleryImages.length) return;
    
    currentGalleryIndex = index;
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    if (!modal || !modalImage) return;
    
    modal.style.display = 'block';
    
    // フェードアウトアニメーション
    modalImage.style.opacity = '0';
    modalImage.style.transform = 'translate(-50%, -50%) scale(0.95)';
    
    // 画像を切り替え
    setTimeout(() => {
        modalImage.src = galleryImages[index];
        modalImage.alt = `画像 ${index + 1} / ${galleryImages.length}`;
        
        // フェードインアニメーション
        setTimeout(() => {
            modalImage.style.opacity = '1';
            modalImage.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);
    }, 200);
    
    // カウンターを更新
    updateGalleryCounter();
}

function nextGalleryImage() {
    if (currentGalleryIndex < galleryImages.length - 1) {
        showGalleryImage(currentGalleryIndex + 1);
    }
}

function prevGalleryImage() {
    if (currentGalleryIndex > 0) {
        showGalleryImage(currentGalleryIndex - 1);
    }
}

function showGalleryControls() {
    let prevBtn = document.getElementById('gallery-prev-btn');
    let nextBtn = document.getElementById('gallery-next-btn');
    let counter = document.getElementById('gallery-counter');
    
    const modal = document.getElementById('image-modal');
    if (!modal) return;
    
    // 前へボタン
    if (!prevBtn) {
        prevBtn = document.createElement('button');
        prevBtn.id = 'gallery-prev-btn';
        prevBtn.className = 'gallery-nav-btn gallery-prev-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = (e) => { e.stopPropagation(); prevGalleryImage(); };
        prevBtn.setAttribute('aria-label', '前の画像');
        modal.appendChild(prevBtn);
    }
    
    // 次へボタン
    if (!nextBtn) {
        nextBtn = document.createElement('button');
        nextBtn.id = 'gallery-next-btn';
        nextBtn.className = 'gallery-nav-btn gallery-next-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = (e) => { e.stopPropagation(); nextGalleryImage(); };
        nextBtn.setAttribute('aria-label', '次の画像');
        modal.appendChild(nextBtn);
    }
    
    // カウンター
    if (!counter) {
        counter = document.createElement('div');
        counter.id = 'gallery-counter';
        counter.className = 'gallery-counter';
        modal.appendChild(counter);
    }
    
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
    counter.style.display = 'block';
    
    updateGalleryCounter();
}

function hideGalleryControls() {
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');
    const counter = document.getElementById('gallery-counter');
    
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (counter) counter.style.display = 'none';
}

function updateGalleryCounter() {
    const counter = document.getElementById('gallery-counter');
    if (counter) {
        counter.textContent = `${currentGalleryIndex + 1} / ${galleryImages.length}`;
    }
    
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentGalleryIndex === 0;
        prevBtn.style.opacity = currentGalleryIndex === 0 ? '0.3' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = currentGalleryIndex === galleryImages.length - 1;
        nextBtn.style.opacity = currentGalleryIndex === galleryImages.length - 1 ? '0.3' : '1';
    }
}

// スワイプ対応
let galleryTouchStartX = 0;
let galleryTouchEndX = 0;

function setupGallerySwipe() {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    if (!modal || !modalImage) return;
    
    modalImage.addEventListener('touchstart', (e) => {
        galleryTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    modalImage.addEventListener('touchend', (e) => {
        galleryTouchEndX = e.changedTouches[0].screenX;
        handleGallerySwipe();
    }, { passive: true });
}

function handleGallerySwipe() {
    const swipeThreshold = 50;
    const diff = galleryTouchStartX - galleryTouchEndX;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    if (diff > 0) {
        // 左スワイプ → 次へ
        nextGalleryImage();
    } else {
        // 右スワイプ → 前へ
        prevGalleryImage();
    }
}

// キーボード操作
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('image-modal');
    if (!modal || modal.style.display !== 'block') return;
    
    if (galleryImages.length === 0) return;
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevGalleryImage();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextGalleryImage();
    }
});

// 初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGallerySwipe);
} else {
    setupGallerySwipe();
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    if (!modal || !modalImage) return;
    
    modal.classList.add('closing');
    modalImage.classList.add('closing');
    modal.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        modal.classList.remove('closing');
        modalImage.classList.remove('closing');
        modalImage.src = '';
    }, 300);
}

/**
 * モーダルを開く共通処理
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
    }
}

/**
 * モーダルを閉じる共通処理
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * モーダルの開閉を切り替える共通処理
 */
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const isHidden = modal.getAttribute('aria-hidden') === 'true';
    if (isHidden) {
        openModal(modalId);
    } else {
        closeModal(modalId);
    }
}

function toggleAboutModal() {
    toggleModal('about-modal');
}

function openAboutModal() {
    openModal('about-modal');
}

function closeAboutModal() {
    closeModal('about-modal');
}

function toggleContactForm() {
    toggleModal('contact-modal');
}

function openContactForm() {
    openModal('contact-modal');
}

function closeContactForm() {
    closeModal('contact-modal');
}

function handleRouteImageClick(element) {
    const imageUrl = element.getAttribute('data-image-url');
    const routeName = element.getAttribute('data-route-name');
    const regionName = element.getAttribute('data-region-name');
    const descriptionEncoded = element.getAttribute('data-description');
    const description = descriptionEncoded ? decodeURIComponent(escape(atob(descriptionEncoded))) : '';
    
    openRouteDetailModal(imageUrl, routeName, regionName, description);
}

function openRouteDetailModal(imageUrl, routeName, regionName, description) {
    const modal = document.getElementById('route-detail-modal');
    if (!modal) {
        console.error('Route detail modal not found');
        return;
    }
    
    const modalImage = document.getElementById('route-detail-image');
    const modalTitle = document.getElementById('route-detail-title');
    const modalRegion = document.getElementById('route-detail-region');
    const modalDescription = document.getElementById('route-detail-description');
    
    if (modalImage) modalImage.src = escapeUrl(imageUrl);
    if (modalTitle) modalTitle.textContent = routeName;
    if (modalRegion) modalRegion.textContent = regionName;
    if (modalDescription) {
        if (description) {
            modalDescription.innerHTML = parseMarkdown(description);
        } else {
            modalDescription.innerHTML = '<p>説明がありません。</p>';
        }
    }
    
    openModal('route-detail-modal');
}

function closeRouteDetailModal() {
    closeModal('route-detail-modal');
}

// キーボード操作対応（ESCキー）
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const cardDetailModal = document.getElementById('card-detail-modal');
        if (cardDetailModal && cardDetailModal.style.display === 'flex') {
            closeCardDetailModal();
            return;
        }
        const imageModal = document.getElementById('image-modal');
        if (imageModal && imageModal.style.display === 'block') {
            closeImageModal();
            return;
        }
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal && aboutModal.getAttribute('aria-hidden') === 'false') {
            closeAboutModal();
            return;
        }
        const routeDetailModal = document.getElementById('route-detail-modal');
        if (routeDetailModal && routeDetailModal.getAttribute('aria-hidden') === 'false') {
            closeRouteDetailModal();
            return;
        }
        const contactModal = document.getElementById('contact-modal');
        if (contactModal && contactModal.getAttribute('aria-hidden') === 'false') {
            closeContactForm();
            return;
        }
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            toggleMobileSidebar();
            return;
        }
        if (typeof editingPostId !== 'undefined' && editingPostId) {
            if (typeof cancelEditMode === 'function') {
                cancelEditMode();
            }
        }
    }
});

