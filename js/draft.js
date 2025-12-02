// ============================================
// 下書き保存機能
// ============================================

const DRAFT_KEY = 'post-draft';
const DRAFT_TIMESTAMP_KEY = 'post-draft-timestamp';
const AUTO_SAVE_DELAY = 2000; // 2秒後に自動保存

/**
 * 下書きを保存
 */
function saveDraft() {
    // 編集モード中は下書き保存しない
    if (editingPostId) return;
    
    const draft = {
        title: document.getElementById('input-title')?.value || '',
        content: document.getElementById('input-content')?.value || '',
        region: document.getElementById('input-region')?.value || '',
        route: document.getElementById('input-route')?.value || '',
        password: '', // セキュリティのため、パスワードは保存しない
        tags: {
            reg: getSelectedRadio('tag_reg'),
            cost: getSelectedRadio('tag_cost'),
            marker: getSelectedRadio('tag_marker'),
            teamSize: getSelectedRadio('tag_team_size'),
            other: getSelectedCheckboxes('tag_other')
        },
        eliteEnemies: selectedEliteEnemies || [],
        freeTag1: document.getElementById('tag-free-1')?.value || '',
        freeTag2: document.getElementById('tag-free-2')?.value || ''
    };
    
    // すべて空の場合は保存しない
    if (!draft.title && !draft.content && draft.eliteEnemies.length === 0) {
        clearDraft();
        return;
    }
    
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
    
    updateDraftIndicator(true);
}

/**
 * 下書きを復元
 */
function loadDraft() {
    const draftStr = localStorage.getItem(DRAFT_KEY);
    if (!draftStr) return false;
    
    try {
        const draft = JSON.parse(draftStr);
        const timestamp = parseInt(localStorage.getItem(DRAFT_TIMESTAMP_KEY) || '0');
        const age = Date.now() - timestamp;
        const ageHours = Math.floor(age / (1000 * 60 * 60));
        
        // 7日以上前の下書きは削除
        if (age > 7 * 24 * 60 * 60 * 1000) {
            clearDraft();
            return false;
        }
        
        // 下書きが存在する場合、確認ダイアログを表示
        const timeStr = ageHours < 1 
            ? '1時間以内' 
            : ageHours < 24 
                ? `${ageHours}時間前` 
                : `${Math.floor(ageHours / 24)}日前`;
        
        if (!confirm(`${timeStr}の下書きがあるわよ💉\n復元する？`)) {
            return false;
        }
        
        // フォームを開く
        const form = document.getElementById('post-form-container');
        if (form && form.classList.contains('closed')) {
            togglePostForm();
        }
        
        // フォームに復元
        if (draft.title) document.getElementById('input-title').value = draft.title;
        if (draft.content) document.getElementById('input-content').value = draft.content;
        if (draft.region) {
            document.getElementById('input-region').value = draft.region;
            // リージョン変更イベントをトリガーしてルートを更新
            const event = new Event('change');
            document.getElementById('input-region').dispatchEvent(event);
            
            // ルートを復元（リージョン変更後に実行）
            setTimeout(() => {
                if (draft.route) document.getElementById('input-route').value = draft.route;
            }, 100);
        }
        
        // タグを復元
        if (draft.tags) {
            setSelectedRadio('tag_reg', draft.tags.reg);
            setSelectedRadio('tag_cost', draft.tags.cost);
            setSelectedRadio('tag_marker', draft.tags.marker);
            setSelectedRadio('tag_team_size', draft.tags.teamSize);
            setSelectedCheckboxes('tag_other', draft.tags.other || []);
        }
        
        // フリータグを復元
        if (draft.freeTag1) document.getElementById('tag-free-1').value = draft.freeTag1;
        if (draft.freeTag2) document.getElementById('tag-free-2').value = draft.freeTag2;
        
        // 精鋭敵を復元
        if (draft.eliteEnemies && draft.eliteEnemies.length > 0) {
            selectedEliteEnemies = draft.eliteEnemies;
            updateSelectedEliteEnemiesDisplay();
        }
        
        updateDraftIndicator(true);
        showToast('下書きを復元したわよ💉', 'success');
        
        return true;
    } catch (err) {
        console.error('Draft load error:', err);
        clearDraft();
        return false;
    }
}

/**
 * 下書きをクリア
 */
function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    updateDraftIndicator(false);
}

/**
 * 下書きインジケーターを更新
 */
function updateDraftIndicator(hasDraft) {
    let indicator = document.getElementById('draft-indicator');
    
    if (!indicator && hasDraft) {
        // インジケーターを作成
        indicator = document.createElement('div');
        indicator.id = 'draft-indicator';
        indicator.className = 'draft-indicator';
        indicator.innerHTML = `
            <i class="fas fa-save"></i>
            <span>下書き保存済み</span>
            <button onclick="event.stopPropagation(); clearDraft();" class="draft-clear-btn" title="下書きを削除" aria-label="下書きを削除">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const postHeader = document.querySelector('.post-header');
        if (postHeader) {
            postHeader.after(indicator);
        }
    } else if (indicator && !hasDraft) {
        indicator.remove();
    }
}

/**
 * 自動保存をセットアップ
 */
function setupAutoSave() {
    const inputs = [
        'input-title',
        'input-content',
        'input-region',
        'input-route',
        'tag-free-1',
        'tag-free-2'
    ];
    
    const debouncedSave = debounce(saveDraft, AUTO_SAVE_DELAY);
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debouncedSave);
            element.addEventListener('change', debouncedSave);
        }
    });
    
    // ラジオボタンとチェックボックス
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        if (input.name && input.name.startsWith('tag_')) {
            input.addEventListener('change', debouncedSave);
        }
    });
}

// ============================================
// ヘルパー関数
// ============================================

function getSelectedRadio(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : '';
}

function getSelectedCheckboxes(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function setSelectedRadio(name, value) {
    if (!value) return;
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
}

function setSelectedCheckboxes(name, values) {
    if (!values || values.length === 0) return;
    values.forEach(value => {
        const checkbox = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

