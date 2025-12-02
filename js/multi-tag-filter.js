// ============================================
// 複数タグフィルタ機能
// ============================================

let selectedFilterTags = [];
let filterMode = 'OR'; // 'AND' または 'OR'

/**
 * タグ検索モーダルを拡張（複数選択対応）
 */
function enhanceTagSearchModal() {
    // 既存のopenTagSearchModalをオーバーライド
    const originalOpenTagSearchModal = window.openTagSearchModal;
    
    window.openTagSearchModal = function() {
        originalOpenTagSearchModal();
        
        // モーダルコンテンツを取得
        const modalContent = document.querySelector('.tag-search-modal-content');
        const modalBody = document.getElementById('tag-search-list');
        if (!modalContent || !modalBody) return;
        
        // 既に追加済みの場合は、選択状態だけ更新
        if (document.getElementById('multi-tag-controls')) {
            updateSelectedTagsDisplay();
            updateTagButtonStates();
            return;
        }
        
        const controls = document.createElement('div');
        controls.id = 'multi-tag-controls';
        controls.className = 'multi-tag-controls';
        controls.innerHTML = `
            <div class="selected-tags-display" id="selected-filter-tags"></div>
            <div class="multi-tag-actions">
                <button class="clear-filter-btn" onclick="clearFilterTags()">
                    <i class="fas fa-times"></i> 選択解除
                </button>
                <button class="apply-filter-btn" onclick="applyMultiTagFilter()">
                    <i class="fas fa-filter"></i> フィルタ適用
                </button>
            </div>
        `;
        
        // モーダルボディの前（ヘッダーとボディの間）に挿入
        modalContent.insertBefore(controls, modalBody);
        
        // 選択状態を表示
        updateSelectedTagsDisplay();
        updateTagButtonStates();
    };
}

/**
 * フィルタモードを設定
 */
function setFilterMode(mode) {
    filterMode = mode;
    
    const orBtn = document.getElementById('filter-mode-or');
    const andBtn = document.getElementById('filter-mode-and');
    
    if (orBtn && andBtn) {
        if (mode === 'OR') {
            orBtn.classList.add('active');
            andBtn.classList.remove('active');
        } else {
            orBtn.classList.remove('active');
            andBtn.classList.add('active');
        }
    }
}

/**
 * タグ検索の動作を複数選択対応に変更
 */
function updateTagSearchBehavior() {
    // イベントデリゲーションを使用（動的に追加される要素にも対応）
    // 既にリスナーが追加されている場合はスキップ
    if (window.tagSearchListenerAdded) return;
    
    document.body.addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-search-item');
        if (!tagItem) return;
        
        // モーダルが開いているか確認
        const modal = document.getElementById('tag-search-modal');
        if (!modal || modal.style.display === 'none') return;
        
        e.stopPropagation();
        e.preventDefault();
        
        const tagName = tagItem.dataset.tag;
        if (tagName) {
            toggleFilterTag(tagName);
        }
    }, true); // useCapture
    
    window.tagSearchListenerAdded = true;
}

/**
 * フィルタタグをトグル
 */
function toggleFilterTag(tag) {
    const index = selectedFilterTags.indexOf(tag);
    
    if (index > -1) {
        selectedFilterTags.splice(index, 1);
    } else {
        selectedFilterTags.push(tag);
    }
    
    updateSelectedTagsDisplay();
    updateTagButtonStates();
}

/**
 * 選択されたタグの表示を更新
 */
function updateSelectedTagsDisplay() {
    const display = document.getElementById('selected-filter-tags');
    if (!display) return;
    
    if (selectedFilterTags.length === 0) {
        display.innerHTML = '<p class="no-tags-selected">タグを選択してちょうだい💉</p>';
        return;
    }
    
    display.innerHTML = selectedFilterTags.map(tag => `
        <span class="selected-filter-tag">
            ${escapeHtml(tag)}
            <button onclick="toggleFilterTag('${tag.replace(/'/g, '\\\'')}')" class="remove-tag-btn">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).join('');
}

/**
 * タグボタンの状態を更新（選択中のものをハイライト）
 */
function updateTagButtonStates() {
    const tagButtons = document.querySelectorAll('.tag-search-item');
    
    tagButtons.forEach(btn => {
        const tagName = btn.dataset.tag;
        if (selectedFilterTags.includes(tagName)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

/**
 * フィルタタグをクリア
 */
function clearFilterTags() {
    selectedFilterTags = [];
    filterMode = 'OR';
    
    // OR/ANDボタンの状態もリセット
    const orBtn = document.getElementById('filter-mode-or');
    const andBtn = document.getElementById('filter-mode-and');
    if (orBtn && andBtn) {
        orBtn.classList.add('active');
        andBtn.classList.remove('active');
    }
    
    updateSelectedTagsDisplay();
    updateTagButtonStates();
}

/**
 * 複数タグフィルタを適用
 */
function applyMultiTagFilter() {
    if (selectedFilterTags.length === 0) {
        showToast('タグを選択してちょうだい💉', 'warning');
        return;
    }
    
    closeTagSearchModal();
    
    // 投稿フォームを閉じる
    if (typeof closePostForm === 'function') {
        closePostForm();
    }
    
    // 投稿をフィルタリング
    const filtered = allData.posts.filter(post => {
        const postTags = getAllPostTags(post);
        
        if (filterMode === 'AND') {
            // すべてのタグを含む
            return selectedFilterTags.every(tag => postTags.includes(tag));
        } else {
            // いずれかのタグを含む
            return selectedFilterTags.some(tag => postTags.includes(tag));
        }
    });
    
    // 結果を表示
    const container = document.getElementById('main-container');
    const titleEl = document.getElementById('current-view-title');
    
    // タイトルは固定のまま（エリかるて！）
    if (titleEl) {
        titleEl.innerHTML = `<img src="assets/images/siteparts/elitemanager.png" alt="エリかるて！アイコン" class="site-icon">エリかるて！`;
    }
    
    if (container) {
        const modeText = filterMode === 'AND' ? 'すべて含む' : 'いずれかを含む';
        const tagsText = selectedFilterTags.map(t => `<span style="display: inline-block; background: var(--purple); color: white; padding: 4px 10px; border-radius: 12px; margin: 0 4px; font-size: 0.9em;">${escapeHtml(t)}</span>`).join('');
        
        // タグフィルタ結果を投稿フォームの位置に表示
        let html = `
            <div class="search-result-header" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid var(--purple); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-filter" style="color: var(--purple); font-size: 1.2em;"></i>
                        <h2 style="margin: 0; color: var(--purple); font-size: 1.3em;">タグフィルタ</h2>
                    </div>
                    <button onclick="clearMultiTagFilter()" class="clear-search-btn" title="フィルタ解除" style="background: var(--red); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <i class="fas fa-times"></i> 解除
                    </button>
                </div>
                <p style="margin: 0 0 8px; color: var(--comment); font-size: 0.95em;">
                    ${tagsText}
                    <span style="color: var(--cyan); margin-left: 8px;">(${modeText})</span>
                    <span style="color: var(--green); margin-left: 8px;">（${filtered.length}件）</span>
                </p>
            </div>
        `;
        
        if (filtered.length === 0) {
            html += `
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <img src="assets/images/sigewinne/ofuton.webp" alt="リラックス中のシグウィン" style="width: 150px; height: 150px; object-fit: contain; margin: 0 auto 20px; display: block;">
                    <p style="font-size: 1.2em; color: var(--cyan); margin-bottom: 10px;">見つからなかったのよ…</p>
                    <p style="color: var(--comment);">条件に合う投稿が見つからなかったわ💉</p>
                </div>
            `;
        } else {
            filtered.forEach(p => html += createCardHtml(p, true));
        }
        
        container.innerHTML = html;
        
        // Twitter Widgetsを初期化
        if (typeof initTwitterWidgets === 'function') {
            initTwitterWidgets();
        }
    }
    
    showToast(`${filtered.length}件の投稿が見つかったわよ💉`, 'success');
}

/**
 * 投稿のすべてのタグを取得
 */
function getAllPostTags(post) {
    const tags = [];
    
    // tagsプロパティ
    if (post.tags) {
        post.tags.split(',').forEach(tag => {
            const trimmed = tag.trim();
            if (trimmed) tags.push(trimmed);
        });
    }
    
    // eliteEnemiesプロパティ
    if (post.eliteEnemies && Array.isArray(post.eliteEnemies)) {
        tags.push(...post.eliteEnemies);
    }
    
    return tags;
}

/**
 * 複数タグフィルタをクリア
 */
function clearMultiTagFilter() {
    selectedFilterTags = [];
    filterMode = 'OR';
    
    // モーダル内の表示もリセット
    updateSelectedTagsDisplay();
    updateTagButtonStates();
    
    // OR/ANDボタンの状態もリセット
    const orBtn = document.getElementById('filter-mode-or');
    const andBtn = document.getElementById('filter-mode-and');
    if (orBtn && andBtn) {
        orBtn.classList.add('active');
        andBtn.classList.remove('active');
    }
    
    showHome();
}

/**
 * タグ検索モーダルを閉じる
 */
function closeTagSearchModal() {
    const modal = document.getElementById('tag-search-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        enhanceTagSearchModal();
        updateTagSearchBehavior(); // イベントリスナーを追加
    });
} else {
    enhanceTagSearchModal();
    updateTagSearchBehavior(); // イベントリスナーを追加
}

