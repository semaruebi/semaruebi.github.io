// ============================================
// 精鋭選択機能
// ============================================

// 選択された精鋭（投稿フォーム用）
let selectedEliteEnemies = [];

/**
 * 精鋭選択モーダルを開く
 */
function openEliteEnemyModal() {
    const modal = document.getElementById('elite-enemy-modal');
    const list = document.getElementById('elite-enemy-list');
    
    if (!modal || !list) return;
    
    // 精鋭データがまだ読み込まれていない場合
    if (!allData.eliteEnemies || allData.eliteEnemies.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--comment);">
                <img src="assets/images/sigewinne/ofuton.webp" alt="リラックス中のシグウィン" style="width: 100px; height: 100px; object-fit: contain; margin: 0 auto 20px; display: block;">
                <p>精鋭データが読み込まれていないわ💦</p>
                <p style="font-size: 0.9em;">GAS側のコードを更新してデプロイし直してね。</p>
            </div>
        `;
        openModal('elite-enemy-modal');
        return;
    }
    
    // 精鋭リストを生成
    let html = '';
    allData.eliteEnemies.forEach(category => {
        html += `
            <div class="elite-category">
                <h4 class="elite-category-title">${escapeHtml(category.category)}</h4>
                <div class="elite-enemies-grid">
        `;
        
        category.enemies.forEach(enemy => {
            const isSelected = selectedEliteEnemies.includes(enemy);
            html += `
                <button 
                    type="button"
                    class="elite-enemy-item ${isSelected ? 'selected' : ''}" 
                    onclick="toggleEliteEnemy('${escapeHtml(enemy).replace(/'/g, "\\'")}')"
                    data-enemy="${escapeHtml(enemy)}"
                >
                    ${escapeHtml(enemy)}
                </button>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
    openModal('elite-enemy-modal');
}

/**
 * 精鋭選択モーダルを閉じる
 */
function closeEliteEnemyModal() {
    closeModal('elite-enemy-modal');
    updateSelectedEliteEnemiesDisplay();
}

/**
 * 精鋭の選択/選択解除をトグル
 */
function toggleEliteEnemy(enemy) {
    const index = selectedEliteEnemies.indexOf(enemy);
    const btn = document.querySelector(`.elite-enemy-item[data-enemy="${enemy}"]`);
    
    if (index > -1) {
        // 選択解除
        selectedEliteEnemies.splice(index, 1);
        if (btn) btn.classList.remove('selected');
    } else {
        // 選択
        selectedEliteEnemies.push(enemy);
        if (btn) btn.classList.add('selected');
    }
}

/**
 * 選択された精鋭の表示を更新
 */
function updateSelectedEliteEnemiesDisplay() {
    const container = document.getElementById('selected-elite-enemies');
    if (!container) return;
    
    if (selectedEliteEnemies.length === 0) {
        container.innerHTML = '<p style="color: var(--comment); font-size: 0.9em; margin: 0;">まだ選択されていないわ</p>';
        return;
    }
    
    let html = '';
    selectedEliteEnemies.forEach(enemy => {
        html += `
            <span class="selected-elite-tag">
                ${escapeHtml(enemy)}
                <button type="button" onclick="removeEliteEnemy('${escapeHtml(enemy).replace(/'/g, "\\'")}')" aria-label="削除" class="remove-elite-btn">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </span>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * 選択された精鋭を削除
 */
function removeEliteEnemy(enemy) {
    const index = selectedEliteEnemies.indexOf(enemy);
    if (index > -1) {
        selectedEliteEnemies.splice(index, 1);
        updateSelectedEliteEnemiesDisplay();
    }
}

/**
 * 精鋭選択をクリア（編集キャンセル時など）
 */
function clearSelectedEliteEnemies() {
    selectedEliteEnemies = [];
    updateSelectedEliteEnemiesDisplay();
}

/**
 * 編集時に既存の精鋭タグを復元
 */
function loadEliteEnemiesForEdit(eliteEnemiesStr) {
    if (!eliteEnemiesStr) {
        selectedEliteEnemies = [];
    } else {
        selectedEliteEnemies = eliteEnemiesStr.split(',').map(e => e.trim()).filter(e => e);
    }
    updateSelectedEliteEnemiesDisplay();
}

