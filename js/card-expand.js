// ============================================
// カード展開機能
// ============================================

/**
 * カードを展開して詳細表示
 */
function expandCard(postId) {
    const post = allData.posts.find(p => p.id === postId);
    if (!post) return;
    
    // モーダルで詳細表示
    openCardDetailModal(post);
}

/**
 * カード詳細モーダルを開く
 */
function openCardDetailModal(post) {
    // 既存のモーダルを再利用するか、新しく作成
    let modal = document.getElementById('card-detail-modal');
    
    if (!modal) {
        // モーダルを動的に作成
        modal = document.createElement('div');
        modal.id = 'card-detail-modal';
        modal.className = 'card-detail-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('tabindex', '-1');
        modal.onclick = (e) => {
            if (e.target === modal) closeCardDetailModal();
        };
        document.body.appendChild(modal);
    }
    
    // モーダルの内容を設定
    const cardHtml = createCardHtml(post, false);
    modal.innerHTML = `
        <div class="card-detail-content">
            <div class="card-detail-header">
                <h2>投稿詳細</h2>
                <button class="modal-close" onclick="closeCardDetailModal()" aria-label="閉じる" role="button" tabindex="0">&times;</button>
            </div>
            <div class="card-detail-body">
                ${cardHtml}
            </div>
        </div>
    `;
    
    // コンテンツのクリックでモーダルが閉じないようにする
    const content = modal.querySelector('.card-detail-content');
    if (content) {
        content.addEventListener('click', (e) => {
            // 画像以外のクリックではstopPropagation
            if (!e.target.classList.contains('post-image')) {
                e.stopPropagation();
            }
        });
    }
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    
    // コメントをデフォルトで開いた状態にする
    setTimeout(() => {
        const commentsContainer = modal.querySelector(`#comments-${post.id}`);
        if (commentsContainer && !commentsContainer.classList.contains('open')) {
            commentsContainer.classList.add('open');
            commentsContainer.setAttribute('aria-expanded', 'true');
        }
    }, 50);
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
}

/**
 * カード詳細モーダルを閉じる
 */
function closeCardDetailModal() {
    const modal = document.getElementById('card-detail-modal');
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

