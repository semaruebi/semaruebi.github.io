// ============================================
// 投稿関連
// ============================================

// 編集用の状態管理
let editingPostId = null;
let editingPostData = null;
let editingPostPassword = null;

/**
 * フォームのバリデーション処理
 */
function validatePostForm(isUpdate = false) {
    const title = document.getElementById('input-title')?.value.trim() || '';
    const region = document.getElementById('input-region')?.value || '';
    const route = document.getElementById('input-route')?.value || '';
    const content = document.getElementById('input-content')?.value.trim() || '';
    const password = document.getElementById('input-password')?.value.trim() || '';
    
    if (!title) {
        showToast('タイトルを入力してちょうだい。', 'warning');
        return null;
    }
    
    const regEl = document.querySelector('input[name="tag_reg"]:checked');
    if (!regEl) {
        showToast('「レギュレーション」を選択してちょうだい。健康管理はウチが担当するのよ。', 'warning');
        return null;
    }
    const tagReg = regEl.value;
    
    const costEl = document.querySelector('input[name="tag_cost"]:checked');
    if (!costEl) {
        showToast('「Cost」を選択してちょうだい。健康管理はウチが担当するのよ。', 'warning');
        return null;
    }
    const tagCost = costEl.value;
    
    const optEls = document.querySelectorAll('input[name="tag_opt"]:checked');
    const tagsOpt = Array.from(optEls).map(el => el.value);
    
    const free1 = document.getElementById('tag-free-1')?.value.trim() || '';
    const free2 = document.getElementById('tag-free-2')?.value.trim() || '';
    if (free1) tagsOpt.push(free1);
    if (free2) tagsOpt.push(free2);
    
    // 精鋭タグも追加
    const eliteEnemyTags = selectedEliteEnemies || [];
    
    const allTags = [tagReg, tagCost, ...tagsOpt, ...eliteEnemyTags];
    
    if (!password) {
        showToast('パスワードを入力してちょうだい。後から削除・編集する際に必要なのよ。', 'warning');
        return null;
    }
    
    const totalImages = existingImageUrls.length + selectedImageFiles.length;
    if (!region || !route || (!content && totalImages === 0)) {
        showToast('内容を入力してちょうだい。見せてちょうだい。', 'warning');
        return null;
    }
    
    if (totalImages > CONFIG.MAX_IMAGES) {
        showToast(`画像は${CONFIG.MAX_IMAGES}枚までなのよ。転ばないように。`, 'warning');
        return null;
    }
    
    for (let f of selectedImageFiles) {
        if (f.size > CONFIG.MAX_IMAGE_SIZE) {
            showToast('2MB以下の画像にしてちょうだい。', 'warning');
            return null;
        }
    }
    
    return { title, region, route, content, password, allTags };
}

async function postData() {
    // 既に投稿処理中の場合は無視
    if (isPosting) {
        showToast('投稿処理中よ。じっとしててね…', 'warning');
        return;
    }
    
    const btn = document.querySelector('#post-form-container button');
    if (!btn) return;
    
    // バリデーションチェック
    const formData = validatePostForm(false);
    if (!formData) return;
    
    // バリデーション通過後、投稿処理を開始
    isPosting = true;
    const originalText = btn.innerHTML;
    const originalDisabled = btn.disabled;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 投稿中…';
    btn.setAttribute('aria-label', '投稿処理中です。しばらくお待ちください...');
    btn.classList.add('posting');
    
    // 投稿中モーダルを表示
    showPostingModal('投稿中…');
    
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
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                title: formData.title,
                region: formData.region,
                route: formData.route,
                content: formData.content,
                images: images,
                tags: formData.allTags,
                password: formData.password
            })
        });
        
        showToast('投稿完了なのよ！診断結果は、今すぐお注射…じゃなくて、反映待ちね。', 'success');
        
        // フォームリセット
        const titleInput = document.getElementById('input-title');
        if (titleInput) titleInput.value = '';
        const contentInput = document.getElementById('input-content');
        if (contentInput) contentInput.value = '';
        selectedImageFiles = [];
        updateImagePreview();
        const imageInput = document.getElementById('input-image');
        if (imageInput) imageInput.value = '';
        const free1Input = document.getElementById('tag-free-1');
        if (free1Input) free1Input.value = '';
        const free2Input = document.getElementById('tag-free-2');
        if (free2Input) free2Input.value = '';
        const passwordInput = document.getElementById('input-password');
        if (passwordInput) passwordInput.value = '';
        document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
        
        // 精鋭タグもクリア
        if (typeof clearSelectedEliteEnemies === 'function') {
            clearSelectedEliteEnemies();
        }
        
        // 下書きをクリア
        if (typeof clearDraft === 'function') {
            clearDraft();
        }
        
        togglePostForm();
        setTimeout(() => fetchData(null, true), 1500);
    } catch (err) {
        console.error('Post error:', err);
        showToast('あら、投稿に失敗しちゃったみたい。もう一度試してみてちょうだい', 'error');
    } finally {
        isPosting = false;
        btn.disabled = originalDisabled;
        btn.innerHTML = originalText;
        btn.setAttribute('aria-label', '投稿する');
        btn.classList.remove('posting');
        
        // 投稿中モーダルを閉じる
        hidePostingModal();
    }
}

async function deletePost(id) {
    // 投稿詳細モーダルが開いていたら閉じる
    const detailModal = document.getElementById('card-detail-modal');
    if (detailModal && detailModal.style.display !== 'none') {
        closeCardDetailModal();
    }
    
    // パスワード確認
    const password = prompt('削除パスワードを見せてちょうだい。\n（投稿時に設定したパスワード、または管理者パスワード）');
    if (!password) return;
    
    // パスワード検証中の表示
    showPostingModal('パスワード確認中…💉');
    
    try {
        // GAS側でパスワード検証
        const isValid = await verifyPasswordAPI(id, password);
        
        hidePostingModal();
        
        if (!isValid) {
            showToast('パスワードが違うみたい。もしかしてワルい子？💉', 'error');
            return;
        }
        
        // パスワードが正しい場合のみ削除確認
        showToast('パスワード確認完了！💉', 'success');
        
    } catch (err) {
        hidePostingModal();
        console.error('Password verification error:', err);
        showToast('パスワード確認に失敗したわ。もう一度試してちょうだい💉', 'error');
        return;
    }
    
    if (!confirm('本当に削除するの？もう、治らないみたい…になっちゃうわよ？')) return;
    
    // 削除中モーダルを表示
    showPostingModal('削除中…');
    
    try {
        await fetchWithRetry(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id, password: password })
        });
        
        showToast('削除リクエストを送ったわ。あわあわ～しないで待っててね。', 'success');
        setTimeout(() => {
            fetchData(null, true);
            hidePostingModal();
        }, 1500);
    } catch (err) {
        console.error('Delete error:', err);
        showToast('削除に失敗したわ。パスワードが違うかもしれないわね💉', 'error');
        hidePostingModal();
    }
}

async function editPost(id) {
    // 投稿詳細モーダルが開いていたら閉じる
    const detailModal = document.getElementById('card-detail-modal');
    if (detailModal && detailModal.style.display !== 'none') {
        closeCardDetailModal();
    }
    
    // 投稿データを取得
    const post = allData.posts.find(p => p.id === id);
    if (!post) {
        showToast('あら、その投稿は見つからなかったわ', 'error');
        return;
    }
    
    // パスワード確認
    const password = prompt('編集パスワードを見せてちょうだい。\n（投稿時に設定したパスワード、または管理者パスワード）');
    if (!password) return;
    
    // パスワード検証中の表示
    showPostingModal('パスワード確認中…💉');
    
    try {
        // GAS側でパスワード検証
        const isValid = await verifyPasswordAPI(id, password);
        
        hidePostingModal();
        
        if (!isValid) {
            showToast('パスワードが違うみたい。もしかしてワルい子？💉', 'error');
            return;
        }
        
        // パスワードが正しい場合のみ編集モードに切り替え
        showToast('パスワード確認完了！編集モードに入るわよ💉', 'success');
        
    } catch (err) {
        hidePostingModal();
        console.error('Password verification error:', err);
        showToast('パスワード確認に失敗したわ。もう一度試してちょうだい💉', 'error');
        return;
    }
    
    // 編集モードに切り替え
    editingPostId = id;
    editingPostData = post;
    editingPostPassword = password;
    
    // フォームを開く
    const form = document.getElementById('post-form-container');
    if (form) {
        form.classList.remove('closed');
        form.setAttribute('aria-expanded', 'true');
    }
    
    setupFormOptions();
    
    const titleInput = document.getElementById('input-title');
    if (titleInput) titleInput.value = post.title || '';
    const contentInput = document.getElementById('input-content');
    if (contentInput) contentInput.value = post.content || '';
    
    // パスワードフィールドに設定
    const passwordInput = document.getElementById('input-password');
    if (passwordInput) passwordInput.value = password;
    
    // タグを設定
    const eliteTags = [];
    if (post.tags) {
        const tags = post.tags.split(',');
        tags.forEach(tag => {
            const trimmed = tag.trim();
            if (!trimmed) return;
            
            const regRadio = document.querySelector(`input[name="tag_reg"][value="${trimmed}"]`);
            if (regRadio) {
                regRadio.checked = true;
                return;
            }
            
            const costRadio = document.querySelector(`input[name="tag_cost"][value="${trimmed}"]`);
            if (costRadio) {
                costRadio.checked = true;
                return;
            }
            
            const optCheckbox = document.querySelector(`input[name="tag_opt"][value="${trimmed}"]`);
            if (optCheckbox) {
                optCheckbox.checked = true;
                return;
            }
            
            const free1Input = document.getElementById('tag-free-1');
            const free2Input = document.getElementById('tag-free-2');
            if (free1Input && !free1Input.value) {
                free1Input.value = trimmed;
                return;
            }
            if (free2Input && !free2Input.value) {
                free2Input.value = trimmed;
                return;
            }
            
            // それ以外は精鋭タグとして扱う
            eliteTags.push(trimmed);
        });
    }
    
    // 精鋭タグを復元
    if (typeof loadEliteEnemiesForEdit === 'function') {
        loadEliteEnemiesForEdit(eliteTags.join(','));
    }
    
    // 既存の画像URLを設定
    existingImageUrls = post.imageUrl ? post.imageUrl.split(',').filter(url => url && url.trim() !== '') : [];
    
    // 新規選択されたファイルはクリア
    selectedImageFiles = [];
    
    // プレビューを更新
    updateImagePreview();
    
    // 投稿ボタンのテキストを変更
    const submitBtn = document.getElementById('submit-post-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (submitBtn) {
        submitBtn.innerText = '更新する';
        submitBtn.setAttribute('aria-label', '投稿を更新する');
        submitBtn.onclick = () => updatePost(id, password);
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }
    
    showToast('編集モードになったのよ。内容を変更して「更新する」を押してね', 'success');
    
    // フォームまでスクロール
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditMode() {
    if (!editingPostId) return;
    
    if (!confirm('編集をキャンセルしますかなのよ。入力した内容は失われちゃうけど、いいの？')) {
        return;
    }
    
    // 編集状態をリセット
    editingPostId = null;
    editingPostData = null;
    editingPostPassword = null;
    
    // フォームをリセット
    const titleInput = document.getElementById('input-title');
    const regionSelect = document.getElementById('input-region');
    const routeSelect = document.getElementById('input-route');
    const contentInput = document.getElementById('input-content');
    if (titleInput) titleInput.value = '';
    if (regionSelect) regionSelect.value = '';
    if (routeSelect) routeSelect.value = '';
    if (contentInput) contentInput.value = '';
    
    // タグをリセット
    document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
    const free1Input = document.getElementById('tag-free-1');
    
    // 精鋭タグもクリア
    if (typeof clearSelectedEliteEnemies === 'function') {
        clearSelectedEliteEnemies();
    }
    const free2Input = document.getElementById('tag-free-2');
    if (free1Input) free1Input.value = '';
    if (free2Input) free2Input.value = '';
    
    // 画像をリセット
    selectedImageFiles = [];
    existingImageUrls = [];
    updateImagePreview();
    
    const imageInput = document.getElementById('input-image');
    if (imageInput) imageInput.value = '';
    
    // パスワードをリセット
    const passwordInput = document.getElementById('input-password');
    if (passwordInput) passwordInput.value = '';
    
    // ボタンを元に戻す
    const submitBtn = document.getElementById('submit-post-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (submitBtn) {
        submitBtn.innerText = '投稿する';
        submitBtn.setAttribute('aria-label', '投稿する');
        submitBtn.onclick = () => postData();
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    showToast('編集をキャンセルしたわよ', 'info');
}

async function updatePost(id, password) {
    // 既に投稿処理中の場合は無視
    if (isPosting) {
        showToast('投稿処理中よ。じっとしててね…', 'warning');
        return;
    }
    
    const btn = document.querySelector('#post-form-container button');
    if (!btn) return;
    
    // バリデーションチェック
    const formData = validatePostForm(true);
    if (!formData) return;
    
    // バリデーション通過後、更新処理を開始
    isPosting = true;
    const originalText = btn.innerHTML;
    const originalDisabled = btn.disabled;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> 更新中…';
    btn.setAttribute('aria-label', '更新処理中です。しばらくお待ちください...');
    btn.classList.add('posting');
    
    // 更新中モーダルを表示
    showPostingModal('更新中…');
    
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
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                id: id,
                title: formData.title,
                region: formData.region,
                route: formData.route,
                content: formData.content,
                images: images,
                existingImageUrls: existingImageUrls,
                tags: formData.allTags,
                password: formData.password
            })
        });
        
        showToast('更新完了なのよ！', 'success');
        
        // フォームリセット
        editingPostId = null;
        editingPostData = null;
        editingPostPassword = null;
        const titleInput = document.getElementById('input-title');
        if (titleInput) titleInput.value = '';
        const contentInput = document.getElementById('input-content');
        if (contentInput) contentInput.value = '';
        selectedImageFiles = [];
        existingImageUrls = [];
        updateImagePreview();
        const imageInput = document.getElementById('input-image');
        if (imageInput) imageInput.value = '';
        const free1Input = document.getElementById('tag-free-1');
        if (free1Input) free1Input.value = '';
        const free2Input = document.getElementById('tag-free-2');
        if (free2Input) free2Input.value = '';
        const passwordInput = document.getElementById('input-password');
        if (passwordInput) passwordInput.value = '';
        document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
        
        // 精鋭タグもクリア
        if (typeof clearSelectedEliteEnemies === 'function') {
            clearSelectedEliteEnemies();
        }
        
        // ボタンを元に戻す
        const submitBtn = document.getElementById('submit-post-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (submitBtn) {
            submitBtn.innerText = '投稿する';
            submitBtn.setAttribute('aria-label', '投稿する');
            submitBtn.onclick = () => postData();
        }
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        togglePostForm();
        setTimeout(() => fetchData(null, true), 1500);
    } catch (err) {
        console.error('Update error:', err);
        showToast('更新に失敗したわ。パスワードが違うかもしれないわね。確認してちょうだい💉', 'error');
        
        // エラー時は編集モードを維持（パスワードのみクリア）
        const passwordInput = document.getElementById('input-password');
        if (passwordInput) passwordInput.value = '';
        editingPostPassword = null;
        
        // パスワード再入力を促す
        setTimeout(() => {
            const newPassword = prompt('パスワードが間違っているようよ。\n正しいパスワードを入力してちょうだい。\n（投稿時に設定したパスワード、または管理者パスワード）');
            if (newPassword) {
                editingPostPassword = newPassword;
                if (passwordInput) passwordInput.value = newPassword;
                showToast('パスワードを設定したわ。もう一度更新ボタンを押してちょうだい💉', 'info');
            }
        }, 500);
    } finally {
        isPosting = false;
        btn.disabled = originalDisabled;
        btn.innerHTML = originalText;
        btn.setAttribute('aria-label', '投稿する');
        btn.classList.remove('posting');
        
        // 更新中モーダルを閉じる
        hidePostingModal();
    }
}

function setupFormOptions() {
    const regionSelect = document.getElementById('input-region');
    const routeSelect = document.getElementById('input-route');
    if (!regionSelect) return;
    
    // 地域選択のオプションを設定
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
    const routeSelect = document.getElementById('input-route');
    if (!routeSelect) return;
    
    const routes = allData.routes ? allData.routes.filter(r => r.region === region) : [];
    routeSelect.innerHTML = "<option value=''>ルートを選択</option>";
    routes.forEach(r => {
        const selected = (currentFilter.route === r.route || (editingPostData && editingPostData.route === r.route)) ? ' selected' : '';
        routeSelect.innerHTML += `<option value="${escapeUrl(r.route)}"${selected}>${escapeHtml(r.route)}</option>`;
    });
    routeSelect.disabled = false;
}

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

