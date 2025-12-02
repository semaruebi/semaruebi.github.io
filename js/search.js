// ============================================
// 検索機能
// ============================================

// グローバル変数
let availableTags = new Set();
let eliteTags = new Set(); // 精鋭タグ
let searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]'); // 検索履歴
const MAX_HISTORY = 10; // 最大履歴数

/**
 * Enter キーで検索実行
 */
function handleSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        executeSearch();
    }
}

/**
 * 検索を実行
 */
function executeSearch() {
    const keyword = document.getElementById('search-input')?.value.trim() || '';
    if (keyword) {
        filterBySearch();
    }
}

/**
 * 検索履歴を非表示にする
 */
function hideSearchHistory() {
    const historyBox = document.getElementById('search-history');
    if (historyBox) {
        historyBox.classList.remove('show');
    }
}

/**
 * 検索履歴を表示
 */
function showSearchHistory() {
    const historyBox = document.getElementById('search-history');
    if (!historyBox) return;
    
    historyBox.innerHTML = '';
    
    if (searchHistory.length === 0) {
        historyBox.innerHTML = '<div class="empty-history">まだ検索履歴がないのよ💉</div>';
        historyBox.classList.add('show');
        return;
    }
    
    // ヘッダー
    const header = document.createElement('div');
    header.className = 'history-header';
    header.innerHTML = `
        <h4><i class="fas fa-history"></i> 検索履歴</h4>
        <button class="clear-history-btn" onclick="clearSearchHistory(); event.stopPropagation();" title="全て削除">
            <i class="fas fa-trash"></i> クリア
        </button>
    `;
    historyBox.appendChild(header);
    
    // 履歴項目
    searchHistory.forEach(keyword => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<i class="fas fa-clock"></i> ${escapeHtml(keyword)}`;
        
        div.onclick = () => {
            const input = document.getElementById('search-input');
            if (input) {
                input.value = keyword;
                filterBySearch();
                historyBox.classList.remove('show');
            }
        };
        
        historyBox.appendChild(div);
    });
    
    historyBox.classList.add('show');
}

/**
 * タグ検索モーダルを開く
 */
function openTagSearchModal() {
    const modal = document.getElementById('tag-search-modal');
    const list = document.getElementById('tag-search-list');
    
    if (!modal || !list) return;
    
    // 通常タグと精鋭タグを分離
    const normalTags = Array.from(availableTags).filter(tag => !eliteTags.has(tag)).sort();
    const eliteTagsArray = Array.from(eliteTags).sort();
    
    let html = '';
    
    // 精鋭タグカテゴリ
    if (eliteTagsArray.length > 0) {
        html += `
            <div class="tag-category elite-category">
                <h4 class="tag-category-title"><i class="fas fa-dragon"></i> 精鋭</h4>
                <div class="tag-list elite-tag-list">
        `;
        eliteTagsArray.forEach(tag => {
            const imageUrl = typeof getEliteEnemyImagePath === 'function' ? getEliteEnemyImagePath(tag) : null;
            const tagEscaped = escapeHtml(tag);
            
            if (imageUrl) {
                html += `
                    <div class="tag-search-item elite-tag elite-tag-with-image" data-tag="${tagEscaped}">
                        <img src="${imageUrl}" alt="${tagEscaped}" loading="lazy">
                        <span class="elite-tag-name">${tagEscaped}</span>
                    </div>`;
            } else {
                html += `<div class="tag-search-item elite-tag" data-tag="${tagEscaped}"><i class="fas fa-dragon"></i> ${tagEscaped}</div>`;
            }
        });
        html += '</div></div>';
    }
    
    // 通常タグカテゴリ
    if (normalTags.length > 0) {
        html += `
            <div class="tag-category normal-tag-category">
                <h4 class="tag-category-title"><i class="fas fa-tags"></i> タグ</h4>
                <div class="tag-list normal-tag-list">
        `;
        normalTags.forEach(tag => {
            const tagEscaped = escapeHtml(tag);
            html += `<div class="tag-search-item normal-tag" data-tag="${tagEscaped}">${tagEscaped}</div>`;
        });
        html += '</div></div>';
    }
    
    if (html === '') {
        html = '<p style="text-align:center; padding:40px; color:var(--comment);">まだタグがないのよ💉</p>';
    }
    
    list.innerHTML = html;
    openModal('tag-search-modal');
}

/**
 * タグ検索モーダルを閉じる
 */
function closeTagSearchModal() {
    closeModal('tag-search-modal');
}

/**
 * モーダルからタグで検索
 */
function searchByTagFromModal(tag) {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = tag;
        filterBySearch();
        closeTagSearchModal();
    }
}

/**
 * 検索履歴をクリア
 */
function clearSearchHistory() {
    searchHistory = [];
    localStorage.setItem('search_history', JSON.stringify(searchHistory));
    showSearchHistory();
    showToast('検索履歴をクリアしたわよ💉', 'info');
}

/**
 * 検索履歴に追加
 */
function addToSearchHistory(keyword) {
    if (!keyword || keyword.trim() === '') return;
    
    // 既存の同じキーワードを削除
    searchHistory = searchHistory.filter(k => k !== keyword);
    
    // 先頭に追加
    searchHistory.unshift(keyword);
    
    // 最大数を超えたら古いものを削除
    if (searchHistory.length > MAX_HISTORY) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY);
    }
    
    // localStorage に保存
    localStorage.setItem('search_history', JSON.stringify(searchHistory));
}

function filterBySearch() {
    const keyword = document.getElementById('search-input')?.value.trim() || '';
    const keywordLower = keyword.toLowerCase();
    const titleEl = document.getElementById('current-view-title');
    
    if (!keyword) {
        renderHome();
        return;
    }
    
    // 検索履歴に追加
    addToSearchHistory(keyword);
    
    const container = document.getElementById('main-container');
    if (!container) return;
    
    // タグの部分一致チェック用のヘルパー関数
    const hasPartialTag = (tagsString, searchKeyword) => {
        if (!tagsString || !searchKeyword) return false;
        const tagArray = tagsString.split(',').map(t => t.trim().toLowerCase());
        return tagArray.some(tag => tag.includes(searchKeyword.toLowerCase()));
    };
    
    // 本文検索用のヘルパー関数
    const matchesContent = (post) => {
        return (post.content && post.content.toLowerCase().includes(keywordLower)) ||
               (post.title && post.title.toLowerCase().includes(keywordLower)) ||
               (post.route && post.route.toLowerCase().includes(keywordLower)) ||
               (post.region && post.region.toLowerCase().includes(keywordLower));
    };
    
    // 本文・タイトル・タグ全てを部分一致で検索
    const filtered = allData.posts.filter(p => {
        return matchesContent(p) || (p.tags && hasPartialTag(p.tags, keyword));
    });
    
    // タイトルは固定のまま（エリかるて！）
    if (titleEl) {
        titleEl.innerHTML = `<img src="assets/images/siteparts/elitemanager.png" alt="エリかるて！アイコン" class="site-icon">エリかるて！`;
    }
    
    // 検索結果を投稿フォームの位置に表示
    let html = `
        <div class="search-result-header" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid var(--purple); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-search" style="color: var(--purple); font-size: 1.2em;"></i>
                <h2 style="margin: 0; color: var(--purple); font-size: 1.3em;">検索結果</h2>
            </div>
            <p style="margin: 0; color: var(--comment); font-size: 0.95em;">
                「<span style="color: var(--cyan); font-weight: bold;">${escapeHtml(keyword)}</span>」で検索中 
                <span style="color: var(--green);">（${filtered.length}件）</span>
            </p>
        </div>
    `;
    
    if (filtered.length === 0) {
        html += `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <img src="assets/images/sigewinne/ofuton.webp" alt="リラックス中のシグウィン" style="width: 150px; height: 150px; object-fit: contain; margin: 0 auto 20px; display: block;">
                <p style="font-size: 1.2em; color: var(--cyan); margin-bottom: 10px;">見つからなかったのよ…</p>
                <p style="color: var(--comment);">「${escapeHtml(keyword)}」の検索結果がないわ。別のキーワードで試してみてね💉</p>
            </div>
        `;
    } else {
        filtered.forEach(p => html += createCardHtml(p, true));
    }
    
    container.innerHTML = html;
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
    
    // 検索履歴を閉じる
    const history = document.getElementById('search-history');
    if (history) history.classList.remove('show');
}

function collectAllTags() {
    availableTags.clear();
    eliteTags.clear();
    
    if (allData.posts) {
        allData.posts.forEach(post => {
            if (post.tags) {
                const tags = post.tags.split(',');
                tags.forEach(t => {
                    const trimmed = t.trim();
                    if (trimmed) {
                        availableTags.add(trimmed);
                        
                        // 精鋭タグかどうかを判定（画像があれば精鋭タグ）
                        if (typeof getEliteEnemyImagePath === 'function' && getEliteEnemyImagePath(trimmed)) {
                            eliteTags.add(trimmed);
                        } else if (typeof availableEliteImages !== 'undefined') {
                            // フォールバック
                            const tagLower = trimmed.toLowerCase();
                            const matchedImage = availableEliteImages.find(imageFileName => {
                                const fileNameWithoutExt = imageFileName
                                    .replace(/^アイコン_/, '')
                                    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
                                    .toLowerCase();
                                return fileNameWithoutExt.includes(tagLower) || tagLower.includes(fileNameWithoutExt);
                            });
                            if (matchedImage) {
                                eliteTags.add(trimmed);
                            }
                        }
                    }
                });
            }
        });
    }
}

function searchByTag(tag) {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = tag;
        filterBySearch();
    }
}

/**
 * ドキュメント全体のクリックイベントで検索履歴を閉じる
 */
function initSearchHistoryCloseHandler() {
    document.addEventListener('click', (event) => {
        const searchHistory = document.getElementById('search-history');
        const searchInput = document.getElementById('search-input');
        
        // 検索履歴が表示されていない場合は何もしない
        if (!searchHistory || !searchHistory.classList.contains('show')) {
            return;
        }
        
        // 検索入力をクリックした場合は何もしない
        if (searchInput && searchInput === event.target) {
            return;
        }
        
        // 検索履歴内をクリックした場合は何もしない
        if (searchHistory.contains(event.target)) {
            return;
        }
        
        // それ以外の場所をクリックしたら検索履歴を閉じる
        hideSearchHistory();
    });
}

