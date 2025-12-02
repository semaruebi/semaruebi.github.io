// ============================================
// 検索機能
// ============================================

// グローバル変数
let availableTags = new Set();
let searchType = 'content'; // "tag" | "content" | "both"

const debouncedSearch = debounce(() => {
    filterBySearch();
}, CONFIG.SEARCH_DEBOUNCE);

function handleSearchInput() {
    const inputVal = document.getElementById('search-input')?.value || '';
    debouncedSearch();
    showSuggestions(inputVal);
    updateSearchTypeSelector();
}

function updateSearchTypeSelector() {
    const inputVal = document.getElementById('search-input')?.value.trim() || '';
    const selector = document.getElementById('search-type-selector');
    if (!selector) return;
    
    // タグが選択されているかどうかを判定
    const isTagSelected = inputVal && Array.from(availableTags).some(tag => tag.toLowerCase() === inputVal.toLowerCase());
    
    if (isTagSelected || !inputVal) {
        // タグが選択されている場合、または入力がない場合は非表示
        selector.style.display = 'none';
    } else {
        // 自由入力の場合は表示
        selector.style.display = 'flex';
    }
}

function updateSearchType() {
    const selected = document.querySelector('input[name="search-type"]:checked');
    if (selected) {
        searchType = selected.value;
        filterBySearch();
    }
}

function showSuggestions(filterText = '') {
    const suggestionBox = document.getElementById('search-suggestions');
    if (!suggestionBox) return;
    
    suggestionBox.innerHTML = '';
    
    const filteredTags = Array.from(availableTags).filter(tag => 
        tag.toLowerCase().includes(filterText.toLowerCase())
    ).sort();
    
    if (filteredTags.length === 0) {
        suggestionBox.classList.remove('show');
        return;
    }
    
    filteredTags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.setAttribute('role', 'option');
        div.setAttribute('tabindex', '0');
        div.innerHTML = `<i class="fas fa-tag suggestion-tag-icon" aria-hidden="true"></i> ${escapeHtml(tag)}`;
        
        div.onclick = () => {
            const input = document.getElementById('search-input');
            if (input) {
                input.value = tag;
                searchType = 'tag'; // タグ検索モードに切り替え
                updateSearchTypeSelector();
                filterBySearch();
                suggestionBox.classList.remove('show');
            }
        };
        
        div.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                div.onclick();
            }
        };
        
        suggestionBox.appendChild(div);
    });
    
    suggestionBox.classList.add('show');
    suggestionBox.setAttribute('role', 'listbox');
}

function filterBySearch() {
    const keyword = document.getElementById('search-input')?.value.trim() || '';
    const keywordLower = keyword.toLowerCase();
    const titleEl = document.getElementById('current-view-title');
    
    if (!keyword) {
        renderHome();
        return;
    }
    
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
    
    if (titleEl) titleEl.innerText = `検索: "${escapeHtml(keyword)}"`;
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <img src="assets/images/sigewinne/ofuton.webp" alt="リラックス中のシグウィン" style="width: 150px; height: 150px; object-fit: contain; margin: 0 auto 20px; display: block;">
                <p style="font-size: 1.2em; color: var(--cyan); margin-bottom: 10px;">見つからなかったのよ…</p>
                <p style="color: var(--comment);">「${escapeHtml(keyword)}」の検索結果がないわ。別のキーワードで試してみてね💉</p>
            </div>
        `;
    } else {
        let html = '';
        filtered.forEach(p => html += createCardHtml(p, true));
        container.innerHTML = html;
        
        // Twitter Widgetsを初期化
        initTwitterWidgets();
    }
    
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.classList.remove('show');
}

function collectAllTags() {
    availableTags.clear();
    if (allData.posts) {
        allData.posts.forEach(post => {
            if (post.tags) {
                const tags = post.tags.split(',');
                tags.forEach(t => {
                    const trimmed = t.trim();
                    if (trimmed) availableTags.add(trimmed);
                });
            }
        });
    }
}

function searchByTag(tag) {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = tag;
        searchType = 'tag';
        filterBySearch();
    }
}

