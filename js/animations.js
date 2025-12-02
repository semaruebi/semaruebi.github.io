// ============================================
// アニメーション機能
// ============================================

/**
 * スクロール時のフェードインアニメーションを初期化
 */
function initScrollAnimations() {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // 少し遅延させて順番にフェードイン
                setTimeout(() => {
                    entry.target.classList.add('fade-in-visible');
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, options);
    
    // 既存のカードにアニメーションを適用
    const cards = document.querySelectorAll('.card:not(.fade-in-visible), .compact-card:not(.fade-in-visible)');
    cards.forEach(card => {
        card.classList.add('fade-in');
        observer.observe(card);
    });
}

/**
 * 新しく追加されたカードにアニメーションを適用
 */
function observeNewCards() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && (node.classList.contains('card') || node.classList.contains('compact-card'))) {
                    node.classList.add('fade-in', 'fade-in-visible');
                }
            });
        });
    });
    
    const container = document.getElementById('posts-container');
    if (container) {
        observer.observe(container, {
            childList: true,
            subtree: false
        });
    }
}

/**
 * カード展開アニメーション
 */
function animateCardExpand(card) {
    card.style.transformOrigin = 'center';
    card.style.animation = 'card-expand 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}

// ページロード時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initScrollAnimations();
        observeNewCards();
    });
} else {
    initScrollAnimations();
    observeNewCards();
}

