// ============================================
// Lazy Loading（遅延読み込み）
// ============================================

/**
 * 画像のLazy Loading初期化
 */
function initLazyLoading() {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                
                if (src) {
                    // プレースホルダーから実際の画像に切り替え
                    img.src = src;
                    img.removeAttribute('data-src');
                    img.classList.add('lazy-loaded');
                }
                
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px' // 画面に入る50px前から読み込み開始
    });
    
    // data-src属性を持つすべての画像を監視
    observeLazyImages(imageObserver);
    
    // 新しく追加される画像も監視
    observeNewImages(imageObserver);
}

/**
 * 既存のLazy画像を監視
 */
function observeLazyImages(observer) {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => observer.observe(img));
}

/**
 * 新しく追加される画像を監視
 */
function observeNewImages(imageObserver) {
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    // 追加されたノード自体が画像の場合
                    if (node.tagName === 'IMG' && node.dataset.src) {
                        imageObserver.observe(node);
                    }
                    
                    // 追加されたノード内の画像を検索
                    const images = node.querySelectorAll?.('img[data-src]');
                    if (images) {
                        images.forEach(img => imageObserver.observe(img));
                    }
                }
            });
        });
    });
    
    // posts-containerを監視
    const container = document.getElementById('posts-container');
    if (container) {
        mutationObserver.observe(container, {
            childList: true,
            subtree: true
        });
    }
}

// ページロード時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
    initLazyLoading();
}

