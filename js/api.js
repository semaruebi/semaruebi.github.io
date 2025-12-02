// ============================================
// API通信関連
// ============================================

// グローバル変数（他のファイルからもアクセス可能）
let allData = { routes: [], posts: [], comments: [], eliteEnemies: [] };

/**
 * データ取得（リトライ機能付き）
 */
async function fetchData(btnElement = null, forceRefresh = false) {
    const container = document.getElementById('main-container');
    if (!container) return;
    
    let originalIcon = '';
    
    if (btnElement) {
        btnElement.disabled = true;
        originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-sync-alt fa-spin" aria-hidden="true"></i>';
        btnElement.setAttribute('aria-label', '更新中...');
    } else if (!allData.posts.length) {
        // 初回読み込み時はシグウィンのローディングを表示
        container.innerHTML = `
            <div class="loading" role="status" aria-live="polite" style="text-align: center; padding: 40px;">
                <img src="assets/images/sigewinne/ochusha.webp" alt="治療中のシグウィン" style="width: 120px; height: 120px; object-fit: contain; margin: 0 auto 20px; display: block; animation: bounce 1s infinite;">
                <p><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 診断中…じっとしててね。</p>
            </div>
        `;
    }
    
    try {
        // 初回読み込みまたは強制リフレッシュの場合のみキャッシュ破棄
        const shouldBypassCache = forceRefresh || !allData.posts.length || btnElement;
        
        const accessInfo = {
            userAgent: navigator.userAgent || '',
            referer: document.referrer || '',
            url: window.location.href || ''
        };
        
        // キャッシュ破棄が必要な時だけタイムスタンプを追加
        if (shouldBypassCache) {
            accessInfo.t = Date.now();
        }
        
        const queryString = Object.entries(accessInfo)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        const url = CONFIG.GAS_API_URL + '?' + queryString;
        const response = await fetchWithRetry(url);
        const text = await response.text();
        
        try {
            const data = JSON.parse(text);
            allData = data;
            
            collectAllTags();
            renderSidebar();
            
            const searchVal = document.getElementById('search-input')?.value || '';
            if (searchVal) {
                filterBySearch();
            } else if (currentFilter.region) {
                renderPosts();
            } else {
                renderHome();
            }
            
            setupFormOptions();
            updateSortSelector();
            
            if (btnElement) {
                showToast('データを更新したわよ！最新の診断結果なの💉', 'success', 2000);
            }
        } catch (e) {
            console.error('JSON Parse Error:', e);
            throw new Error('データの解析に失敗しました');
        }
    } catch (err) {
        console.error('Fetch Error:', err);
        const errorMessage = err.message || 'データの読み込みに失敗しました';
        
        if (allData.posts.length === 0 && !btnElement) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--red);" role="alert">
                    <p><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> あら、エラーみたい。落ち着くのよ。</p>
                    <p style="font-size:0.8em; color:var(--comment);">${escapeHtml(errorMessage)}</p>
                    <p style="font-size:0.8em; color:var(--comment);">連続で更新すると疲れちゃうの。少し休んでから再読み込みしてね。</p>
                    <button onclick="fetchData()" style="margin-top:10px; padding:5px 15px; cursor:pointer;" aria-label="再読み込み">再診する</button>
                </div>`;
        } else {
            showToast('更新に失敗しちゃったわ。少し休んでから、もう一度試してちょうだい', 'error');
        }
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalIcon;
            btnElement.setAttribute('aria-label', '最新情報に更新');
        }
    }
}

/**
 * パスワードを検証（クライアント側）
 */
async function verifyPasswordAPI(postId, password) {
    try {
        // 投稿データを取得
        const post = allData.posts.find(p => p.id === postId);
        if (!post) {
            console.error('Post not found:', postId);
            return false;
        }
        
        const storedHash = post.password || '';
        
        // 管理者パスワードのチェック
        const adminHash = await hashPassword(password);
        if (adminHash === CONFIG.ADMIN_PASSWORD_HASH) {
            return true;
        }
        
        // 投稿パスワードが設定されていない場合は、管理者パスワードのみ許可
        if (!storedHash || storedHash === '') {
            return false;
        }
        
        // 入力パスワードが空の場合は拒否
        if (!password || password === '') {
            return false;
        }
        
        // 入力パスワードをハッシュ化して比較
        const inputHash = await hashPassword(password);
        return inputHash === storedHash;
    } catch (err) {
        console.error('Password verification error:', err);
        return false;
    }
}

/**
 * コメント送信
 */
async function submitComment(postId, parentId) {
    const inputId = parentId ? `input-comment-${escapeUrl(parentId)}` : `input-comment-${escapeUrl(postId)}-root`;
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
        showToast('コメントを見せてちょうだい。', 'warning');
        return;
    }
    
    const formDivId = parentId ? `reply-form-${escapeUrl(parentId)}` : `reply-form-${escapeUrl(postId)}-root`;
    const formDiv = document.getElementById(formDivId);
    if (!formDiv) return;
    
    const btn = formDiv.querySelector('button');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = 'じっとしててね…';
    btn.setAttribute('aria-label', '送信中...');
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'comment',
                postId: postId,
                parentId: parentId,
                content: content
            })
        });
        
        showToast('コメントを受け付けたのよ。力を抜いて、リラックスするのよ。', 'success');
        input.value = '';
        formDiv.style.display = 'none';
        formDiv.setAttribute('aria-hidden', 'true');
        setTimeout(() => fetchData(null, true), 1500);
    } catch (err) {
        showToast('あら、エラーみたい。落ち着くのよ。', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = '送信';
        btn.setAttribute('aria-label', 'コメントを送信');
    }
}

/**
 * お問い合わせ送信
 */
async function submitContact(event) {
    event.preventDefault();
    
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    const type = document.getElementById('contact-type')?.value || '';
    const message = document.getElementById('contact-message')?.value.trim() || '';
    const name = document.getElementById('contact-name')?.value.trim() || '';
    
    // バリデーション
    if (!type) {
        showToast('種類を選択してほしいのよ', 'warning');
        return;
    }
    
    if (!message) {
        showToast('内容を入力してほしいのよ', 'warning');
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = '送信中...';
    submitBtn.setAttribute('aria-label', '送信中...');
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'contact',
                type: type,
                name: name,
                message: message
            })
        });
        
        showToast('お問い合わせはちゃんとウチが届けるのよ、ありがとう！', 'success');
        form.reset();
        setTimeout(() => closeContactForm(), 1500);
    } catch (err) {
        console.error('Contact error:', err);
        showToast('送信に失敗しちゃったみたいなのよ、もう一度試してもらえるかしら。', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        submitBtn.setAttribute('aria-label', '送信');
    }
}

