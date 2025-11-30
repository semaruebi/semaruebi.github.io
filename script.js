const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxsZcPaU9gcpqjbAT2XR1A3UX306uIAQHA_NEhZpn5UQMlztTOqIgHUEgkzXj6myLeMng/exec";

let allData = { routes: [], posts: [], comments: [] };
let currentFilter = { region: null, route: null };
let myLikedPosts = JSON.parse(localStorage.getItem('rta_liked_posts') || '[]');
let myLikedComments = JSON.parse(localStorage.getItem('rta_liked_comments') || '[]');
let openRegions = {};
let homeSections = { popular: true, latest: true };

window.onload = function() { 
    loadTheme();
    fetchData(); 
};

// --- テーマ切り替え ---
function cycleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme') || 'dark';
    let nextTheme = 'dark';
    let iconClass = 'fas fa-moon';

    if (current === 'dark') {
        nextTheme = 'light';
        iconClass = 'fas fa-sun';
    } else if (current === 'light') {
        nextTheme = 'sigewinne'; 
        iconClass = 'fas fa-heart'; 
    } else {
        nextTheme = 'dark';
        iconClass = 'fas fa-moon';
    }

    if (nextTheme === 'dark') {
        body.removeAttribute('data-theme');
    } else {
        body.setAttribute('data-theme', nextTheme);
    }
    document.getElementById('theme-icon').className = iconClass;
    localStorage.setItem('rta_theme', nextTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('rta_theme') || 'dark';
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        body.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
    } else {
        body.setAttribute('data-theme', savedTheme);
        if(savedTheme === 'light') icon.className = 'fas fa-sun';
        if(savedTheme === 'sigewinne') icon.className = 'fas fa-heart';
    }
}

// --- 投稿フォームの開閉 ---
function togglePostForm() {
    const form = document.getElementById('post-form-container');
    form.classList.toggle('closed');
}

// --- 画像プレビュー ---
document.getElementById('input-image').addEventListener('change', function(e) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = "";
    const files = Array.from(e.target.files);
    
    if(files.length > 4) { 
        alert("画像は4枚までなのよ。顔の筋肉を緩めすぎないようにね。"); 
        e.target.value = ""; 
        return; 
    }
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = evt => {
            const img = document.createElement('img');
            img.src = evt.target.result;
            img.className = 'preview-img';
            preview.appendChild(img);
        }
        reader.readAsDataURL(file);
    });
});

// --- データ取得 ---
function fetchData(btnElement = null) {
    const container = document.getElementById("main-container");
    let originalIcon = "";
    
    if(btnElement) {
        btnElement.disabled = true;
        originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>'; 
    } else if(!allData.posts.length) {
        container.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> 診断中…じっとしててね。</p>';
    }

    fetch(GAS_API_URL + '?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            allData = data;
            renderSidebar();
            
            const searchVal = document.getElementById("search-input").value;
            if(searchVal) filterBySearch();
            else if (currentFilter.region) renderPosts();
            else renderHome();
            
            setupFormOptions();
        })
        .catch(err => {
            console.error(err);
            if (allData.posts.length === 0 && !btnElement) {
                container.innerHTML = '<p style="color:var(--red)">あら、エラーみたい。落ち着くのよ。</p>';
            } else {
                console.log("更新に失敗したけど、鎮痛剤ならまだあるはず…（表示維持）");
            }
        })
        .finally(() => {
            if(btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = originalIcon;
            }
        });
}

// --- サイドバー描画 ---
function renderSidebar() {
    const nav = document.getElementById("sidebar-nav");
    if (!nav) return;

    const counts = {};
    if(allData.posts) {
        allData.posts.forEach(p => {
            if(!counts[p.region]) counts[p.region] = { total: 0, routes: {} };
            counts[p.region].total++;
            if(!counts[p.region].routes[p.route]) counts[p.region].routes[p.route] = 0;
            counts[p.region].routes[p.route]++;
        });
    }

    let html = `<div class="nav-item home ${!currentFilter.region?'active':''}" onclick="showHome()"><i class="fas fa-home"></i> ホーム</div>`;
    const grouped = {};
    
    if (allData.routes) {
        allData.routes.forEach(r => { if(!grouped[r.region]) grouped[r.region]=[]; grouped[r.region].push(r.route); });
    }

    for(const [region, routes] of Object.entries(grouped)){
        const isOpen = openRegions[region] ? 'open' : '';
        const iconRot = openRegions[region] ? 'transform: rotate(180deg);' : '';
        const regionCount = (counts[region] && counts[region].total) || 0;

        html += `
            <div class="nav-group-title" onclick="toggleRegion('${region}')">
                <span>${region} <span class="count-badge">${regionCount}</span></span>
                <div class="group-meta"><i class="fas fa-chevron-down rotate-icon" style="${iconRot}"></i></div>
            </div>
            <div id="group-${region}" class="nav-group-content ${isOpen}">
        `;
        routes.forEach(route => {
            const active = (currentFilter.region===region && currentFilter.route===route) ? 'active' : '';
            const routeCount = (counts[region] && counts[region].routes[route]) || 0;
            html += `
                <div class="nav-item ${active}" onclick="filterPosts('${region}','${route}')">
                    <span>${route}</span>
                    <span class="count-badge">${routeCount}</span>
                </div>`;
        });
        html += `</div>`;
    }
    nav.innerHTML = html;
}

function toggleRegion(region) {
    const el = document.getElementById(`group-${region}`);
    if (el.classList.contains('open')) { el.classList.remove('open'); openRegions[region] = false; }
    else { el.classList.add('open'); openRegions[region] = true; }
    renderSidebar(); 
}

// --- 検索フィルター ---
function filterBySearch() {
    const keyword = document.getElementById("search-input").value.toLowerCase();
    document.getElementById("current-view-title").innerText = keyword ? `🔍 Search: "${keyword}"` : "🏠 Home";
    document.getElementById("post-form-container").style.display = "none";
    const filtered = allData.posts.filter(p => 
        (p.content && p.content.toLowerCase().includes(keyword)) ||
        (p.route && p.route.toLowerCase().includes(keyword)) ||
        (p.region && p.region.toLowerCase().includes(keyword)) ||
        (p.tags && p.tags.toLowerCase().includes(keyword))
    );
    const container = document.getElementById("main-container");
    let html = "";
    if(!filtered.length) html = "<p>見つからないわ。マシナリーのパーツが入ってたら、ウチに譲ってくれる？</p>";
    filtered.forEach(p => html += createCardHtml(p));
    container.innerHTML = html;
}

// --- ホーム表示 (アコーディオン化) ---
function renderHome() {
    currentFilter = { region: null, route: null };
    document.getElementById("search-input").value = "";
    document.getElementById("current-view-title").innerText = "🏠 Home";
    
    const form = document.getElementById("post-form-container");
    form.style.display = "block";
    form.classList.add('closed');
    setupFormOptions();

    renderSidebar();
    const container = document.getElementById("main-container");
    
    if (!allData.posts || allData.posts.length === 0) {
        container.innerHTML = "<p>まだ患者さん（投稿）がいませんね。</p>";
        return;
    }

    const popular = [...allData.posts].sort((a,b)=>b.likes-a.likes).slice(0,5);
    const latest = allData.posts.slice(0,5);
    
    const popOpen = homeSections.popular ? 'open' : '';
    const popClass = homeSections.popular ? 'open' : '';
    const latOpen = homeSections.latest ? 'open' : '';
    const latClass = homeSections.latest ? 'open' : '';

    let html = ``;

    html += `
        <div class="section-header ${popClass}" onclick="toggleHomeSection('popular')" style="color:var(--orange);">
            <span>🔥 人気の投稿</span>
            <i class="fas fa-chevron-down section-toggle-icon"></i>
        </div>
        <div id="section-popular" class="section-content ${popOpen}">
    `;
    popular.forEach(p => html += createCardHtml(p));
    html += `</div>`;

    html += `
        <div class="section-header ${latClass}" onclick="toggleHomeSection('latest')" style="color:var(--cyan);">
            <span>🕒 最新の投稿</span>
            <i class="fas fa-chevron-down section-toggle-icon"></i>
        </div>
        <div id="section-latest" class="section-content ${latOpen}">
    `;
    latest.forEach(p => html += createCardHtml(p));
    html += `</div>`;

    container.innerHTML = html;
}

function toggleHomeSection(sectionName) {
    homeSections[sectionName] = !homeSections[sectionName];
    renderHome();
}

// --- 記事フィルタリング ---
function filterPosts(region, route) {
    currentFilter = { region, route };
    document.getElementById("search-input").value = "";
    document.getElementById("current-view-title").innerText = `${region} > ${route}`;
    const form = document.getElementById("post-form-container");
    form.style.display = "block";
    form.classList.add('closed');
    setupFormOptions();
    document.getElementById("input-region").value = region;
    const routeSelect = document.getElementById("input-route");
    routeSelect.innerHTML = `<option value="${route}">${route}</option>`;
    routeSelect.value = route;
    renderSidebar();
    const container = document.getElementById("main-container");
    const filtered = allData.posts.filter(p => p.region === region && p.route === route);
    let html = filtered.length ? "" : "<p style='padding:20px'>一番乗りね。可愛い人には、最高のお宝が相応しいのよ。</p>";
    filtered.forEach(p => html += createCardHtml(p));
    container.innerHTML = html;
}

// --- カード生成 ---
function createCardHtml(post) {
    const isLiked = myLikedPosts.includes(post.id);
    let contentHtml = escapeHtml(post.content);
    contentHtml = contentHtml.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    let videoHtml = "";
    const youtubeMatch = post.content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (youtubeMatch) {
        videoHtml = `<div class="video-container"><iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" allowfullscreen></iframe></div>`;
    }
    
    let imageHtml = "";
    if (post.imageUrl) {
        const urls = post.imageUrl.split(',');
        imageHtml = '<div class="image-gallery">';
        urls.forEach(url => { if(url.trim()) imageHtml += `<img src="${url}" class="post-image" referrerpolicy="no-referrer" onclick="window.open(this.src)">`; });
        imageHtml += '</div>';
    }
    
    let tagsHtml = "";
    if (post.tags) {
        tagsHtml = '<div class="tags-display">';
        const tags = post.tags.split(',');
        const regTags = ["NPuI", "PuA", "PuI", "全般"];
        const costTags = ["制限なし", "低凸", "Cost全般"];
        tags.forEach(t => {
            if(!t) return;
            let tagClass = "tag-other";
            if (regTags.includes(t)) tagClass = "tag-reg";
            else if (costTags.includes(t)) tagClass = "tag-cost";
            tagsHtml += `<span class="tag-badge ${tagClass}">${escapeHtml(t)}</span>`;
        });
        tagsHtml += '</div>';
    }

    const postComments = allData.comments ? allData.comments.filter(c => c.postId === post.id) : [];
    const commentCount = postComments.length;
    const commentsHtml = renderCommentTree(postComments, null, post.id);

    return `
        <div class="card" id="card-${post.id}">
            <div class="card-meta">
                <div><span class="badge">${escapeHtml(post.region)}</span><span class="route-name">${escapeHtml(post.route)}</span></div>
                <button class="delete-btn" onclick="deletePost('${post.id}')" title="削除"><i class="fas fa-trash"></i></button>
            </div>
            ${tagsHtml}
            <div class="card-content">${contentHtml}</div>
            ${videoHtml}
            ${imageHtml}
            <div class="action-bar">
                <span style="font-size:0.8em; color:var(--comment);">${new Date(post.timestamp).toLocaleString()}</span>
                <div style="display:flex; gap:15px;">
                    <button class="comment-toggle-btn" onclick="toggleComments('${post.id}')">
                        <i class="far fa-comments"></i> ${commentCount}
                    </button>
                    <button class="like-btn ${isLiked?'liked':''}" onclick="toggleLike('${post.id}', this)" ${isLiked?'disabled':''}>
                        <i class="${isLiked?'fas':'far'} fa-heart"></i> <span>${post.likes}</span>
                    </button>
                </div>
            </div>
            <div class="comments-section">
                <div id="comments-${post.id}" class="comments-container">
                    ${commentsHtml}
                    <div style="margin-top:10px;">
                        <button class="comment-action-btn" onclick="showReplyForm('${post.id}', null)">
                            <i class="fas fa-plus"></i> コメントを書く
                        </button>
                        <div id="reply-form-${post.id}-root" class="comment-form">
                            <textarea id="input-comment-${post.id}-root" class="comment-input" rows="2" placeholder="見せてちょうだい..."></textarea>
                            <button class="comment-submit-btn" onclick="submitComment('${post.id}', null)">送信</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCommentTree(allComments, parentId, postId) {
    const children = allComments.filter(c => c.parentId === parentId);
    if (children.length === 0) return "";

    let html = "";
    children.forEach(c => {
        const isLiked = myLikedComments.includes(c.id);
        const childHtml = renderCommentTree(allComments, c.id, postId);
        const date = new Date(c.timestamp).toLocaleString();

        html += `
            <div class="comment-node">
                <div class="comment-card">
                    <div class="comment-meta">
                        <span>ID: ...${c.id.slice(-4)}</span>
                        <span>${date}</span>
                    </div>
                    <div class="comment-content">${escapeHtml(c.content)}</div>
                    <div class="comment-actions">
                        <button class="comment-action-btn comment-like-btn ${isLiked?'liked':''}" onclick="toggleCommentLike('${c.id}', this)" ${isLiked?'disabled':''}>
                            <i class="${isLiked?'fas':'far'} fa-heart"></i> ${c.likes}
                        </button>
                        <button class="comment-action-btn" onclick="showReplyForm('${postId}', '${c.id}')">
                            <i class="fas fa-reply"></i> 返信
                        </button>
                    </div>
                    <div id="reply-form-${c.id}" class="comment-form">
                        <textarea id="input-comment-${c.id}" class="comment-input" rows="2" placeholder="見せてちょうだい..."></textarea>
                        <button class="comment-submit-btn" onclick="submitComment('${postId}', '${c.id}')">送信</button>
                    </div>
                </div>
                ${childHtml}
            </div>
        `;
    });
    return html;
}

function toggleComments(postId) {
    const el = document.getElementById(`comments-${postId}`);
    el.classList.toggle('open');
}

function showReplyForm(postId, commentId) {
    const targetId = commentId ? commentId : `${postId}-root`;
    const form = document.getElementById(`reply-form-${targetId}`);
    if (form.style.display === "block") {
        form.style.display = "none";
        form.classList.remove('active');
    } else {
        form.style.display = "block";
        form.classList.add('active');
    }
}

function submitComment(postId, parentId) {
    const inputId = parentId ? `input-comment-${parentId}` : `input-comment-${postId}-root`;
    const content = document.getElementById(inputId).value;
    
    if(!content) { alert("コメントを見せてちょうだい。"); return; }

    const formDiv = document.getElementById(`reply-form-${parentId ? parentId : postId + '-root'}`);
    const btn = formDiv.querySelector('button');
    btn.disabled = true;
    btn.innerText = "じっとしててね…";

    fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            action: "comment", 
            postId: postId, 
            parentId: parentId, 
            content: content 
        })
    })
    .then(() => {
        alert("コメントを受け付けたのよ。力を抜いて、リラックスするのよ。");
        btn.disabled = false;
        btn.innerText = "送信";
        document.getElementById(inputId).value = "";
        formDiv.style.display = "none"; 
        setTimeout(() => fetchData(), 1500);
    })
    .catch(err => {
        alert("あら、エラーみたい。落ち着くのよ。");
        btn.disabled = false;
    });
}

function toggleCommentLike(commentId, btn) {
    if (myLikedComments.includes(commentId)) return;
    
    const icon = btn.querySelector('i');
    icon.className = "fas fa-heart";
    btn.classList.add('liked');
    const current = parseInt(btn.innerText);
    btn.innerHTML = `<i class="fas fa-heart"></i> ${current + 1}`;
    btn.disabled = true;

    myLikedComments.push(commentId);
    localStorage.setItem('rta_liked_comments', JSON.stringify(myLikedComments));

    fetch(GAS_API_URL, { 
        method: "POST", 
        mode: "no-cors", 
        headers:{"Content-Type":"application/json"}, 
        body: JSON.stringify({action:"like_comment", id: commentId}) 
    });
}

function deletePost(id) {
    const password = prompt("削除パスワードを見せてちょうだい。");
    if (!password) return;
    if(!confirm("本当に削除するの？もう、治らないみたい…になっちゃうわよ？")) return;
    
    fetch(GAS_API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: id, password: password }) })
    .then(() => { alert("削除リクエストを送ったわ。あわあわ～しないで待っててね。"); setTimeout(() => fetchData(), 1500); })
    .catch(err => alert("送信エラーよ。キミ、可愛くないのよ！"));
}

function postData() {
    const region = document.getElementById("input-region").value;
    const route = document.getElementById("input-route").value;
    const content = document.getElementById("input-content").value;
    
    const regEl = document.querySelector('input[name="tag_reg"]:checked');
    if (!regEl) { alert("「レギュレーション」を選択してちょうだい。健康管理はウチが担当するのよ。"); return; }
    const tagReg = regEl.value;

    const costEl = document.querySelector('input[name="tag_cost"]:checked');
    if (!costEl) { alert("「Cost」を選択してちょうだい。健康管理はウチが担当するのよ。"); return; }
    const tagCost = costEl.value;

    const optEls = document.querySelectorAll('input[name="tag_opt"]:checked');
    const tagsOpt = Array.from(optEls).map(el => el.value);

    const free1 = document.getElementById('tag-free-1').value.trim();
    const free2 = document.getElementById('tag-free-2').value.trim();
    if (free1) tagsOpt.push(free1);
    if (free2) tagsOpt.push(free2);

    const allTags = [tagReg, tagCost, ...tagsOpt];

    const fileInput = document.getElementById("input-image");
    const btn = document.querySelector("#post-form-container button");

    if (!region || !route || (!content && !fileInput.files.length)) { alert("内容を入力してちょうだい。見せてちょうだい。"); return; }
    if (fileInput.files.length > 4) { alert("画像は4枚までなのよ。転ばないように。"); return; }
    for(let f of fileInput.files){ if(f.size > 2 * 1024 * 1024) { alert("2MB以下の画像にしてちょうだい。"); return; } }

    btn.disabled = true;
    btn.innerText = "じっとしててね…";

    const filePromises = Array.from(fileInput.files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType: file.type });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(images => {
        fetch(GAS_API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", region, route, content, images, tags: allTags }) })
        .then(() => {
            alert("投稿完了なのよ！診断結果は、今すぐお注射…じゃなくて、反映待ちね。");
            document.getElementById("input-content").value = "";
            document.getElementById("input-image").value = "";
            document.getElementById("image-preview").innerHTML = "";
            document.getElementById("tag-free-1").value = "";
            document.getElementById("tag-free-2").value = "";
            document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);

            btn.disabled = false;
            btn.innerText = "投稿する";
            togglePostForm(); 
            setTimeout(() => fetchData(), 2000);
        });
    });
}

function toggleLike(id, btn) {
    if (myLikedPosts.includes(id)) return;
    const countSpan = btn.querySelector("span");
    countSpan.innerText = parseInt(countSpan.innerText) + 1;
    btn.classList.add("liked");
    btn.querySelector("i").className = "fas fa-heart";
    btn.disabled = true;
    myLikedPosts.push(id);
    localStorage.setItem('rta_liked_posts', JSON.stringify(myLikedPosts));
    fetch(GAS_API_URL, { method: "POST", mode: "no-cors", headers:{"Content-Type":"application/json"}, body: JSON.stringify({action:"like", id}) });
}

function setupFormOptions() {
     const regionSelect = document.getElementById("input-region");
    if (!currentFilter.region) {
        regionSelect.innerHTML = "<option value=''>地域を選択</option>";
        if(allData.routes){
            [...new Set(allData.routes.map(r => r.region))].forEach(r => regionSelect.innerHTML += `<option value="${r}">${r}</option>`);
        }
        regionSelect.disabled = false;
        regionSelect.onchange = () => {
            const val = regionSelect.value;
            const routes = allData.routes.filter(r => r.region === val);
            const routeSelect = document.getElementById("input-route");
            routeSelect.innerHTML = "<option value=''>ルートを選択</option>";
            routes.forEach(r => routeSelect.innerHTML += `<option value="${r.route}">${r.route}</option>`);
        };
    }
}

function showHome() { renderHome(); }
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    sidebar.classList.toggle('open');
}
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}
