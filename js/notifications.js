// ============================================
// 通知バッジ機能
// ============================================

const LAST_VISIT_KEY = 'last-visit-timestamp';

/**
 * 最終訪問時刻を取得
 */
function getLastVisitTimestamp() {
    const timestamp = localStorage.getItem(LAST_VISIT_KEY);
    return timestamp ? parseInt(timestamp) : 0;
}

/**
 * 最終訪問時刻を更新
 */
function updateLastVisitTimestamp() {
    localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

/**
 * 新しいアイテムをカウント
 */
function countNewItems() {
    const lastVisit = getLastVisitTimestamp();
    
    let newPosts = 0;
    let newComments = 0;
    
    // 新しい投稿をカウント
    if (allData.posts) {
        newPosts = allData.posts.filter(post => {
            const postTime = parsePostTimestamp(post.timestamp);
            return postTime > lastVisit;
        }).length;
    }
    
    // 新しいコメントをカウント
    if (allData.comments) {
        newComments = allData.comments.filter(comment => {
            const commentTime = parsePostTimestamp(comment.timestamp);
            return commentTime > lastVisit;
        }).length;
    }
    
    return { newPosts, newComments, total: newPosts + newComments };
}

/**
 * タイムスタンプをパース
 */
function parsePostTimestamp(timestamp) {
    if (!timestamp) return 0;
    
    try {
        // "YYYY/MM/DD HH:MM:SS" 形式
        const parts = timestamp.split(/[\/\s:]/);
        if (parts.length >= 6) {
            const [year, month, day, hour, minute, second] = parts.map(p => parseInt(p));
            return new Date(year, month - 1, day, hour, minute, second).getTime();
        }
        
        // ISO形式やその他の形式
        return new Date(timestamp).getTime();
    } catch (err) {
        console.error('Timestamp parse error:', err);
        return 0;
    }
}

/**
 * 通知バッジを更新
 */
function updateNotificationBadges() {
    const { newPosts, newComments, total } = countNewItems();
    
    // ホームアイコンのバッジ
    updateBadge('home-badge', newPosts);
    
    // コメントバッジ（全投稿の新しいコメント数）
    updateBadge('comments-badge', newComments);
    
    // トータルバッジ（オプション）
    if (total > 0) {
        updateFavicon(total);
    }
}

/**
 * バッジを更新
 */
function updateBadge(badgeId, count) {
    let badge = document.getElementById(badgeId);
    
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.id = badgeId;
            badge.className = 'notification-badge';
            
            // バッジを配置
            if (badgeId === 'home-badge') {
                const homeLink = document.querySelector('[onclick*="showHome"]');
                if (homeLink) {
                    homeLink.style.position = 'relative';
                    homeLink.appendChild(badge);
                }
            }
        }
        
        // 99+表示
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.add('show');
    } else if (badge) {
        badge.classList.remove('show');
    }
}

/**
 * Faviconに通知バッジを追加（オプション）
 */
function updateFavicon(count) {
    // この機能は複雑なので、簡易実装としてドキュメントタイトルに追加
    const originalTitle = 'エリかるて！';
    if (count > 0) {
        document.title = `(${count}) ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

/**
 * バッジをクリア（訪問時）
 */
function clearNotificationBadges() {
    updateLastVisitTimestamp();
    updateNotificationBadges();
}

/**
 * 定期的に通知を更新
 */
function startNotificationPolling() {
    // 初回実行
    updateNotificationBadges();
    
    // 5分ごとに更新
    setInterval(updateNotificationBadges, 5 * 60 * 1000);
}

/**
 * ページ離脱時に最終訪問時刻を更新
 */
window.addEventListener('beforeunload', () => {
    updateLastVisitTimestamp();
});

// 初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        startNotificationPolling();
    });
} else {
    startNotificationPolling();
}

