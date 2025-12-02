// ============================================
// 共有機能
// ============================================

/**
 * 投稿のURLを取得
 */
function getPostUrl(postId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#post-${postId}`;
}

/**
 * URLをクリップボードにコピー
 */
async function copyPostUrl(postId) {
    const url = getPostUrl(postId);
    
    try {
        await navigator.clipboard.writeText(url);
        showToast('URLをコピーしたわよ💉', 'success');
    } catch (err) {
        // クリップボードAPIが使えない場合のフォールバック
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showToast('URLをコピーしたわよ💉', 'success');
        } catch (e) {
            showToast('コピーに失敗しちゃった…', 'error');
        }
        
        document.body.removeChild(textarea);
    }
}

/**
 * Twitterに共有
 */
function shareToTwitter(postId) {
    const post = allData.posts.find(p => p.id === postId);
    if (!post) return;
    
    const url = getPostUrl(postId);
    const text = `${post.title || '精鋭狩りノート'}\n\n${post.region || ''} - ${post.route || ''}\n\n#エリかるて #原神 #精鋭狩り`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

/**
 * Discordに共有（Webhook URL設定済みの場合）
 */
function shareToDiscord(postId) {
    const post = allData.posts.find(p => p.id === postId);
    if (!post) return;
    
    const url = getPostUrl(postId);
    const text = `**${post.title || '精鋭狩りノート'}**\n${post.region || ''} - ${post.route || ''}\n\n${url}`;
    
    // Discord用のテキストをクリップボードにコピー
    copyToClipboard(text);
    showToast('Discord用のテキストをコピーしたわよ💉\nDiscordに貼り付けてちょうだい', 'success');
}

/**
 * 共有メニューを表示
 */
function showShareMenu(postId, buttonElement) {
    // 既存のメニューがあれば閉じる
    closeAllShareMenus();
    
    const menu = document.createElement('div');
    menu.className = 'share-menu';
    menu.id = `share-menu-${postId}`;
    menu.innerHTML = `
        <button class="share-menu-item" onclick="copyPostUrl('${postId}'); event.stopPropagation();">
            <i class="fas fa-link"></i> URLをコピー
        </button>
        <button class="share-menu-item" onclick="shareToTwitter('${postId}'); event.stopPropagation();">
            <i class="fab fa-twitter"></i> Twitterに共有
        </button>
        <button class="share-menu-item" onclick="shareToDiscord('${postId}'); event.stopPropagation();">
            <i class="fab fa-discord"></i> Discord用コピー
        </button>
    `;
    
    // ボタンの位置に表示
    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    
    document.body.appendChild(menu);
    
    // メニュー外をクリックしたら閉じる
    setTimeout(() => {
        document.addEventListener('click', handleShareMenuClose);
    }, 10);
    
    // アニメーション
    setTimeout(() => menu.classList.add('show'), 10);
}

/**
 * 共有メニューを閉じる
 */
function closeAllShareMenus() {
    document.querySelectorAll('.share-menu').forEach(menu => {
        menu.classList.remove('show');
        setTimeout(() => menu.remove(), 200);
    });
    document.removeEventListener('click', handleShareMenuClose);
}

/**
 * 共有メニュー外クリック時のハンドラ
 */
function handleShareMenuClose(e) {
    if (!e.target.closest('.share-menu') && !e.target.closest('.share-btn')) {
        closeAllShareMenus();
    }
}

/**
 * テキストをクリップボードにコピー（汎用）
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

