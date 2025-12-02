// ============================================
// 統計ダッシュボード
// ============================================

/**
 * 統計ダッシュボードを表示
 */
function renderStats() {
    currentFilter = { region: 'stats', route: null };
    const container = document.getElementById('main-container');
    const titleEl = document.getElementById('current-view-title');
    
    if (!container) return;
    if (titleEl) {
        titleEl.innerHTML = '<img src="assets/images/siteparts/elitemanager.png" alt="エリまね！アイコン" class="site-icon">📊 統計情報';
    }
    
    // データが不足している場合
    if (!allData.posts || allData.posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <img src="assets/images/sigewinne/nnn.webp" alt="シグウィン" style="width: 150px; height: 150px; object-fit: contain; margin: 0 auto 20px; display: block;">
                <p style="font-size: 1.2em; color: var(--cyan); margin-bottom: 10px;">まだデータがないのよ！</p>
                <p style="color: var(--comment);">投稿が増えたら、素敵な統計情報をお見せするわね💉</p>
            </div>
        `;
        return;
    }
    
    // 統計データを収集
    const stats = collectStats();
    
    let html = `
        <div class="stats-container" style="animation: fadeIn 0.5s ease;">
            <div class="stats-header" style="text-align: center; padding: 35px 25px; background: var(--bg-sidebar); border-radius: 16px; margin-bottom: 30px; box-shadow: 0 8px 24px rgba(111, 212, 241, 0.2), 0 2px 8px rgba(189, 147, 249, 0.15); border: 2px solid transparent; background-image: linear-gradient(var(--bg-sidebar), var(--bg-sidebar)), linear-gradient(135deg, var(--cyan), var(--purple)); background-origin: border-box; background-clip: padding-box, border-box; position: relative;">
                <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(111, 212, 241, 0.05) 0%, rgba(189, 147, 249, 0.05) 100%); border-radius: 14px; pointer-events: none;"></div>
                <h2 style="margin: 0 0 12px 0; font-size: 2.2em; font-weight: bold; background: linear-gradient(135deg, var(--cyan) 0%, var(--purple) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; position: relative; z-index: 1;"><i class="fas fa-chart-line" style="-webkit-text-fill-color: var(--cyan);"></i> 統計ダッシュボード</h2>
                <p style="margin: 0; font-size: 1.15em; color: var(--fg-primary); font-weight: 500; position: relative; z-index: 1;">みんなの健康状態を診断したわよ💉</p>
            </div>
            
            <!-- サマリーカード -->
            <div class="stats-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="summary-card" style="background: var(--bg-sidebar); padding: 25px 20px; border-radius: 12px; text-align: center; border-left: 4px solid var(--cyan); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <div style="font-size: 2.5em; color: var(--cyan); margin-bottom: 10px;"><i class="fas fa-file-alt"></i></div>
                    <div style="font-size: 2.2em; font-weight: bold; color: var(--cyan);">${stats.totalPosts}</div>
                    <div style="color: var(--fg-primary); font-size: 1em; margin-top: 8px; font-weight: 500;">総投稿数</div>
                </div>
                <div class="summary-card" style="background: var(--bg-sidebar); padding: 25px 20px; border-radius: 12px; text-align: center; border-left: 4px solid var(--pink); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <div style="font-size: 2.5em; color: var(--pink); margin-bottom: 10px;"><i class="fas fa-heart"></i></div>
                    <div style="font-size: 2.2em; font-weight: bold; color: var(--pink);">${stats.totalLikes}</div>
                    <div style="color: var(--fg-primary); font-size: 1em; margin-top: 8px; font-weight: 500;">総いいね数</div>
                </div>
                <div class="summary-card" style="background: var(--bg-sidebar); padding: 25px 20px; border-radius: 12px; text-align: center; border-left: 4px solid var(--purple); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <div style="font-size: 2.5em; color: var(--purple); margin-bottom: 10px;"><i class="fas fa-comments"></i></div>
                    <div style="font-size: 2.2em; font-weight: bold; color: var(--purple);">${stats.totalComments}</div>
                    <div style="color: var(--fg-primary); font-size: 1em; margin-top: 8px; font-weight: 500;">総コメント数</div>
                </div>
                <div class="summary-card" style="background: var(--bg-sidebar); padding: 25px 20px; border-radius: 12px; text-align: center; border-left: 4px solid var(--yellow); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <div style="font-size: 2.5em; color: var(--yellow); margin-bottom: 10px;"><i class="fas fa-route"></i></div>
                    <div style="font-size: 2.2em; font-weight: bold; color: var(--yellow);">${stats.totalRoutes}</div>
                    <div style="color: var(--fg-primary); font-size: 1em; margin-top: 8px; font-weight: 500;">ルート数</div>
                </div>
            </div>
            
            <!-- 人気ルートランキング -->
            <div class="stats-section" style="background: var(--bg-sidebar); padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: var(--cyan); display: flex; align-items: center; gap: 10px; font-size: 1.4em; font-weight: bold; padding-bottom: 12px; border-bottom: 2px solid var(--cyan);">
                    <i class="fas fa-trophy"></i> 人気ルートTOP10
                </h3>
                ${generatePopularRoutesHtml(stats.popularRoutes)}
            </div>
            
            <!-- よく使われる精鋭TOP10 -->
            <div class="stats-section" style="background: var(--bg-sidebar); padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: var(--purple); display: flex; align-items: center; gap: 10px; font-size: 1.4em; font-weight: bold; padding-bottom: 12px; border-bottom: 2px solid var(--purple);">
                    <i class="fas fa-dragon"></i> よく使われる精鋭TOP10
                </h3>
                ${generatePopularElitesHtml(stats.popularElites)}
            </div>
            
            <!-- タグ使用頻度 -->
            <div class="stats-section" style="background: var(--bg-sidebar); padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: var(--pink); display: flex; align-items: center; gap: 10px; font-size: 1.4em; font-weight: bold; padding-bottom: 12px; border-bottom: 2px solid var(--pink);">
                    <i class="fas fa-tags"></i> タグ使用頻度TOP10
                </h3>
                ${generatePopularTagsHtml(stats.popularTags)}
            </div>
            
            <!-- 最も議論されている投稿 -->
            <div class="stats-section" style="background: var(--bg-sidebar); padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: var(--cyan); display: flex; align-items: center; gap: 10px; font-size: 1.4em; font-weight: bold; padding-bottom: 12px; border-bottom: 2px solid var(--cyan);">
                    <i class="fas fa-fire"></i> 最も議論されている投稿TOP5
                </h3>
                ${generateMostDiscussedPostsHtml(stats.mostDiscussedPosts)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // ソートセレクターの表示/非表示を更新
    updateSortSelector();
    
    closeSidebarOnNavigation();
}

/**
 * 統計データを収集
 */
function collectStats() {
    const stats = {
        totalPosts: allData.posts.length,
        totalLikes: 0,
        totalComments: allData.comments ? allData.comments.length : 0,
        totalRoutes: allData.routes ? allData.routes.length : 0,
        popularRoutes: [],
        popularElites: [],
        popularTags: [],
        mostDiscussedPosts: []
    };
    
    // いいね数の合計
    allData.posts.forEach(p => {
        stats.totalLikes += (p.likes || 0);
    });
    
    // 人気ルートの集計（投稿数 + いいね数）
    const routeStats = {};
    allData.posts.forEach(p => {
        const key = `${p.region}|${p.route}`;
        if (!routeStats[key]) {
            routeStats[key] = {
                region: p.region,
                route: p.route,
                postCount: 0,
                likeCount: 0,
                score: 0
            };
        }
        routeStats[key].postCount++;
        routeStats[key].likeCount += (p.likes || 0);
        routeStats[key].score = routeStats[key].postCount * 10 + routeStats[key].likeCount;
    });
    
    stats.popularRoutes = Object.values(routeStats)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    // 精鋭タグの集計
    const eliteStats = {};
    
    allData.posts.forEach(p => {
        // eliteEnemiesプロパティをチェック
        if (p.eliteEnemies) {
            let elites = [];
            
            // 配列の場合
            if (Array.isArray(p.eliteEnemies)) {
                elites = p.eliteEnemies;
            }
            // 文字列の場合（カンマ区切り）
            else if (typeof p.eliteEnemies === 'string' && p.eliteEnemies.trim()) {
                elites = p.eliteEnemies.split(',').map(e => e.trim()).filter(e => e);
            }
            
            elites.forEach(elite => {
                if (!eliteStats[elite]) {
                    eliteStats[elite] = { name: elite, count: 0 };
                }
                eliteStats[elite].count++;
            });
        }
        
        // tagsの中からも精鋭タグを探す（availableEliteImagesと照合）
        if (p.tags && typeof availableEliteImages !== 'undefined' && Array.isArray(availableEliteImages)) {
            const tags = p.tags.split(',').map(t => t.trim()).filter(t => t);
            tags.forEach(tag => {
                // 精鋭画像リストに該当する名前があれば精鋭タグとみなす
                const hasEliteImage = availableEliteImages.some(imgName => {
                    const cleanName = imgName.replace(/^アイコン_/, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
                    return cleanName.toLowerCase().includes(tag.toLowerCase()) || 
                           tag.toLowerCase().includes(cleanName.toLowerCase());
                });
                
                if (hasEliteImage) {
                    if (!eliteStats[tag]) {
                        eliteStats[tag] = { name: tag, count: 0 };
                    }
                    eliteStats[tag].count++;
                }
            });
        }
    });
    
    stats.popularElites = Object.values(eliteStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    // タグ使用頻度
    const tagStats = {};
    allData.posts.forEach(p => {
        if (p.tags) {
            const tags = p.tags.split(',').map(t => t.trim()).filter(t => t);
            tags.forEach(tag => {
                if (!tagStats[tag]) {
                    tagStats[tag] = { name: tag, count: 0 };
                }
                tagStats[tag].count++;
            });
        }
    });
    
    stats.popularTags = Object.values(tagStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    // 最も議論されている投稿（コメント数順）
    const postsWithCommentCount = allData.posts.map(p => {
        const commentCount = allData.comments ? allData.comments.filter(c => c.postId === p.id).length : 0;
        return { ...p, commentCount };
    });
    
    stats.mostDiscussedPosts = postsWithCommentCount
        .sort((a, b) => b.commentCount - a.commentCount)
        .slice(0, 5);
    
    return stats;
}

/**
 * 人気ルートのHTMLを生成
 */
function generatePopularRoutesHtml(routes) {
    if (routes.length === 0) {
        return '<p style="color: var(--comment);">まだデータがないのよ。</p>';
    }
    
    let html = '<div class="ranking-list">';
    routes.forEach((route, index) => {
        const regionClass = getRegionClass(route.region);
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
        const routeJs = route.route.replace(/'/g, "\\'");
        const regionJs = route.region.replace(/'/g, "\\'");
        
        html += `
            <div class="ranking-item" style="display: flex; align-items: center; padding: 18px 15px; margin-bottom: 12px; background: var(--bg-main); border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--border-color);" onclick="filterPosts('${regionJs}', '${routeJs}')">
                <div style="font-size: 2em; width: 50px; text-align: center; font-weight: bold;">${medal}</div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span class="badge ${regionClass}">${escapeHtml(route.region)}</span>
                        <span style="font-weight: bold; font-size: 1.1em; color: var(--fg-primary);">${escapeHtml(route.route)}</span>
                    </div>
                    <div style="font-size: 0.95em; color: var(--fg-primary);">
                        <i class="fas fa-file-alt" style="color: var(--cyan);"></i> ${route.postCount}件 | <i class="fas fa-heart" style="color: var(--pink);"></i> ${route.likeCount}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * よく使われる精鋭のHTMLを生成
 */
function generatePopularElitesHtml(elites) {
    if (elites.length === 0) {
        return '<p style="color: var(--comment);">まだ精鋭タグが使われていないわ。</p>';
    }
    
    let html = '<div class="ranking-list">';
    elites.forEach((elite, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
        const eliteJs = elite.name.replace(/'/g, "\\'");
        
        let imageUrl = null;
        
        // getEliteEnemyImagePath関数を使う
        if (typeof getEliteEnemyImagePath === 'function') {
            imageUrl = getEliteEnemyImagePath(elite.name);
        }
        
        // 画像URLが見つからない場合、availableEliteImagesから直接探す
        if (!imageUrl && typeof availableEliteImages !== 'undefined' && Array.isArray(availableEliteImages)) {
            const eliteNameLower = elite.name.toLowerCase();
            const matchedImage = availableEliteImages.find(imgName => {
                const cleanName = imgName.replace(/^アイコン_/, '').replace(/\.(jpg|jpeg|png|webp)$/i, '').toLowerCase();
                return cleanName.includes(eliteNameLower) || eliteNameLower.includes(cleanName);
            });
            
            if (matchedImage) {
                const encodedFileName = encodeURIComponent(matchedImage);
                imageUrl = `assets/images/eliteenemies/${encodedFileName}`;
            }
        }
        
        html += `
            <div class="ranking-item" style="display: flex; align-items: center; padding: 18px 15px; margin-bottom: 12px; background: var(--bg-main); border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--border-color);" onclick="searchByTag('${eliteJs}')">
                <div style="font-size: 2em; width: 50px; text-align: center; font-weight: bold; flex-shrink: 0;">${medal}</div>
                <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; background: var(--bg-sidebar); border-radius: 8px; border: 2px solid var(--border-color);">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${escapeHtml(elite.name)}" style="width: 56px; height: 56px; object-fit: contain; border-radius: 6px;">` : 
                        '<i class="fas fa-dragon" style="font-size: 2em; color: var(--purple);"></i>'
                    }
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; font-size: 1.1em; color: var(--fg-primary); margin-bottom: 8px;">${escapeHtml(elite.name)}</div>
                    <div style="font-size: 0.95em; color: var(--fg-primary);">
                        <i class="fas fa-chart-bar" style="color: var(--purple);"></i> ${elite.count}回使用
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * タグ使用頻度のHTMLを生成
 */
function generatePopularTagsHtml(tags) {
    if (tags.length === 0) {
        return '<p style="color: var(--comment);">まだタグがないのよ。</p>';
    }
    
    const maxCount = tags[0].count;
    
    let html = '<div class="tag-frequency-list">';
    tags.forEach((tag, index) => {
        const percentage = (tag.count / maxCount) * 100;
        const tagJs = tag.name.replace(/'/g, "\\'");
        
        html += `
            <div class="tag-frequency-item" style="margin-bottom: 18px; cursor: pointer; padding: 12px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color); transition: all 0.2s ease;" onclick="searchByTag('${tagJs}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: bold; font-size: 1.05em; color: var(--fg-primary);">${index + 1}. ${escapeHtml(tag.name)}</span>
                    <span style="color: var(--cyan); font-size: 1em; font-weight: 600;">${tag.count}回</span>
                </div>
                <div style="background: var(--bg-sidebar); height: 12px; border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);">
                    <div style="background: linear-gradient(90deg, var(--cyan), var(--purple)); height: 100%; width: ${percentage}%; transition: width 0.5s ease; border-radius: 6px;"></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * 最も議論されている投稿のHTMLを生成
 */
function generateMostDiscussedPostsHtml(posts) {
    if (posts.length === 0) {
        return '<p style="color: var(--comment);">まだコメントがないのよ。</p>';
    }
    
    let html = '<div class="discussed-posts-list">';
    posts.forEach((post, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
        const postIdJs = post.id.replace(/'/g, "\\'");
        const regionClass = getRegionClass(post.region);
        
        html += `
            <div class="discussed-post-item" style="display: flex; align-items: flex-start; padding: 18px 15px; margin-bottom: 12px; background: var(--bg-main); border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--border-color);" onclick="expandCard('${postIdJs}')">
                <div style="font-size: 1.8em; width: 50px; text-align: center; font-weight: bold; padding-top: 4px;">${medal}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 1.15em; color: var(--fg-primary); margin-bottom: 10px; line-height: 1.4;">${escapeHtml(post.title || '無題')}</div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span class="badge ${regionClass}">${escapeHtml(post.region)}</span>
                        <span style="color: var(--fg-primary); font-size: 0.95em;">${escapeHtml(post.route)}</span>
                    </div>
                    <div style="font-size: 0.95em; color: var(--fg-primary);">
                        <i class="fas fa-comments" style="color: var(--purple);"></i> ${post.commentCount}件 | <i class="fas fa-heart" style="color: var(--pink);"></i> ${post.likes || 0}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

