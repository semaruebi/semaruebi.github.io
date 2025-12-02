// ============================================
// カード生成関連
// ============================================

function createVideoHtml(content) {
    if (!content) return '';
    
    let html = '';
    
    // YouTube URLのパターンを検出
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
    
    // Twitter/X URLのパターンを検出
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
    if (!imageUrl) return '';
    
    const urls = imageUrl.split(',').map(url => url.trim()).filter(url => url);
    const urlsJsonEncoded = encodeURIComponent(JSON.stringify(urls));
    
    let html = `<div class="image-gallery" data-images="${urlsJsonEncoded}">`;
    urls.forEach((url, index) => {
        // data-indexを使ってクリック時に画像リストを取得
        html += `<img src="${url}" class="post-image" data-index="${index}" referrerpolicy="no-referrer" alt="投稿画像 ${index + 1}" loading="lazy">`;
    });
    html += '</div>';
    return html;
}

function createTagsHtml(tags) {
    if (!tags) return '';
    
    let html = '<div class="tags-display">';
    const tagArray = tags.split(',');
    
    tagArray.forEach(t => {
        const trimmed = t.trim();
        if (!trimmed) return;
        
        let tagClass = 'tag-other';
        let isEliteTag = false;
        
        if (TAG_TYPES.REG.includes(trimmed)) {
            tagClass = 'tag-reg';
        } else if (TAG_TYPES.COST.includes(trimmed)) {
            tagClass = 'tag-cost';
        } else {
            // レギュレーションでもCostでもない → 精鋭タグの可能性
            isEliteTag = true;
        }
        
        const escapedTag = escapeHtml(trimmed);
        const tagJs = trimmed.replace(/'/g, "\\'");
        
        // 精鋭タグで画像がある場合
        if (isEliteTag && typeof getEliteEnemyImagePath === 'function') {
            const imagePath = getEliteEnemyImagePath(trimmed);
            if (imagePath) {
                html += `
                    <span class="tag-badge tag-elite clickable-tag" onclick="searchByTag('${tagJs}')" role="button" tabindex="0" aria-label="${escapedTag}で検索" title="${escapedTag}">
                        <img src="${imagePath}" alt="${escapedTag}" class="tag-elite-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                        <span class="tag-elite-name-fallback" style="display:none;">${escapedTag}</span>
                        <span class="tag-elite-tooltip">${escapedTag}</span>
                    </span>
                `;
            } else {
                // 画像がない場合は通常のタグ
                html += `<span class="tag-badge ${tagClass} clickable-tag" onclick="searchByTag('${tagJs}')" role="button" tabindex="0" aria-label="${escapedTag}で検索" title="${escapedTag}で検索">${escapedTag}</span>`;
            }
        } else {
            // 通常のタグ
            html += `<span class="tag-badge ${tagClass} clickable-tag" onclick="searchByTag('${tagJs}')" role="button" tabindex="0" aria-label="${escapedTag}で検索" title="${escapedTag}で検索">${escapedTag}</span>`;
        }
    });
    html += '</div>';
    return html;
}

function createCardHtml(post, hideRegionRoute = false) {
    const isLiked = myLikedPosts.includes(post.id);
    const originalContent = post.content || '';
    
    // YouTube/Twitter埋め込みを生成
    const videoHtml = createVideoHtml(originalContent);
    
    // YouTube/Twitter URLが含まれている場合は、テキストから除去
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
    const escapedRegion = escapeHtml(post.region || '');
    const escapedRoute = escapeHtml(post.route || '');
    
    // 日付の安全な処理
    let timestamp = '日付不明';
    if (post.timestamp) {
        try {
            const date = new Date(post.timestamp);
            if (!isNaN(date.getTime())) {
                timestamp = date.toLocaleString('ja-JP');
            }
        } catch (e) {
            console.error('Date parsing error:', e);
        }
    }
    
    // リージョン名に応じたクラス名を生成
    const regionClass = getRegionClass(post.region || '');
    
    // ルートが選択されている場合は、リージョンとルート名を非表示
    const regionRouteHtml = hideRegionRoute ? '' : `<div><span class="badge ${regionClass}">${escapedRegion}</span><span class="route-name clickable-route" onclick="event.stopPropagation(); navigateToRoute('${escapeUrl(post.region)}', '${escapeUrl(post.route)}')" role="button" tabindex="0">${escapedRoute}</span></div>`;
    
    // タイトルを表示（タイトルがある場合のみ）
    const titleHtml = post.title ? `<h3 class="card-title">${escapeHtml(post.title)}</h3>` : '';
    
    // 背景画像の設定（画像がある場合、最初の画像を背景に）
    let backgroundStyle = '';
    let hasBackgroundClass = '';
    if (post.imageUrl) {
        const firstImageUrl = post.imageUrl.split(',')[0].trim();
        if (firstImageUrl) {
            backgroundStyle = ` style="--card-bg-image: url('${firstImageUrl}')"`;
            hasBackgroundClass = ' card-with-bg-image';
        }
    }
    
    return `
        <article class="card clickable-card${hasBackgroundClass}" id="card-${escapedId}" role="article" onclick="expandCard('${postIdJs}')"${backgroundStyle}>
            <div class="card-meta">
                ${regionRouteHtml}
                <div style="display: flex; gap: 8px;">
                    <button class="edit-btn" onclick="event.stopPropagation(); editPost('${postIdJs}')" title="編集" aria-label="投稿を編集"><i class="fas fa-edit" aria-hidden="true"></i></button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deletePost('${postIdJs}')" title="削除" aria-label="投稿を削除"><i class="fas fa-trash" aria-hidden="true"></i></button>
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
                    <button class="comment-toggle-btn" onclick="event.stopPropagation(); toggleComments('${postIdJs}')" aria-label="コメントを${commentCount}件表示">
                        <i class="far fa-comments" aria-hidden="true"></i> ${commentCount}
                    </button>
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${postIdJs}', this)" aria-label="${isLiked ? 'いいねを取り消す' : 'いいね'}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i> <span>${post.likes || 0}</span>
                    </button>
                    <button class="bookmark-btn ${isBookmarked(post.id) ? 'bookmarked' : ''}" onclick="event.stopPropagation(); toggleBookmark('${postIdJs}', this)" aria-label="${isBookmarked(post.id) ? 'ブックマークを解除' : 'ブックマークに追加'}" title="${isBookmarked(post.id) ? 'ブックマークを解除' : 'ブックマークに追加'}">
                        <i class="${isBookmarked(post.id) ? 'fas' : 'far'} fa-bookmark" aria-hidden="true"></i>
                    </button>
                    <button class="share-btn" onclick="event.stopPropagation(); showShareMenu('${postIdJs}', this)" aria-label="共有" title="共有">
                        <i class="fas fa-share-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <div class="comments-section" onclick="event.stopPropagation()">
                <div id="comments-${escapedId}" class="comments-container" role="region" aria-label="コメント">
                    ${commentsHtml}
                    <div style="margin-top:10px;">
                        <button class="comment-action-btn" onclick="event.stopPropagation(); showReplyForm('${postIdJs}', null)" aria-label="コメントを書く">
                            <i class="fas fa-plus" aria-hidden="true"></i> コメントを書く
                        </button>
                        <div id="reply-form-${escapedId}-root" class="comment-form">
                            <textarea id="input-comment-${escapedId}-root" class="comment-input" rows="2" placeholder="見せてちょうだい..." aria-label="コメント入力"></textarea>
                            <button class="comment-submit-btn" onclick="event.stopPropagation(); submitComment('${postIdJs}', null)" aria-label="コメントを送信">送信</button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

/**
 * コンパクトカードHTML生成（ホーム画面用）
 */
function createCompactCardHtml(post) {
    const isLiked = myLikedPosts.includes(post.id);
    const escapedId = escapeUrl(post.id);
    const postIdJs = post.id.replace(/'/g, "\\'");
    const escapedRegion = escapeHtml(post.region || '');
    const escapedRoute = escapeHtml(post.route || '');
    const escapedTitle = escapeHtml(post.title || '');
    
    const postComments = allData.comments ? allData.comments.filter(c => c.postId === post.id) : [];
    const commentCount = postComments.length;
    
    const tagsHtml = createTagsHtml(post.tags);
    const regionClass = getRegionClass(post.region || '');
    
    // コンテンツのプレビュー（最初の100文字）
    const contentPreview = (post.content || '').substring(0, 100) + (post.content && post.content.length > 100 ? '...' : '');
    
    // 背景画像の設定（画像がある場合、最初の画像を背景に）
    let backgroundStyle = '';
    let hasBackgroundClass = '';
    if (post.imageUrl) {
        const firstImageUrl = post.imageUrl.split(',')[0].trim();
        if (firstImageUrl) {
            backgroundStyle = ` style="--card-bg-image: url('${firstImageUrl}')"`;
            hasBackgroundClass = ' card-with-bg-image';
        }
    }
    
    return `
        <article class="compact-card${hasBackgroundClass}" id="compact-card-${escapedId}" data-post-id="${postIdJs}" role="article"${backgroundStyle}>
            <div class="compact-card-header">
                <span class="badge ${regionClass}">${escapedRegion}</span>
                <span class="compact-route-name">${escapedRoute}</span>
            </div>
            <h4 class="compact-card-title">${escapedTitle}</h4>
            ${tagsHtml}
            <p class="compact-card-preview">${escapeHtml(contentPreview)}</p>
            <div class="compact-card-footer">
                <span class="compact-stat"><i class="far fa-heart" aria-hidden="true"></i> ${post.likes || 0}</span>
                <span class="compact-stat"><i class="far fa-comments" aria-hidden="true"></i> ${commentCount}</span>
            </div>
        </article>
    `;
}

/**
 * カード要素を作成（DOM要素として）
 */
function createCardElement(post) {
    const div = document.createElement('div');
    div.innerHTML = createCardHtml(post);
    return div.firstElementChild;
}

function renderCommentTree(allComments, parentId, postId) {
    const children = allComments.filter(c => c.parentId === parentId);
    if (children.length === 0) return '';
    
    let html = '';
    children.forEach(c => {
        const isLiked = myLikedComments.includes(c.id);
        const childHtml = renderCommentTree(allComments, c.id, postId);
        const date = new Date(c.timestamp).toLocaleString();
        const escapedId = escapeUrl(c.id);
        const escapedPostId = escapeUrl(postId);
        const escapedContent = escapeHtml(c.content || '');
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
    
    // まずモーダル内を優先的に検索
    const modal = document.getElementById('card-detail-modal');
    let el = null;
    
    if (modal && modal.style.display !== 'none') {
        el = modal.querySelector(`#comments-${postIdEscaped}`);
    }
    
    // モーダル内になければメイン画面から検索
    if (!el) {
        el = document.getElementById(`comments-${postIdEscaped}`);
    }
    
    if (!el) return;
    el.classList.toggle('open');
    el.setAttribute('aria-expanded', el.classList.contains('open'));
}

function showReplyForm(postId, commentId) {
    const targetId = commentId ? escapeUrl(commentId) : `${escapeUrl(postId)}-root`;
    
    // まずモーダル内を優先的に検索
    const modal = document.getElementById('card-detail-modal');
    let form = null;
    
    if (modal && modal.style.display !== 'none') {
        form = modal.querySelector(`#reply-form-${targetId}`);
    }
    
    // モーダル内になければメイン画面から検索
    if (!form) {
        form = document.getElementById(`reply-form-${targetId}`);
    }
    
    if (!form) return;
    
    const isVisible = form.style.display === 'block';
    form.style.display = isVisible ? 'none' : 'block';
    form.classList.toggle('active', !isVisible);
    form.setAttribute('aria-hidden', isVisible);
}

/**
 * いいね機能の共通処理
 */
function handleLikeToggle(id, btn, likedArray, storageKey, actionPrefix) {
    const isLiked = likedArray.includes(id);
    const countSpan = btn.querySelector('span') || btn;
    const icon = btn.querySelector('i');
    const current = parseInt(countSpan.innerText) || 0;
    
    if (isLiked) {
        const newCount = Math.max(0, current - 1);
        if (countSpan.tagName === 'SPAN') {
            countSpan.innerText = newCount;
        } else {
            btn.innerHTML = `<i class="far fa-heart" aria-hidden="true"></i> ${newCount}`;
        }
        btn.classList.remove('liked');
        if (icon) icon.className = 'far fa-heart';
        btn.setAttribute('aria-label', 'いいね');
        
        const index = likedArray.indexOf(id);
        if (index > -1) {
            likedArray.splice(index, 1);
            localStorage.setItem(storageKey, JSON.stringify(likedArray));
        }
        
        fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: `unlike${actionPrefix}`, id: id })
        }).catch(err => console.error(`Unlike ${actionPrefix.toLowerCase()} error:`, err));
    } else {
        const newCount = current + 1;
        if (countSpan.tagName === 'SPAN') {
            countSpan.innerText = newCount;
        } else {
            btn.innerHTML = `<i class="fas fa-heart" aria-hidden="true"></i> ${newCount}`;
        }
        btn.classList.add('liked');
        if (icon) icon.className = 'fas fa-heart';
        btn.setAttribute('aria-label', 'いいねを取り消す');
        
        likedArray.push(id);
        localStorage.setItem(storageKey, JSON.stringify(likedArray));
        
        fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: `like${actionPrefix}`, id: id })
        }).catch(err => console.error(`Like ${actionPrefix.toLowerCase()} error:`, err));
    }
}

// ============================================
// スケルトンローディング
// ============================================

/**
 * スケルトンカードHTML生成
 */
function createSkeletonCardHtml() {
    return `
        <article class="skeleton-card">
            <div class="skeleton-element skeleton-title"></div>
            <div class="skeleton-tags">
                <div class="skeleton-element skeleton-tag"></div>
                <div class="skeleton-element skeleton-tag"></div>
                <div class="skeleton-element skeleton-tag"></div>
            </div>
            <div class="skeleton-element skeleton-content"></div>
            <div class="skeleton-element skeleton-content"></div>
            <div class="skeleton-element skeleton-content"></div>
            <div class="skeleton-actions">
                <div class="skeleton-element skeleton-action"></div>
                <div class="skeleton-element skeleton-action"></div>
            </div>
        </article>
    `;
}

/**
 * コンパクトスケルトンカードHTML生成
 */
function createSkeletonCompactCardHtml() {
    return `
        <article class="skeleton-compact-card">
            <div class="skeleton-element skeleton-compact-title"></div>
            <div class="skeleton-tags">
                <div class="skeleton-element skeleton-tag"></div>
                <div class="skeleton-element skeleton-tag"></div>
            </div>
            <div class="skeleton-element skeleton-compact-preview"></div>
            <div class="skeleton-element skeleton-compact-preview"></div>
            <div class="skeleton-element skeleton-compact-preview"></div>
        </article>
    `;
}

/**
 * スケルトンカードを表示
 */
function showSkeletonCards(count = 5, isCompact = false) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    const skeletonHtml = isCompact 
        ? createSkeletonCompactCardHtml() 
        : createSkeletonCardHtml();
    
    container.innerHTML = skeletonHtml.repeat(count);
}

function toggleCommentLike(commentId, btn) {
    handleLikeToggle(commentId, btn, myLikedComments, 'rta_liked_comments', 'Comment');
}

function toggleLike(id, btn) {
    handleLikeToggle(id, btn, myLikedPosts, 'rta_liked_posts', '');
}

