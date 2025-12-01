// ============================================
// 精鋭狩りRTA Knowledge Base - メインスクリプト
// ============================================

// グローバル変数
let allData = { routes: [], posts: [], comments: [] };
let currentFilter = { region: null, route: null };
let myLikedPosts = JSON.parse(localStorage.getItem('rta_liked_posts') || '[]');
let myLikedComments = JSON.parse(localStorage.getItem('rta_liked_comments') || '[]');
let openRegions = {};
let homeSections = { popular: true, latest: true };
let availableTags = new Set();
let searchDebounceTimer = null;
let retryCount = 0;
let searchType = "content"; // "tag" | "content" | "both" - 自由入力時の検索タイプ

// スワイプ検知用
let touchstartX = 0;
let touchendX = 0;
const SWIPE_THRESHOLD = 50;

// 定数
const TAG_TYPES = {
    REG: ["NPuI", "PuA", "PuI", "全般"],
    COST: ["制限なし", "低凸", "Cost全般"]
};

// ============================================
// ユーティリティ関数
// ============================================

/**
 * HTMLエスケープ（XSS対策）
 */
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * URLの安全なエスケープ
 */
function escapeUrl(url) {
    if (!url) return "";
    return escapeHtml(url).replace(/'/g, "&#39;");
}

/**
 * デバウンス処理
 */
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(searchDebounceTimer);
            func(...args);
        };
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(later, wait);
    };
}

/**
 * リトライ付きフェッチ
 */
async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok || options.mode === 'no-cors') {
                retryCount = 0;
                return response;
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
}

// ============================================
// トースト通知システム
// ============================================

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // アニメーション
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 自動削除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// テーマ管理
// ============================================

function cycleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme') || 'dark';
    const themes = [
        { name: 'dark', icon: 'fa-moon' },
        { name: 'light', icon: 'fa-sun' },
        { name: 'sigewinne', icon: 'fa-heart' }
    ];
    
    const currentIndex = themes.findIndex(t => t.name === current);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    if (nextTheme.name === 'dark') {
        body.removeAttribute('data-theme');
    } else {
        body.setAttribute('data-theme', nextTheme.name);
    }
    
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = `fas ${nextTheme.icon}`;
        icon.setAttribute('aria-label', `${nextTheme.name}テーマ`);
    }
    
    localStorage.setItem('rta_theme', nextTheme.name);
    showToast(`テーマを${nextTheme.name}に切り替えました`, 'success', 2000);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('rta_theme') || 'dark';
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (!icon) return;
    
    const themeMap = {
        dark: { attr: null, icon: 'fa-moon' },
        light: { attr: 'light', icon: 'fa-sun' },
        sigewinne: { attr: 'sigewinne', icon: 'fa-heart' }
    };
    
    const theme = themeMap[savedTheme] || themeMap.dark;
    
    if (theme.attr) {
        body.setAttribute('data-theme', theme.attr);
    } else {
        body.removeAttribute('data-theme');
    }
    
    icon.className = `fas ${theme.icon}`;
    icon.setAttribute('aria-label', `${savedTheme}テーマ`);
}

// ============================================
// UI制御
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
    
    modal.style.display = "block";
    modalImage.src = escapeUrl(imageUrl);
    modalImage.alt = "拡大画像";
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
        modal.style.display = "none";
        document.body.classList.remove('modal-open');
        modal.classList.remove('closing');
        modalImage.classList.remove('closing');
        modalImage.src = "";
    }, 300);
}

// キーボード操作対応
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('image-modal');
        if (modal && modal.style.display === 'block') {
            closeImageModal();
            return;
        }
        // このサイトについてモーダルが開いている場合は閉じる
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal && aboutModal.getAttribute('aria-hidden') === 'false') {
            closeAboutModal();
            return;
        }
        // 問い合わせフォームが開いている場合は閉じる
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
        // 編集モード中はESCキーでキャンセル
        if (editingPostId) {
            cancelEditMode();
        }
    }
});

// ============================================
// 画像プレビュー処理（最適化版）
// ============================================

// 選択されたファイルを保持
let selectedImageFiles = [];
// 編集モード用：既存の画像URLを保持
let existingImageUrls = [];

// 投稿処理中フラグ
let isPosting = false;

function handleImagePreview(e) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    const files = Array.from(e.target.files);
    addImageFiles(files);
}

function addImageFiles(files) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    // 既存のファイルと新しいファイルを結合
    const allFiles = [...selectedImageFiles, ...files];
    
    if (allFiles.length > CONFIG.MAX_IMAGES) {
        showToast(`画像は${CONFIG.MAX_IMAGES}枚までなのよ。顔の筋肉を緩めすぎないようにね。`, 'warning');
        return;
    }
    
    // サイズチェック
    for (let file of files) {
        if (file.size > CONFIG.MAX_IMAGE_SIZE) {
            showToast(`${file.name}は2MB以下の画像にしてちょうだい。`, 'error');
            return;
        }
    }
    
    // ファイルを追加
    selectedImageFiles = allFiles;
    updateImagePreview();
    updateImageInput();
}

function removeImageFile(index) {
    selectedImageFiles.splice(index, 1);
    updateImagePreview();
    updateImageInput();
}

function updateImagePreview() {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    preview.innerHTML = "";
    
    // 既存の画像URLを表示（編集モード用）
    existingImageUrls.forEach((url, index) => {
        if (!url || url.trim() === '') return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        
        const img = document.createElement('img');
        img.src = url;
        img.className = 'preview-img';
        img.alt = `既存画像 ${index + 1}`;
        img.setAttribute('loading', 'lazy');
        img.style.cursor = 'pointer';
        img.onclick = () => {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            if (modal && modalImg) {
                modalImg.src = url;
                modal.style.display = 'flex';
                modal.setAttribute('aria-hidden', 'false');
                modal.setAttribute('tabindex', '0');
                modal.focus();
            }
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
        removeBtn.setAttribute('aria-label', '既存画像を削除');
        removeBtn.onclick = () => {
            existingImageUrls.splice(index, 1);
            updateImagePreview();
        };
        
        const label = document.createElement('div');
        label.style.fontSize = '0.7em';
        label.style.color = 'var(--comment)';
        label.style.marginTop = '2px';
        label.textContent = '既存';
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        wrapper.appendChild(label);
        preview.appendChild(wrapper);
    });
    
    // 新規選択されたファイルを表示
    selectedImageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = evt => {
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-item';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            
            const img = document.createElement('img');
            img.src = evt.target.result;
            img.className = 'preview-img';
            img.alt = `プレビュー画像 ${index + 1}`;
            img.setAttribute('loading', 'lazy');
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            removeBtn.setAttribute('aria-label', '画像を削除');
            removeBtn.onclick = () => removeImageFile(index);
            
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            preview.appendChild(wrapper);
        };
        reader.onerror = () => {
            showToast(`${file.name}の読み込みに失敗しました`, 'error');
        };
        reader.readAsDataURL(file);
    });
}

function updateImageInput() {
    const input = document.getElementById('input-image');
    if (!input) return;
    
    // DataTransferを使ってファイルリストを更新
    const dataTransfer = new DataTransfer();
    selectedImageFiles.forEach(file => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
}


// ============================================
// データ取得（リトライ機能付き）
// ============================================

async function fetchData(btnElement = null) {
    const container = document.getElementById("main-container");
    if (!container) return;
    
    let originalIcon = "";
    
    if (btnElement) {
        btnElement.disabled = true;
        originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-sync-alt fa-spin" aria-hidden="true"></i>';
        btnElement.setAttribute('aria-label', '更新中...');
    } else if (!allData.posts.length) {
        container.innerHTML = '<p class="loading" role="status" aria-live="polite"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 診断中…じっとしててね。</p>';
    }
    
    try {
        // アクセスログ用の情報をURLパラメータに追加（プライバシーに配慮）
        const accessInfo = {
            t: Date.now(), // キャッシュ回避用
            userAgent: navigator.userAgent || "",
            referer: document.referrer || "",
            url: window.location.href || ""
        };
        const queryString = Object.entries(accessInfo)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        const url = CONFIG.GAS_API_URL + '?' + queryString;
        const response = await fetchWithRetry(url);
        const text = await response.text();
        
        try {
            const data = JSON.parse(text);
            allData = data;
            
            // デバッグ用：取得したデータを確認
            console.log("Fetched data:", {
                postsCount: data.posts ? data.posts.length : 0,
                routesCount: data.routes ? data.routes.length : 0,
                commentsCount: data.comments ? data.comments.length : 0,
                firstPost: data.posts && data.posts.length > 0 ? data.posts[0] : null
            });
            
            collectAllTags();
            renderSidebar();
            
            const searchVal = document.getElementById("search-input")?.value || "";
            if (searchVal) {
                filterBySearch();
            } else if (currentFilter.region) {
                renderPosts();
            } else {
                renderHome();
            }
            
            setupFormOptions();
            
            if (btnElement) {
                showToast('データを更新しました', 'success', 2000);
            }
        } catch (e) {
            console.error("JSON Parse Error:", e, text);
            throw new Error("データの解析に失敗しました");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        const errorMessage = err.message || "データの読み込みに失敗しました";
        
        if (allData.posts.length === 0 && !btnElement) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--red);" role="alert">
                    <p><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> あら、エラーみたい。落ち着くのよ。</p>
                    <p style="font-size:0.8em; color:var(--comment);">${escapeHtml(errorMessage)}</p>
                    <p style="font-size:0.8em; color:var(--comment);">連続で更新すると疲れちゃうの。少し休んでから再読み込みしてね。</p>
                    <button onclick="fetchData()" style="margin-top:10px; padding:5px 15px; cursor:pointer;" aria-label="再読み込み">再診する</button>
                </div>`;
        } else {
            showToast('更新に失敗しました。しばらく待ってから再試行してください。', 'error');
        }
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalIcon;
            btnElement.setAttribute('aria-label', '最新情報に更新');
        }
    }
}

function renderPosts() {
    const container = document.getElementById("main-container");
    if (!container) return;
    
    let html = "";
    
    // ルート説明欄を表示（ルートが選択されている場合）
    if (currentFilter.region && currentFilter.route) {
        const routeInfo = allData.routes ? allData.routes.find(r => 
            r.region === currentFilter.region && r.route === currentFilter.route
        ) : null;
        
        if (routeInfo) {
            const escapedRegion = escapeHtml(currentFilter.region);
            const escapedRoute = escapeHtml(currentFilter.route);
            const regionClass = getRegionClass(currentFilter.region);
            const routeDescription = routeInfo.description ? parseMarkdown(routeInfo.description) : "";
            const routeImageUrl = routeInfo.imageUrl || "";
            
            html += `
                <div class="route-info-card">
                    <div class="route-info-header">
                        <span class="badge ${regionClass}">${escapedRegion}</span>
                        <h2 class="route-info-title">${escapedRoute}</h2>
                    </div>
                    ${routeImageUrl ? `
                        <div class="route-info-image">
                            <img src="${escapeUrl(routeImageUrl)}" alt="${escapedRoute}の画像" onclick="event.stopPropagation(); openImageModal('${escapeUrl(routeImageUrl)}')" loading="lazy">
                        </div>
                    ` : ""}
                    ${routeDescription ? `
                        <div class="route-info-description">
                            ${routeDescription}
                        </div>
                    ` : ""}
                </div>
            `;
        }
    }
    
    const filtered = allData.posts.filter(p => 
        p.region === currentFilter.region && p.route === currentFilter.route
    );
    
    if (filtered.length === 0) {
        html += "<p style='padding:20px'>一番乗りね。可愛い人には、最高のお宝が相応しいのよ。</p>";
    } else {
        // ルートが選択されている場合は、リージョンとルート名を非表示にする
        filtered.forEach(p => html += createCardHtml(p, true));
    }
    
    container.innerHTML = html;
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
}

// ============================================
// タグ管理
// ============================================

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

// ============================================
// 検索機能（デバウンス処理付き）
// ============================================

const debouncedSearch = debounce(() => {
    filterBySearch();
}, CONFIG.SEARCH_DEBOUNCE);

function handleSearchInput() {
    const inputVal = document.getElementById("search-input")?.value || "";
    debouncedSearch();
    showSuggestions(inputVal);
    updateSearchTypeSelector();
}

function updateSearchTypeSelector() {
    const inputVal = document.getElementById("search-input")?.value.trim() || "";
    const selector = document.getElementById("search-type-selector");
    if (!selector) return;
    
    // タグが選択されているかどうかを判定
    const isTagSelected = inputVal && Array.from(availableTags).some(tag => tag.toLowerCase() === inputVal.toLowerCase());
    
    if (isTagSelected || !inputVal) {
        // タグが選択されている場合、または入力がない場合は非表示
        selector.style.display = "none";
    } else {
        // 自由入力の場合は表示
        selector.style.display = "flex";
    }
}

function updateSearchType() {
    const selected = document.querySelector('input[name="search-type"]:checked');
    if (selected) {
        searchType = selected.value;
        filterBySearch();
    }
}

function showSuggestions(filterText = "") {
    const suggestionBox = document.getElementById('search-suggestions');
    if (!suggestionBox) return;
    
    suggestionBox.innerHTML = "";
    
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
            const input = document.getElementById("search-input");
            if (input) {
                input.value = tag;
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
    const keyword = document.getElementById("search-input")?.value.trim() || "";
    const keywordLower = keyword.toLowerCase();
    const titleEl = document.getElementById("current-view-title");
    if (titleEl) {
        titleEl.innerText = keyword ? `🔍 Search: "${escapeHtml(keyword)}"` : "400EENote";
    }
    
    const form = document.getElementById("post-form-container");
    if (form) form.style.display = "none";
    
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.classList.remove('show');
    
    // タグが選択されているかどうかを判定
    const isTagSelected = keyword && Array.from(availableTags).some(tag => tag.toLowerCase() === keywordLower);
    
    // タグの完全一致チェック用のヘルパー関数
    const hasExactTag = (tagsString, searchTag) => {
        if (!tagsString || !searchTag) return false;
        const tagArray = tagsString.split(',').map(t => t.trim().toLowerCase());
        const searchTagLower = searchTag.toLowerCase();
        return tagArray.includes(searchTagLower);
    };
    
    let filtered;
    if (isTagSelected) {
        // タグが選択されている場合はタグのみで検索（完全一致）
        filtered = allData.posts.filter(p => 
            hasExactTag(p.tags, keyword)
        );
    } else if (keyword) {
        // 自由入力の場合は検索タイプに応じて検索
        if (searchType === "tag") {
            // タグ検索のみ（完全一致）
            filtered = allData.posts.filter(p => 
                hasExactTag(p.tags, keyword)
            );
        } else if (searchType === "content") {
            // 本文検索のみ（content, route, region）
            filtered = allData.posts.filter(p => 
                (p.content && p.content.toLowerCase().includes(keywordLower)) ||
                (p.route && p.route.toLowerCase().includes(keywordLower)) ||
                (p.region && p.region.toLowerCase().includes(keywordLower))
            );
        } else {
            // 両方（デフォルト動作）
            filtered = allData.posts.filter(p => 
                (p.content && p.content.toLowerCase().includes(keywordLower)) ||
                (p.route && p.route.toLowerCase().includes(keywordLower)) ||
                (p.region && p.region.toLowerCase().includes(keywordLower)) ||
                (p.tags && p.tags.toLowerCase().includes(keywordLower))
            );
        }
    } else {
        filtered = [];
    }
    
    const container = document.getElementById("main-container");
    if (!container) return;
    
    let html = "";
    if (!filtered.length) {
        html = "<p>見つからないわ。マシナリーのパーツが入ってたら、ウチに譲ってくれる？</p>";
    } else {
        filtered.forEach(p => html += createCardHtml(p));
    }
    container.innerHTML = html;
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
}

// ============================================
// サイドバー描画
// ============================================

function renderSidebar() {
    const nav = document.getElementById("sidebar-nav");
    if (!nav) return;
    
    const counts = {};
    if (allData.posts) {
        allData.posts.forEach(p => {
            if (!counts[p.region]) counts[p.region] = { total: 0, routes: {} };
            counts[p.region].total++;
            if (!counts[p.region].routes[p.route]) counts[p.region].routes[p.route] = 0;
            counts[p.region].routes[p.route]++;
        });
    }
    
    let html = `<div class="nav-item home ${!currentFilter.region ? 'active' : ''}" onclick="showHome()" role="button" tabindex="0" aria-label="ホーム"><i class="fas fa-home" aria-hidden="true"></i> ホーム</div>`;
    const grouped = {};
    
    if (allData.routes) {
        allData.routes.forEach(r => {
            if (!grouped[r.region]) grouped[r.region] = [];
            grouped[r.region].push(r.route);
        });
    }
    
    for (const [region, routes] of Object.entries(grouped)) {
        const isOpen = openRegions[region] ? 'open' : '';
        const iconRot = openRegions[region] ? 'transform: rotate(180deg);' : '';
        const regionCount = (counts[region] && counts[region].total) || 0;
        const escapedRegion = escapeHtml(region);
        const regionId = region.replace(/[^a-zA-Z0-9]/g, '_');
        const regionJs = region.replace(/'/g, "\\'");
        
        // リージョン名に応じたクラス名を取得
        const regionClass = getRegionClass(region);
        
        html += `
            <div class="nav-group-title" onclick="toggleRegion('${regionJs}')" data-region="${escapeHtml(region)}" role="button" tabindex="0" aria-expanded="${!!openRegions[region]}" aria-label="${escapedRegion}を${openRegions[region] ? '閉じる' : '開く'}">
                <span><span class="region-dot ${regionClass}">●</span> ${escapedRegion} <span class="count-badge">${regionCount}</span></span>
                <div class="group-meta"><i class="fas fa-chevron-down rotate-icon" style="${iconRot}" aria-hidden="true"></i></div>
            </div>
            <div id="group-${regionId}" class="nav-group-content ${isOpen}" data-region="${escapeHtml(region)}" role="region" aria-labelledby="group-${regionId}">
        `;
        
        routes.forEach(route => {
            const active = (currentFilter.region === region && currentFilter.route === route) ? 'active' : '';
            const routeCount = (counts[region] && counts[region].routes[route]) || 0;
            const escapedRoute = escapeHtml(route);
            const routeJs = route.replace(/'/g, "\\'");
            
            html += `
                <div class="nav-item ${active}" onclick="filterPosts('${regionJs}','${routeJs}')" role="button" tabindex="0" aria-label="${escapedRoute}を表示">
                    <span>${escapedRoute}</span>
                    <span class="count-badge">${routeCount}</span>
                </div>`;
        });
        html += `</div>`;
    }
    nav.innerHTML = html;
}

function toggleRegion(region) {
    // data-region属性で正確なリージョン名を検索
    const titleEl = Array.from(document.querySelectorAll('.nav-group-title')).find(el => {
        const dataRegion = el.getAttribute('data-region');
        return dataRegion === region;
    });
    
    if (!titleEl) return;
    
    // 次の兄弟要素（nav-group-content）を取得
    const contentEl = titleEl.nextElementSibling;
    if (!contentEl || !contentEl.classList.contains('nav-group-content')) return;
    
    // data-region属性が一致することを確認
    const contentRegion = contentEl.getAttribute('data-region');
    if (contentRegion !== region) return;
    
    const rotateIcon = titleEl.querySelector('.rotate-icon');
    const isCurrentlyOpen = contentEl.classList.contains('open');
    
    if (isCurrentlyOpen) {
        // 閉じる
        contentEl.classList.remove('open');
        openRegions[region] = false;
        if (rotateIcon) {
            rotateIcon.style.transform = '';
        }
        titleEl.setAttribute('aria-expanded', 'false');
        const escapedRegion = escapeHtml(region);
        titleEl.setAttribute('aria-label', `${escapedRegion}を開く`);
    } else {
        // 開く
        contentEl.classList.add('open');
        openRegions[region] = true;
        if (rotateIcon) {
            rotateIcon.style.transform = 'rotate(180deg)';
        }
        titleEl.setAttribute('aria-expanded', 'true');
        const escapedRegion = escapeHtml(region);
        titleEl.setAttribute('aria-label', `${escapedRegion}を閉じる`);
    }
    // renderSidebar()は呼ばない - DOMを直接操作するため
}

// ============================================
// ホーム画面描画
// ============================================

function renderHome() {
    currentFilter = { region: null, route: null };
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.value = "";
        updateSearchTypeSelector();
    }
    
    const titleEl = document.getElementById("current-view-title");
    if (titleEl) titleEl.innerText = "400EENote";
    
    closeSidebarOnNavigation();
    
    const form = document.getElementById("post-form-container");
    if (form) {
        form.style.display = "block";
        form.classList.add('closed');
    }
    
    setupFormOptions();
    renderSidebar();
    
    const container = document.getElementById("main-container");
    if (!container) return;
    
    if (!allData.posts || allData.posts.length === 0) {
        container.innerHTML = "<p>まだ患者さん（投稿）がいませんね。</p>";
        return;
    }
    
    const popular = [...allData.posts].sort((a, b) => b.likes - a.likes).slice(0, 5);
    // タイムスタンプでソートして最新の5件を取得
    const latest = [...allData.posts].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // 新しい順（降順）
    }).slice(0, 5);
    
    const popOpen = homeSections.popular ? 'open' : '';
    const popClass = homeSections.popular ? 'open' : '';
    const latOpen = homeSections.latest ? 'open' : '';
    const latClass = homeSections.latest ? 'open' : '';
    
    let html = `
        <div class="section-header ${popClass}" onclick="toggleHomeSection('popular')" style="color:var(--orange);" role="button" tabindex="0" aria-expanded="${homeSections.popular}">
            <span>🔥 人気の投稿</span>
            <i class="fas fa-chevron-down section-toggle-icon" aria-hidden="true"></i>
        </div>
        <div id="section-popular" class="section-content ${popOpen}" role="region">
    `;
    popular.forEach(p => html += createCardHtml(p));
    html += `</div>`;
    
    html += `
        <div class="section-header ${latClass}" onclick="toggleHomeSection('latest')" style="color:var(--cyan);" role="button" tabindex="0" aria-expanded="${homeSections.latest}">
            <span>🕒 最新の投稿</span>
            <i class="fas fa-chevron-down section-toggle-icon" aria-hidden="true"></i>
        </div>
        <div id="section-latest" class="section-content ${latOpen}" role="region">
    `;
    latest.forEach(p => html += createCardHtml(p));
    html += `</div>`;
    
    container.innerHTML = html;
    
    // Twitter Widgetsを初期化
    initTwitterWidgets();
}

function toggleHomeSection(sectionName) {
    homeSections[sectionName] = !homeSections[sectionName];
    renderHome();
}

function filterPosts(region, route) {
    currentFilter = { region, route };
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.value = "";
        updateSearchTypeSelector();
    }
    
    const titleEl = document.getElementById("current-view-title");
    if (titleEl) titleEl.innerText = `${escapeHtml(region)} > ${escapeHtml(route)}`;
    
    closeSidebarOnNavigation();
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.classList.remove('show');
    
    const form = document.getElementById("post-form-container");
    if (form) {
        form.style.display = "block";
        form.classList.add('closed');
    }
    
    setupFormOptions();
    
    renderSidebar();
    renderPosts();
}

// ============================================
// カード生成（分割・最適化）
// ============================================

function createVideoHtml(content) {
    if (!content) return "";
    
    let html = "";
    
    // YouTube URLのパターンを検出（通常動画、短縮URL、ライブ配信に対応）
    const youtubePatterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([\w-]{11})/
    ];
    
    let youtubeId = null;
    for (const pattern of youtubePatterns) {
        const match = content.match(pattern);
        if (match) {
            youtubeId = match[1];
            break;
        }
    }
    
    if (youtubeId) {
        const escapedVideoId = escapeHtml(youtubeId);
        html += `<div class="video-container"><iframe src="https://www.youtube.com/embed/${escapedVideoId}" allowfullscreen title="YouTube動画" frameborder="0"></iframe></div>`;
    }
    
    // Twitter/X URLのパターンを検出（より柔軟なパターン）
    const twitterPatterns = [
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+\/status\/|statuses\/)?(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
    ];
    
    let tweetId = null;
    for (const pattern of twitterPatterns) {
        const match = content.match(pattern);
        if (match) {
            tweetId = match[1];
            break;
        }
    }
    
    if (tweetId) {
        const escapedTweetId = escapeHtml(tweetId);
        html += `<div class="twitter-container"><blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/i/status/${escapedTweetId}"></a></blockquote></div>`;
    }
    
    return html;
}

/**
 * YouTube/Twitter URLをテキストから除去（埋め込み表示するため）
 */
function removeVideoUrls(content) {
    if (!content) return content;
    
    const patterns = [
        // YouTube
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}[^\s]*/g,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]{11}[^\s]*/g,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/[\w-]{11}[^\s]*/g,
        // Twitter/X
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+\/status\/|statuses\/|i\/web\/status\/)?\d+[^\s]*/g
    ];
    
    let result = content;
    patterns.forEach(pattern => {
        result = result.replace(pattern, '');
    });
    
    return result.trim();
}

function createImageHtml(imageUrl) {
    if (!imageUrl) return "";
    
    const urls = imageUrl.split(',');
    let html = '<div class="image-gallery">';
    urls.forEach(url => {
        if (url.trim()) {
            const escapedUrl = escapeUrl(url.trim());
            html += `<img src="${escapedUrl}" class="post-image" referrerpolicy="no-referrer" onclick="event.stopPropagation(); openImageModal('${escapedUrl}')" alt="投稿画像" loading="lazy">`;
        }
    });
    html += '</div>';
    return html;
}

/**
 * リージョン名に応じたCSSクラス名を取得
 */
function getRegionClass(region) {
    if (!region) return "badge-default";
    
    const regionLower = region.toLowerCase();
    
    // 層岩巨淵地下 - オレンジ→暗く
    if (regionLower.includes("層岩") || regionLower.includes("巨淵") || regionLower.includes("chasm")) {
        return "badge-chasm";
    }
    // 淵下宮 - 海の底みたいな雰囲気
    if (regionLower.includes("淵下宮") || regionLower.includes("enkanomiya")) {
        return "badge-enkanomiya";
    }
    // 鶴観 - 霧が濃くなるイメージ
    if (regionLower.includes("鶴観") || regionLower.includes("tsurumi")) {
        return "badge-tsurumi";
    }
    // 沈玉の谷 - 抹茶のようないめーじ、明るめ
    if (regionLower.includes("沈玉") || regionLower.includes("chenyu") || regionLower.includes("谷")) {
        return "badge-chenyu";
    }
    // モンド（Mondstadt）- 風の国、緑・青
    if (regionLower.includes("モンド") || regionLower.includes("mondstadt")) {
        return "badge-mondstadt";
    }
    // 璃月（Liyue）- 岩の国、金色・オレンジ・赤
    if (regionLower.includes("璃月") || regionLower.includes("liyue")) {
        return "badge-liyue";
    }
    // 稲妻（Inazuma）- 雷の国、紫・ピンク
    if (regionLower.includes("稲妻") || regionLower.includes("inazuma")) {
        return "badge-inazuma";
    }
    // スメール（Sumeru）- 草の国、緑・黄・オレンジ
    if (regionLower.includes("スメール") || regionLower.includes("sumeru")) {
        return "badge-sumeru";
    }
    // フォンテーヌ（Fontaine）- 水の国、青・水色
    if (regionLower.includes("フォンテーヌ") || regionLower.includes("fontaine")) {
        return "badge-fontaine";
    }
    // ナタ（Natlan）- 火の国、赤・オレンジ
    if (regionLower.includes("ナタ") || regionLower.includes("natlan")) {
        return "badge-natlan";
    }
    // スネージナヤ（Snezhnaya）- 氷の国、青・白
    if (regionLower.includes("スネージナヤ") || regionLower.includes("snezhnaya")) {
        return "badge-snezhnaya";
    }
    // ナド・クライボーン（Nadoh Kuraibōn）- デフォルト（ピンク・紫）
    if (regionLower.includes("ナド") || regionLower.includes("クライ") || regionLower.includes("nadoh") || regionLower.includes("kuraibōn")) {
        return "badge-nadoh";
    }
    
    // デフォルト
    return "badge-default";
}


function createTagsHtml(tags) {
    if (!tags) return "";
    
    let html = '<div class="tags-display">';
    const tagArray = tags.split(',');
    
    tagArray.forEach(t => {
        const trimmed = t.trim();
        if (!trimmed) return;
        
        let tagClass = "tag-other";
        if (TAG_TYPES.REG.includes(trimmed)) tagClass = "tag-reg";
        else if (TAG_TYPES.COST.includes(trimmed)) tagClass = "tag-cost";
        
        // タグをクリック可能にして、クリックで検索を実行
        const escapedTag = escapeHtml(trimmed);
        const tagJs = trimmed.replace(/'/g, "\\'");
        html += `<span class="tag-badge ${tagClass} clickable-tag" onclick="searchByTag('${tagJs}')" role="button" tabindex="0" aria-label="${escapedTag}で検索" title="${escapedTag}で検索">${escapedTag}</span>`;
    });
    html += '</div>';
    return html;
}

// タグをクリックしたときに検索を実行
function searchByTag(tag) {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;
    
    // 検索入力欄にタグを設定
    searchInput.value = tag;
    
    // 検索タイプセレクターを非表示（タグが選択されているため）
    updateSearchTypeSelector();
    
    // 検索を実行
    filterBySearch();
    
    // 検索入力欄にフォーカス（オプション）
    searchInput.focus();
}

function createCardHtml(post, hideRegionRoute = false) {
    const isLiked = myLikedPosts.includes(post.id);
    const originalContent = post.content || "";
    
    // YouTube/Twitter埋め込みを生成
    const videoHtml = createVideoHtml(originalContent);
    
    // YouTube/Twitter URLが含まれている場合は、テキストから除去（埋め込みで表示するため）
    let contentForDisplay = videoHtml ? removeVideoUrls(originalContent) : originalContent;
    
    // MarkdownをパースしてHTMLに変換
    let contentHtml = parseMarkdown(contentForDisplay);
    
    const imageHtml = createImageHtml(post.imageUrl);
    const tagsHtml = createTagsHtml(post.tags);
    
    const postComments = allData.comments ? allData.comments.filter(c => c.postId === post.id) : [];
    const commentCount = postComments.length;
    const commentsHtml = renderCommentTree(postComments, null, post.id);
    
    const escapedId = escapeUrl(post.id);
    const postIdJs = post.id.replace(/'/g, "\\'");
    const escapedRegion = escapeHtml(post.region || "");
    const escapedRoute = escapeHtml(post.route || "");
    
    // 日付の安全な処理
    let timestamp = "日付不明";
    if (post.timestamp) {
        try {
            const date = new Date(post.timestamp);
            if (!isNaN(date.getTime())) {
                timestamp = date.toLocaleString('ja-JP');
            }
        } catch (e) {
            console.error("Date parsing error:", e);
        }
    }
    
    // リージョン名に応じたクラス名を生成
    const regionClass = getRegionClass(post.region || "");
    
    // ルートが選択されている場合は、リージョンとルート名を非表示
    const regionRouteHtml = hideRegionRoute ? "" : `<div><span class="badge ${regionClass}">${escapedRegion}</span><span class="route-name">${escapedRoute}</span></div>`;
    
    // タイトルを表示（タイトルがある場合のみ）
    const titleHtml = post.title ? `<h3 class="card-title">${escapeHtml(post.title)}</h3>` : "";
    
    return `
        <article class="card" id="card-${escapedId}" role="article">
            <div class="card-meta">
                ${regionRouteHtml}
                <div style="display: flex; gap: 8px;">
                    <button class="edit-btn" onclick="editPost('${postIdJs}')" title="編集" aria-label="投稿を編集"><i class="fas fa-edit" aria-hidden="true"></i></button>
                    <button class="delete-btn" onclick="deletePost('${postIdJs}')" title="削除" aria-label="投稿を削除"><i class="fas fa-trash" aria-hidden="true"></i></button>
                </div>
            </div>
            ${titleHtml}
            ${tagsHtml}
            <div class="card-content">${contentHtml}</div>
            ${videoHtml}
            ${imageHtml}
            <div class="action-bar">
                <time style="font-size:0.8em; color:var(--comment);" datetime="${post.timestamp}">${timestamp}</time>
                <div style="display:flex; gap:15px;">
                    <button class="comment-toggle-btn" onclick="toggleComments('${postIdJs}')" aria-label="コメントを${commentCount}件表示">
                        <i class="far fa-comments" aria-hidden="true"></i> ${commentCount}
                    </button>
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${postIdJs}', this)" aria-label="${isLiked ? 'いいねを取り消す' : 'いいね'}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i> <span>${post.likes || 0}</span>
                    </button>
                </div>
            </div>
            <div class="comments-section">
                <div id="comments-${escapedId}" class="comments-container" role="region" aria-label="コメント">
                    ${commentsHtml}
                    <div style="margin-top:10px;">
                        <button class="comment-action-btn" onclick="showReplyForm('${postIdJs}', null)" aria-label="コメントを書く">
                            <i class="fas fa-plus" aria-hidden="true"></i> コメントを書く
                        </button>
                        <div id="reply-form-${escapedId}-root" class="comment-form">
                            <textarea id="input-comment-${escapedId}-root" class="comment-input" rows="2" placeholder="見せてちょうだい..." aria-label="コメント入力"></textarea>
                            <button class="comment-submit-btn" onclick="submitComment('${postIdJs}', null)" aria-label="コメントを送信">送信</button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// ============================================
// コメント機能
// ============================================

function renderCommentTree(allComments, parentId, postId) {
    const children = allComments.filter(c => c.parentId === parentId);
    if (children.length === 0) return "";
    
    let html = "";
    children.forEach(c => {
        const isLiked = myLikedComments.includes(c.id);
        const childHtml = renderCommentTree(allComments, c.id, postId);
        const date = new Date(c.timestamp).toLocaleString();
        const escapedId = escapeUrl(c.id);
        const escapedPostId = escapeUrl(postId);
        const escapedContent = escapeHtml(c.content || "");
        const commentIdJs = c.id.replace(/'/g, "\\'");
        const postIdJs = postId.replace(/'/g, "\\'");
        
        html += `
            <div class="comment-node" role="article">
                <div class="comment-card">
                    <div class="comment-meta">
                        <span>ID: ...${escapeHtml(c.id.slice(-4))}</span>
                        <time datetime="${c.timestamp}">${date}</time>
                    </div>
                    <div class="comment-content">${escapedContent}</div>
                    <div class="comment-actions">
                        <button class="comment-action-btn comment-like-btn ${isLiked ? 'liked' : ''}" onclick="toggleCommentLike('${commentIdJs}', this)" aria-label="${isLiked ? 'いいねを取り消す' : 'いいね'}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i> ${c.likes || 0}
                        </button>
                        <button class="comment-action-btn" onclick="showReplyForm('${postIdJs}', '${commentIdJs}')" aria-label="返信">
                            <i class="fas fa-reply" aria-hidden="true"></i> 返信
                        </button>
                    </div>
                    <div id="reply-form-${escapedId}" class="comment-form">
                        <textarea id="input-comment-${escapedId}" class="comment-input" rows="2" placeholder="見せてちょうだい..." aria-label="返信入力"></textarea>
                        <button class="comment-submit-btn" onclick="submitComment('${postIdJs}', '${commentIdJs}')" aria-label="返信を送信">送信</button>
                    </div>
                </div>
                ${childHtml}
            </div>
        `;
    });
    return html;
}

function toggleComments(postId) {
    const postIdEscaped = escapeUrl(postId);
    const el = document.getElementById(`comments-${postIdEscaped}`);
    if (!el) return;
    el.classList.toggle('open');
    el.setAttribute('aria-expanded', el.classList.contains('open'));
}

function showReplyForm(postId, commentId) {
    const targetId = commentId ? escapeUrl(commentId) : `${escapeUrl(postId)}-root`;
    const form = document.getElementById(`reply-form-${targetId}`);
    if (!form) return;
    
    const isVisible = form.style.display === "block";
    form.style.display = isVisible ? "none" : "block";
    form.classList.toggle('active', !isVisible);
    form.setAttribute('aria-hidden', isVisible);
}

async function submitComment(postId, parentId) {
    const inputId = parentId ? `input-comment-${escapeUrl(parentId)}` : `input-comment-${escapeUrl(postId)}-root`;
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
        showToast("コメントを見せてちょうだい。", 'warning');
        return;
    }
    
    const formDivId = parentId ? `reply-form-${escapeUrl(parentId)}` : `reply-form-${escapeUrl(postId)}-root`;
    const formDiv = document.getElementById(formDivId);
    if (!formDiv) return;
    
    const btn = formDiv.querySelector('button');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = "じっとしててね…";
    btn.setAttribute('aria-label', '送信中...');
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "comment",
                postId: postId,
                parentId: parentId,
                content: content
            })
        });
        
        showToast("コメントを受け付けたのよ。力を抜いて、リラックスするのよ。", 'success');
        input.value = "";
        formDiv.style.display = "none";
        formDiv.setAttribute('aria-hidden', 'true');
        setTimeout(() => fetchData(), 1500);
    } catch (err) {
        showToast("あら、エラーみたい。落ち着くのよ。", 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = "送信";
        btn.setAttribute('aria-label', 'コメントを送信');
    }
}

function toggleCommentLike(commentId, btn) {
    const isLiked = myLikedComments.includes(commentId);
    const icon = btn.querySelector('i');
    
    // いいね数を取得（テキストから抽出）
    const textContent = btn.innerText.trim();
    const match = textContent.match(/\d+/);
    const current = match ? parseInt(match[0]) : 0;
    
    if (isLiked) {
        // いいねを取り消す
        const newCount = Math.max(0, current - 1);
        btn.innerHTML = `<i class="far fa-heart" aria-hidden="true"></i> ${newCount}`;
        btn.classList.remove('liked');
        btn.setAttribute('aria-label', 'いいね');
        
        // localStorageから削除
        const index = myLikedComments.indexOf(commentId);
        if (index > -1) {
            myLikedComments.splice(index, 1);
            localStorage.setItem('rta_liked_comments', JSON.stringify(myLikedComments));
        }
        
        // GASに取り消しを送信
        fetch(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unlike_comment", id: commentId })
        }).catch(err => console.error("Unlike error:", err));
    } else {
        // いいねを追加
        btn.innerHTML = `<i class="fas fa-heart" aria-hidden="true"></i> ${current + 1}`;
        btn.classList.add('liked');
        btn.setAttribute('aria-label', 'いいねを取り消す');
        
        myLikedComments.push(commentId);
        localStorage.setItem('rta_liked_comments', JSON.stringify(myLikedComments));
        
        // GASにいいねを送信
        fetch(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "like_comment", id: commentId })
        }).catch(err => console.error("Like error:", err));
    }
}

// ============================================
// 投稿機能
// ============================================

async function postData() {
    // 既に投稿処理中の場合は無視
    if (isPosting) {
        showToast("投稿処理中よ。じっとしててね…", 'warning');
        return;
    }
    
    const btn = document.querySelector("#post-form-container button");
    if (!btn) return;
    
    // バリデーションチェック（ボタン無効化の前に実行）
    const title = document.getElementById("input-title")?.value.trim() || "";
    const region = document.getElementById("input-region")?.value || "";
    const route = document.getElementById("input-route")?.value || "";
    const content = document.getElementById("input-content")?.value.trim() || "";
    
    if (!title) {
        showToast("タイトルを入力してちょうだい。", 'warning');
        return;
    }
    
    const regEl = document.querySelector('input[name="tag_reg"]:checked');
    if (!regEl) {
        showToast("「レギュレーション」を選択してちょうだい。健康管理はウチが担当するのよ。", 'warning');
        return;
    }
    const tagReg = regEl.value;
    
    const costEl = document.querySelector('input[name="tag_cost"]:checked');
    if (!costEl) {
        showToast("「Cost」を選択してちょうだい。健康管理はウチが担当するのよ。", 'warning');
        return;
    }
    const tagCost = costEl.value;
    
    const optEls = document.querySelectorAll('input[name="tag_opt"]:checked');
    const tagsOpt = Array.from(optEls).map(el => el.value);
    
    const free1 = document.getElementById('tag-free-1')?.value.trim() || "";
    const free2 = document.getElementById('tag-free-2')?.value.trim() || "";
    if (free1) tagsOpt.push(free1);
    if (free2) tagsOpt.push(free2);
    
        const allTags = [tagReg, tagCost, ...tagsOpt];
    
    // パスワード取得（必須）
    const password = document.getElementById("input-password")?.value.trim() || "";
    if (!password) {
        showToast("パスワードを入力してちょうだい。後から削除・編集する際に必要なのよ。", 'warning');
        return;
    }
    
    if (!region || !route || (!content && selectedImageFiles.length === 0)) {
        showToast("内容を入力してちょうだい。見せてちょうだい。", 'warning');
        return;
    }
    
    if (selectedImageFiles.length > CONFIG.MAX_IMAGES) {
        showToast(`画像は${CONFIG.MAX_IMAGES}枚までなのよ。転ばないように。`, 'warning');
        return;
    }
    
    for (let f of selectedImageFiles) {
        if (f.size > CONFIG.MAX_IMAGE_SIZE) {
            showToast("2MB以下の画像にしてちょうだい。", 'warning');
            return;
        }
    }
    
    // バリデーション通過後、投稿処理を開始
    isPosting = true;
    const originalText = btn.innerHTML;
    const originalDisabled = btn.disabled;
    
    // ボタンを無効化して視覚的フィードバックを提供
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 投稿中…';
    btn.setAttribute('aria-label', '投稿処理中です。しばらくお待ちください...');
    btn.classList.add('posting');
    
    try {
        const images = [];
        if (selectedImageFiles.length > 0) {
            const filePromises = selectedImageFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType: file.type });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });
            const imageData = await Promise.all(filePromises);
            images.push(...imageData);
        }
        
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create",
                title: title,
                region: region,
                route: route,
                content: content,
                images: images,
                tags: allTags,
                password: password
            })
        });
        
        showToast("投稿完了なのよ！診断結果は、今すぐお注射…じゃなくて、反映待ちね。", 'success');
        
        // フォームリセット
        const titleInput = document.getElementById("input-title");
        if (titleInput) titleInput.value = "";
        const contentInput = document.getElementById("input-content");
        if (contentInput) contentInput.value = "";
        selectedImageFiles = [];
        updateImagePreview();
        const imageInput = document.getElementById("input-image");
        if (imageInput) imageInput.value = "";
        const free1Input = document.getElementById("tag-free-1");
        if (free1Input) free1Input.value = "";
        const free2Input = document.getElementById("tag-free-2");
        if (free2Input) free2Input.value = "";
        const passwordInput = document.getElementById("input-password");
        if (passwordInput) passwordInput.value = "";
        document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
        
        togglePostForm();
        setTimeout(() => fetchData(), 2000);
    } catch (err) {
        console.error("Post error:", err);
        showToast("投稿に失敗しました。もう一度お試しください。", 'error');
    } finally {
        // 投稿処理完了後、ボタンを復元
        isPosting = false;
        btn.disabled = originalDisabled;
        btn.innerHTML = originalText;
        btn.setAttribute('aria-label', '投稿する');
        btn.classList.remove('posting');
    }
}

function toggleLike(id, btn) {
    const isLiked = myLikedPosts.includes(id);
    const countSpan = btn.querySelector("span");
    const icon = btn.querySelector("i");
    
    if (isLiked) {
        // いいねを取り消す
        const current = parseInt(countSpan.innerText) || 0;
        const newCount = Math.max(0, current - 1);
        countSpan.innerText = newCount;
        btn.classList.remove("liked");
        if (icon) icon.className = "far fa-heart";
        btn.setAttribute('aria-label', 'いいね');
        
        // localStorageから削除
        const index = myLikedPosts.indexOf(id);
        if (index > -1) {
            myLikedPosts.splice(index, 1);
            localStorage.setItem('rta_liked_posts', JSON.stringify(myLikedPosts));
        }
        
        // GASに取り消しを送信
        fetch(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unlike", id: id })
        }).catch(err => console.error("Unlike error:", err));
    } else {
        // いいねを追加
        const current = parseInt(countSpan.innerText) || 0;
        countSpan.innerText = current + 1;
        btn.classList.add("liked");
        if (icon) icon.className = "fas fa-heart";
        btn.setAttribute('aria-label', 'いいねを取り消す');
        
        myLikedPosts.push(id);
        localStorage.setItem('rta_liked_posts', JSON.stringify(myLikedPosts));
        
        // GASにいいねを送信
        fetch(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "like", id: id })
        }).catch(err => console.error("Like error:", err));
    }
}

async function deletePost(id) {
    const password = prompt("削除パスワードを見せてちょうだい。\n（投稿時に設定したパスワード、または管理者パスワード）");
    if (!password) return;
    
    if (!confirm("本当に削除するの？もう、治らないみたい…になっちゃうわよ？")) return;
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id: id, password: password })
        });
        
        showToast("削除リクエストを送ったわ。あわあわ～しないで待っててね。", 'success');
        setTimeout(() => fetchData(), 1500);
    } catch (err) {
        // no-corsモードではレスポンスを読み取れないため、一般的なエラーメッセージを表示
        // パスワードエラーの可能性も含めて、ユーザーフレンドリーなメッセージを表示
        showToast("パスワードが違うみたい。もしかしてワルい子？", 'error');
    }
}

// 編集用の状態管理
let editingPostId = null;
let editingPostData = null;

async function editPost(id) {
    // 投稿データを取得
    const post = allData.posts.find(p => p.id === id);
    if (!post) {
        showToast("投稿が見つかりませんでした", 'error');
        return;
    }
    
    // パスワード確認（編集時は確認のみ、実際の検証は更新時に行う）
    const password = prompt("編集パスワードを見せてちょうだい。\n（投稿時に設定したパスワード、または管理者パスワード）");
    if (!password) return;
    
    // 編集モードに切り替え（パスワード検証は更新時に実行）
    editingPostId = id;
    editingPostData = post;
    
    // フォームを開く
    const form = document.getElementById('post-form-container');
    if (form) {
        form.classList.remove('closed');
        form.setAttribute('aria-expanded', 'true');
    }
    
    // フォームに既存データを入力
    // setupFormOptions()で自動的に設定されるため、明示的な設定は不要
    // ただし、setupFormOptions()を呼び出す必要がある
    setupFormOptions();
    
    const titleInput = document.getElementById("input-title");
    if (titleInput) titleInput.value = post.title || "";
    const contentInput = document.getElementById("input-content");
    if (contentInput) contentInput.value = post.content || "";
    
    // タグを設定
    if (post.tags) {
        const tags = post.tags.split(',');
        tags.forEach(tag => {
            const trimmed = tag.trim();
            if (!trimmed) return;
            
            // レギュレーション
            const regRadio = document.querySelector(`input[name="tag_reg"][value="${trimmed}"]`);
            if (regRadio) regRadio.checked = true;
            
            // Cost
            const costRadio = document.querySelector(`input[name="tag_cost"][value="${trimmed}"]`);
            if (costRadio) costRadio.checked = true;
            
            // オプションタグ
            const optCheckbox = document.querySelector(`input[name="tag_opt"][value="${trimmed}"]`);
            if (optCheckbox) optCheckbox.checked = true;
            
            // 自由タグ（最初の2つ）
            const free1Input = document.getElementById('tag-free-1');
            const free2Input = document.getElementById('tag-free-2');
            if (free1Input && !free1Input.value && !regRadio && !costRadio && !optCheckbox) {
                free1Input.value = trimmed;
            } else if (free2Input && !free2Input.value && !regRadio && !costRadio && !optCheckbox) {
                free2Input.value = trimmed;
            }
        });
    }
    
    // 既存の画像URLを設定
    existingImageUrls = post.imageUrl ? post.imageUrl.split(',').filter(url => url && url.trim() !== '') : [];
    
    // 新規選択されたファイルはクリア
    selectedImageFiles = [];
    
    // プレビューを更新
    updateImagePreview();
    
    // 投稿ボタンのテキストを変更
    const submitBtn = document.getElementById("submit-post-btn");
    const cancelBtn = document.getElementById("cancel-edit-btn");
    if (submitBtn) {
        submitBtn.innerText = "更新する";
        submitBtn.setAttribute('aria-label', '投稿を更新する');
        submitBtn.onclick = () => updatePost(id, password);
    }
    if (cancelBtn) {
        cancelBtn.style.display = "inline-block";
    }
    
    showToast("編集モードになったのよ。内容を変更して「更新する」を押してね", 'success');
    
    // フォームまでスクロール
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// 編集モードキャンセル
// ============================================

function cancelEditMode() {
    if (!editingPostId) return;
    
    if (!confirm("編集をキャンセルしますかなのよ。入力した内容は失われちゃうけど、いいの？")) {
        return;
    }
    
    // 編集状態をリセット
    editingPostId = null;
    editingPostData = null;
    
    // フォームをリセット
    const titleInput = document.getElementById("input-title");
    const regionSelect = document.getElementById("input-region");
    const routeSelect = document.getElementById("input-route");
    const contentInput = document.getElementById("input-content");
    if (titleInput) titleInput.value = "";
    if (regionSelect) regionSelect.value = "";
    if (routeSelect) routeSelect.value = "";
    if (contentInput) contentInput.value = "";
    
    // タグをリセット
    document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
    const free1Input = document.getElementById("tag-free-1");
    const free2Input = document.getElementById("tag-free-2");
    if (free1Input) free1Input.value = "";
    if (free2Input) free2Input.value = "";
    
    // 画像をリセット
    selectedImageFiles = [];
    existingImageUrls = [];
    updateImagePreview();
    
    const imageInput = document.getElementById("input-image");
    if (imageInput) imageInput.value = "";
    
    // パスワードをリセット
    const passwordInput = document.getElementById("input-password");
    if (passwordInput) passwordInput.value = "";
    
    // ボタンを元に戻す
    const submitBtn = document.getElementById("submit-post-btn");
    const cancelBtn = document.getElementById("cancel-edit-btn");
    if (submitBtn) {
        submitBtn.innerText = "投稿する";
        submitBtn.setAttribute('aria-label', '投稿する');
        submitBtn.onclick = () => postData();
    }
    if (cancelBtn) {
        cancelBtn.style.display = "none";
    }
    
    showToast("編集をキャンセルしたわよ", 'info');
}

async function updatePost(id, password) {
    // 既に投稿処理中の場合は無視
    if (isPosting) {
        showToast("投稿処理中よ。じっとしててね…", 'warning');
        return;
    }
    
    const btn = document.querySelector("#post-form-container button");
    if (!btn) return;
    
    // バリデーションチェック（postDataと同じ）
    const title = document.getElementById("input-title")?.value.trim() || "";
    const region = document.getElementById("input-region")?.value || "";
    const route = document.getElementById("input-route")?.value || "";
    const content = document.getElementById("input-content")?.value.trim() || "";
    
    if (!title) {
        showToast("タイトルを入力してちょうだい。", 'warning');
        return;
    }
    
    const regEl = document.querySelector('input[name="tag_reg"]:checked');
    if (!regEl) {
        showToast("「レギュレーション」を選択するのよ。", 'warning');
        return;
    }
    const tagReg = regEl.value;
    
    const costEl = document.querySelector('input[name="tag_cost"]:checked');
    if (!costEl) {
        showToast("「Cost」を選択するのよ。", 'warning');
        return;
    }
    const tagCost = costEl.value;
    
    const optEls = document.querySelectorAll('input[name="tag_opt"]:checked');
    const tagsOpt = Array.from(optEls).map(el => el.value);
    
    const free1 = document.getElementById('tag-free-1')?.value.trim() || "";
    const free2 = document.getElementById('tag-free-2')?.value.trim() || "";
    if (free1) tagsOpt.push(free1);
    if (free2) tagsOpt.push(free2);
    
    const allTags = [tagReg, tagCost, ...tagsOpt];
    
    // 既存の画像と新規画像の合計をチェック
    const totalImages = existingImageUrls.length + selectedImageFiles.length;
    if (totalImages > CONFIG.MAX_IMAGES) {
        showToast(`画像は${CONFIG.MAX_IMAGES}枚までなのよ。`, 'warning');
        return;
    }
    
    if (!region || !route || (!content && totalImages === 0)) {
        showToast("内容を入力してちょうだい。見せてちょうだい。", 'warning');
        return;
    }
    
    for (let f of selectedImageFiles) {
        if (f.size > CONFIG.MAX_IMAGE_SIZE) {
            showToast("2MB以下の画像にしてちょうだい。", 'warning');
            return;
        }
    }
    
    // バリデーション通過後、更新処理を開始
    isPosting = true;
    const originalText = btn.innerHTML;
    const originalDisabled = btn.disabled;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 更新中…';
    btn.setAttribute('aria-label', '更新処理中です。しばらくお待ちください...');
    btn.classList.add('posting');
    
    try {
        const images = [];
        if (selectedImageFiles.length > 0) {
            const filePromises = selectedImageFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType: file.type });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });
            const imageData = await Promise.all(filePromises);
            images.push(...imageData);
        }
        
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update",
                id: id,
                title: title,
                region: region,
                route: route,
                content: content,
                images: images,
                existingImageUrls: existingImageUrls, // 既存の画像URLを送信
                tags: allTags,
                password: password
            })
        });
        
        showToast("更新完了なのよ！", 'success');
        
        // フォームリセット
        editingPostId = null;
        editingPostData = null;
        const titleInput = document.getElementById("input-title");
        if (titleInput) titleInput.value = "";
        const contentInput = document.getElementById("input-content");
        if (contentInput) contentInput.value = "";
        selectedImageFiles = [];
        existingImageUrls = [];
        updateImagePreview();
        const imageInput = document.getElementById("input-image");
        if (imageInput) imageInput.value = "";
        const free1Input = document.getElementById("tag-free-1");
        if (free1Input) free1Input.value = "";
        const free2Input = document.getElementById("tag-free-2");
        if (free2Input) free2Input.value = "";
        const passwordInput = document.getElementById("input-password");
        if (passwordInput) passwordInput.value = "";
        document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
        
        // ボタンを元に戻す
        const submitBtn = document.getElementById("submit-post-btn");
        const cancelBtn = document.getElementById("cancel-edit-btn");
        if (submitBtn) {
            submitBtn.innerText = "投稿する";
            submitBtn.setAttribute('aria-label', '投稿する');
            submitBtn.onclick = () => postData();
        }
        if (cancelBtn) {
            cancelBtn.style.display = "none";
        }
        
        togglePostForm();
        setTimeout(() => fetchData(), 2000);
    } catch (err) {
        console.error("Update error:", err);
        // no-corsモードではレスポンスを読み取れないため、一般的なエラーメッセージを表示
        // パスワードエラーの可能性も含めて、ユーザーフレンドリーなメッセージを表示
        showToast("パスワードが違うみたい。もしかしてワルい子？", 'error');
    } finally {
        isPosting = false;
        btn.disabled = originalDisabled;
        btn.innerHTML = originalText;
        btn.setAttribute('aria-label', '投稿する');
        btn.classList.remove('posting');
    }
}

// ============================================
// フォーム設定
// ============================================

function setupFormOptions() {
    const regionSelect = document.getElementById("input-region");
    const routeSelect = document.getElementById("input-route");
    if (!regionSelect) return;
    
    // 地域選択のオプションを設定（常に有効）
    regionSelect.innerHTML = "<option value=''>地域を選択</option>";
    if (allData.routes) {
        [...new Set(allData.routes.map(r => r.region))].forEach(r => {
            const selected = (currentFilter.region === r || (editingPostData && editingPostData.region === r)) ? ' selected' : '';
            regionSelect.innerHTML += `<option value="${escapeUrl(r)}"${selected}>${escapeHtml(r)}</option>`;
        });
    }
    regionSelect.disabled = false;
    
    // 地域が選択されている場合、ルート選択のオプションを更新
    const selectedRegion = currentFilter.region || (editingPostData && editingPostData.region) || regionSelect.value;
    if (selectedRegion && routeSelect) {
        updateRouteOptions(selectedRegion);
    }
    
    // 地域選択が変更されたときの処理
    regionSelect.onchange = () => {
        const val = regionSelect.value;
        if (val && routeSelect) {
            updateRouteOptions(val);
        } else if (routeSelect) {
            routeSelect.innerHTML = "<option value=''>ルートを選択</option>";
        }
    };
}

function updateRouteOptions(region) {
    const routeSelect = document.getElementById("input-route");
    if (!routeSelect) return;
    
    const routes = allData.routes ? allData.routes.filter(r => r.region === region) : [];
    routeSelect.innerHTML = "<option value=''>ルートを選択</option>";
    routes.forEach(r => {
        const selected = (currentFilter.route === r.route || (editingPostData && editingPostData.route === r.route)) ? ' selected' : '';
        routeSelect.innerHTML += `<option value="${escapeUrl(r.route)}"${selected}>${escapeHtml(r.route)}</option>`;
    });
    routeSelect.disabled = false;
}

// ============================================
// モバイルサイドバー
// ============================================

function showHome() {
    renderHome();
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    const body = document.body;
    const menuIcon = document.querySelector('.mobile-menu-btn i');
    if (!sidebar) return;
    
    const isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open');
    body.classList.toggle('sidebar-open');
    sidebar.setAttribute('aria-hidden', isOpen);
    
    if (menuIcon) {
        menuIcon.className = isOpen ? 'fas fa-bars' : 'fas fa-times';
        menuIcon.setAttribute('aria-label', isOpen ? 'メニューを開く' : 'メニューを閉じる');
    }
}

function closeSidebarOnNavigation() {
    const sidebar = document.getElementById('mobile-sidebar');
    const body = document.body;
    const menuIcon = document.querySelector('.mobile-menu-btn i');
    
    if (window.innerWidth <= 900 && sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        body.classList.remove('sidebar-open');
        sidebar.setAttribute('aria-hidden', 'true');
        if (menuIcon) {
            menuIcon.className = 'fas fa-bars';
            menuIcon.setAttribute('aria-label', 'メニューを開く');
        }
    }
}

function checkSwipeDirection() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return false;
    
    const isOpen = sidebar.classList.contains('open');
    const deltaX = touchendX - touchstartX;
    if (isOpen && deltaX < -SWIPE_THRESHOLD) {
        toggleMobileSidebar();
        return true;
    }
    return false;
}

// ============================================
// Twitter Widgets初期化
// ============================================

function initTwitterWidgets() {
    // Twitter Widgetsスクリプトが読み込まれているか確認
    if (typeof twttr !== 'undefined' && twttr.widgets) {
        // 既に読み込まれている場合は、新しく追加されたツイートを読み込む
        twttr.widgets.load();
    } else {
        // まだ読み込まれていない場合は、少し待ってから再試行
        setTimeout(() => {
            if (typeof twttr !== 'undefined' && twttr.widgets) {
                twttr.widgets.load();
            }
        }, 500);
    }
}

// ============================================
// Markdownパーサー
// ============================================

function parseMarkdown(text) {
    if (!text) return "";
    
    // コードブロックを一時的に置き換え（他の記法の影響を受けないように）
    const codeBlocks = [];
    let html = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        const id = `__CODEBLOCK_${codeBlocks.length}__`;
        codeBlocks.push({ id, code: code.trim() });
        return id;
    });
    
    // インラインコードを一時的に置き換え
    const inlineCodes = [];
    html = html.replace(/`([^`\n]+)`/g, (match, code) => {
        const id = `__INLINECODE_${inlineCodes.length}__`;
        inlineCodes.push({ id, code });
        return id;
    });
    
    // 行単位で処理
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedLine = line.trim();
        
        // 見出し（#で始まる行、最大6レベル）
        const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            const level = headingMatch[1].length;
            const headingText = escapeHtml(headingMatch[2]);
            processedLines.push(`<h${level}>${headingText}</h${level}>`);
            continue;
        }
        
        // 引用（>で始まる行）
        if (trimmedLine.startsWith('> ')) {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            const quoteText = escapeHtml(trimmedLine.substring(2));
            processedLines.push(`<blockquote>${quoteText}</blockquote>`);
            continue;
        }
        
        // リスト（- で始まる行）
        if (trimmedLine.startsWith('- ')) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            const listText = escapeHtml(trimmedLine.substring(2));
            processedLines.push(`<li>${listText}</li>`);
            continue;
        }
        
        // リスト終了
        if (inList && trimmedLine !== '') {
            processedLines.push('</ul>');
            inList = false;
        }
        
        // 通常の行
        if (trimmedLine !== '') {
            processedLines.push(line);
        } else {
            processedLines.push('<br>');
        }
    }
    
    if (inList) {
        processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');
    
    // 太字（**で囲まれた部分）
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // イタリック（*で囲まれた部分、ただし**の後に処理）
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    
    // リンク（[テキスト](URL)形式）
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        const escapedUrl = escapeUrl(url);
        const escapedText = escapeHtml(text);
        return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
    });
    
    // 残りのURLをリンクに変換（既にリンクになっていないもの）
    html = html.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<>"]+)/g, (url) => {
        const escapedUrl = escapeUrl(url);
        return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    });
    
    // インラインコードを復元
    inlineCodes.forEach(({ id, code }) => {
        const escapedCode = escapeHtml(code);
        html = html.replace(id, `<code>${escapedCode}</code>`);
    });
    
    // コードブロックを復元
    codeBlocks.forEach(({ id, code }) => {
        const escapedCode = escapeHtml(code).replace(/\n/g, '<br>');
        html = html.replace(id, `<pre><code>${escapedCode}</code></pre>`);
    });
    
    // 改行を<br>に変換（ただし、コードブロックやリストの中は除く）
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// ============================================
// Markdownエディタツールバー
// ============================================

function insertMarkdown(type) {
    const textarea = document.getElementById('input-content');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let insertText = '';
    let newCursorPos = start;
    
    switch(type) {
        case 'bold':
            if (selectedText) {
                insertText = `**${selectedText}**`;
                newCursorPos = start + selectedText.length + 4;
            } else {
                insertText = '**太字**';
                newCursorPos = start + 2;
            }
            break;
        case 'italic':
            if (selectedText) {
                insertText = `*${selectedText}*`;
                newCursorPos = start + selectedText.length + 2;
            } else {
                insertText = '*イタリック*';
                newCursorPos = start + 1;
            }
            break;
        case 'link':
            if (selectedText) {
                insertText = `[${selectedText}](URL)`;
                newCursorPos = start + selectedText.length + 3;
            } else {
                insertText = '[リンクテキスト](URL)';
                newCursorPos = start + 5;
            }
            break;
        case 'code':
            if (selectedText) {
                insertText = `\`${selectedText}\``;
                newCursorPos = start + selectedText.length + 2;
            } else {
                insertText = '`コード`';
                newCursorPos = start + 1;
            }
            break;
        case 'list':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => line.trim() ? `- ${line.trim()}` : '').join('\n');
                newCursorPos = start + insertText.length;
            } else {
                insertText = '- リスト項目';
                newCursorPos = start + insertText.length;
            }
            break;
        case 'quote':
            if (selectedText) {
                const lines = selectedText.split('\n');
                insertText = lines.map(line => line.trim() ? `> ${line.trim()}` : '').join('\n');
                newCursorPos = start + insertText.length;
            } else {
                insertText = '> 引用文';
                newCursorPos = start + insertText.length;
            }
            break;
        case 'heading1':
            if (selectedText) {
                insertText = `# ${selectedText}`;
                newCursorPos = start + insertText.length;
            } else {
                insertText = '# 見出し1';
                newCursorPos = start + 2;
            }
            break;
        case 'heading2':
            if (selectedText) {
                insertText = `## ${selectedText}`;
                newCursorPos = start + insertText.length;
            } else {
                insertText = '## 見出し2';
                newCursorPos = start + 3;
            }
            break;
        case 'heading3':
            if (selectedText) {
                insertText = `### ${selectedText}`;
                newCursorPos = start + insertText.length;
            } else {
                insertText = '### 見出し3';
                newCursorPos = start + 4;
            }
            break;
        default:
            return;
    }
    
    textarea.value = beforeText + insertText + afterText;
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
}

// ============================================
// パスワード表示/非表示トグル
// ============================================

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('input-password');
    const toggleIcon = document.getElementById('password-toggle-icon');
    
    if (!passwordInput || !toggleIcon) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
        toggleIcon.setAttribute('aria-label', 'パスワードを非表示');
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
        toggleIcon.setAttribute('aria-label', 'パスワードを表示');
    }
}

// ============================================
// 初期化
// ============================================

window.onload = function() {
    // テーマ読み込み
    loadTheme();
    
    // データ取得
    fetchData();
    
    // 検索サジェストの外側クリックで閉じる
    document.addEventListener('click', function(e) {
        const searchBox = document.querySelector('.search-box');
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions && suggestions.classList.contains('show') && searchBox && !searchBox.contains(e.target)) {
            suggestions.classList.remove('show');
        }
    });
    
    // スワイプ検知
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
        sidebar.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, false);
        sidebar.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            checkSwipeDirection();
        }, false);
    }
    
    // 画像プレビュー
    const imageInput = document.getElementById('input-image');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // ドラッグアンドドロップ機能
    setupDragAndDrop();
};

// ============================================
// ドラッグアンドドロップ機能
// ============================================

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const postForm = document.getElementById('post-form-container');
    if (!dropZone && !postForm) return;
    
    const targetElement = dropZone || postForm;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        targetElement.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        targetElement.addEventListener(eventName, () => {
            if (dropZone) dropZone.classList.add('drag-over');
            if (postForm) postForm.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        targetElement.addEventListener(eventName, () => {
            if (dropZone) dropZone.classList.remove('drag-over');
            if (postForm) postForm.classList.remove('drag-over');
        }, false);
    });
    
    targetElement.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    
    if (files.length === 0) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        addImageFiles(imageFiles);
    } else {
        showToast('画像ファイルをドロップしてちょうだい。', 'warning');
    }
}

// ============================================
// このサイトについてモーダル
// ============================================

function toggleAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    
    const isHidden = modal.getAttribute('aria-hidden') === 'true';
    if (isHidden) {
        openAboutModal();
    } else {
        closeAboutModal();
    }
}

function openAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    
    modal.style.display = "flex";
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
        modal.style.display = "none";
    }, 300);
}

// ============================================
// 要望・問い合わせフォーム
// ============================================

function toggleContactForm() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    
    const isHidden = modal.getAttribute('aria-hidden') === 'true';
    if (isHidden) {
        openContactForm();
    } else {
        closeContactForm();
    }
}

function openContactForm() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    
    modal.style.display = "flex";
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    
    // フォーカスを最初の入力欄に
    const firstInput = document.getElementById('contact-name');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function closeContactForm() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
        modal.style.display = "none";
        // フォームをリセット
        const form = document.getElementById('contact-form');
        if (form) form.reset();
    }, 300);
}

async function submitContact(event) {
    event.preventDefault();
    
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    const type = document.getElementById('contact-type')?.value || "";
    const message = document.getElementById('contact-message')?.value.trim() || "";
    const name = document.getElementById('contact-name')?.value.trim() || "";
    
    // バリデーション
    if (!type) {
        showToast("種類を選択してほしいのよ", 'warning');
        return;
    }
    
    if (!message) {
        showToast("内容を入力してほしいのよ", 'warning');
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "送信中...";
    submitBtn.setAttribute('aria-label', '送信中...');
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "contact",
                type: type,
                name: name,
                message: message
            })
        });
        
        showToast("お問い合わせはちゃんとウチが届けるのよ、ありがとう！", 'success');
        form.reset();
        setTimeout(() => closeContactForm(), 1500);
    } catch (err) {
        console.error("Contact error:", err);
        showToast("送信に失敗しちゃったみたいなのよ、もう一度試してもらえるかしら。", 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        submitBtn.setAttribute('aria-label', '送信');
    }
}
