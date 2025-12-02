// ============================================
// ブックマーク機能
// ============================================

// グローバル変数
let myBookmarks = JSON.parse(localStorage.getItem('rta_bookmarks') || '[]');

/**
 * ブックマークの追加/削除
 */
function toggleBookmark(postId, buttonElement) {
    if (!postId) return;
    
    const index = myBookmarks.indexOf(postId);
    const isBookmarked = index > -1;
    
    if (isBookmarked) {
        // ブックマーク解除
        myBookmarks.splice(index, 1);
        localStorage.setItem('rta_bookmarks', JSON.stringify(myBookmarks));
        
        if (buttonElement) {
            const icon = buttonElement.querySelector('i');
            if (icon) {
                icon.className = 'far fa-bookmark';
            }
            buttonElement.classList.remove('bookmarked');
            buttonElement.setAttribute('aria-label', 'ブックマークに追加');
            buttonElement.title = 'ブックマークに追加';
        }
        
        showToast('ブックマークを解除したわ💉', 'info');
        
        // ブックマーク一覧画面にいる場合は再レンダリング
        if (currentFilter.region === 'bookmarks') {
            renderBookmarks();
        }
    } else {
        // ブックマーク追加
        myBookmarks.push(postId);
        localStorage.setItem('rta_bookmarks', JSON.stringify(myBookmarks));
        
        if (buttonElement) {
            const icon = buttonElement.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bookmark';
            }
            buttonElement.classList.add('bookmarked');
            buttonElement.setAttribute('aria-label', 'ブックマークを解除');
            buttonElement.title = 'ブックマークを解除';
        }
        
        showToast('ブックマークに追加したわよ💉', 'success');
    }
}

/**
 * ブックマーク一覧を表示
 */
function renderBookmarks() {
    currentFilter = { region: 'bookmarks', route: null };
    const container = document.getElementById('main-container');
    const titleEl = document.getElementById('current-view-title');
    
    if (!container) return;
    if (titleEl) {
        titleEl.innerHTML = '<img src="assets/images/siteparts/elitemanager.png" alt="エリまね！アイコン" class="site-icon">📌 ブックマーク';
    }
    
    // ブックマークした投稿を取得
    const bookmarkedPosts = allData.posts.filter(p => myBookmarks.includes(p.id));
    
    // ソートを適用
    const sorted = sortPosts(bookmarkedPosts);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <img src="assets/images/sigewinne/nnn.webp" alt="シグウィン" style="width: 150px; height: 150px; object-fit: contain; margin: 0 auto 20px; display: block;">
                <p style="font-size: 1.2em; color: var(--cyan); margin-bottom: 10px;">まだブックマークがないのよ！</p>
                <p style="color: var(--comment);">気になる投稿を見つけたら、<i class="far fa-bookmark" style="color:var(--cyan);"></i> マークをクリックして保存してちょうだいね💉</p>
            </div>
        `;
    } else {
        let html = `
            <div class="bookmark-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: var(--bg-sidebar); border-radius: 8px;">
                <div>
                    <h3 style="margin: 0; color: var(--cyan);"><i class="fas fa-bookmark"></i> ブックマーク一覧</h3>
                    <p style="margin: 5px 0 0 0; font-size: 0.9em; color: var(--comment);">${sorted.length}件の投稿を保存してるのよ</p>
                </div>
                <button onclick="exportBookmarks()" class="icon-btn" title="ブックマークをエクスポート" aria-label="ブックマークをエクスポート" style="padding: 10px 15px;">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        `;
        sorted.forEach(p => html += createCardHtml(p, true));
        container.innerHTML = html;
    }
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
    
    // ソートセレクターの表示/非表示を更新
    updateSortSelector();
    
    closeSidebarOnNavigation();
}

/**
 * ブックマークをエクスポート（JSON形式）
 */
function exportBookmarks() {
    if (myBookmarks.length === 0) {
        showToast('エクスポートするブックマークがないわ💉', 'warning');
        return;
    }
    
    const bookmarkedPosts = allData.posts.filter(p => myBookmarks.includes(p.id));
    
    // JSON形式でエクスポート
    const dataStr = JSON.stringify(bookmarkedPosts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('ブックマークをエクスポートしたわよ💉', 'success');
}

/**
 * ブックマークをテキスト形式でエクスポート
 */
function exportBookmarksAsText() {
    if (myBookmarks.length === 0) {
        showToast('エクスポートするブックマークがないわ💉', 'warning');
        return;
    }
    
    const bookmarkedPosts = allData.posts.filter(p => myBookmarks.includes(p.id));
    
    let textContent = '='.repeat(50) + '\n';
    textContent += `ブックマーク一覧 (${bookmarkedPosts.length}件)\n`;
    textContent += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
    textContent += '='.repeat(50) + '\n\n';
    
    bookmarkedPosts.forEach((post, index) => {
        textContent += `[${index + 1}] ${post.title || '無題'}\n`;
        textContent += '-'.repeat(50) + '\n';
        textContent += `地域: ${post.region} | ルート: ${post.route}\n`;
        textContent += `タグ: ${post.tags || 'なし'}\n`;
        textContent += `いいね: ${post.likes || 0} | 投稿日時: ${post.timestamp}\n`;
        textContent += `\n本文:\n${post.content}\n`;
        if (post.imageUrl) {
            textContent += `\n画像: ${post.imageUrl}\n`;
        }
        textContent += '\n' + '='.repeat(50) + '\n\n';
    });
    
    const dataBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('テキスト形式でエクスポートしたわよ💉', 'success');
}

/**
 * 投稿がブックマーク済みかチェック
 */
function isBookmarked(postId) {
    return myBookmarks.includes(postId);
}

