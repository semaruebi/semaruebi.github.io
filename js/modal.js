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

function openImageModal(imageUrl) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    if (!modal || !modalImage) return;
    
    modal.style.display = 'block';
    modalImage.src = escapeUrl(imageUrl);
    modalImage.alt = '拡大画像';
    document.body.classList.add('modal-open');
    modal.classList.remove('closing');
    modalImage.classList.remove('closing');
    modal.setAttribute('aria-hidden', 'false');
    
    // フォーカストラップ
    modal.focus();
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

