// ============================================
// ユーティリティ関数
// ============================================

/**
 * HTMLエスケープ（XSS対策）
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * URLの安全なエスケープ
 */
function escapeUrl(url) {
    if (!url) return '';
    return escapeHtml(url).replace(/'/g, '&#39;');
}

/**
 * デバウンス処理
 */
let searchDebounceTimer = null;
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
                return response;
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
}

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

/**
 * Markdownパース（詳細版）
 */
function parseMarkdown(text) {
    if (!text) return '';
    
    // コードブロックを一時的に置き換え
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
    
    // 改行を<br>に変換
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

/**
 * リージョン名に応じたCSSクラス名を取得
 */
function getRegionClass(region) {
    if (!region) return 'badge-default';
    
    const regionLower = region.toLowerCase();
    const regionMap = [
        { keywords: ['層岩', '巨淵', 'chasm'], class: 'badge-chasm' },
        { keywords: ['淵下宮', 'enkanomiya'], class: 'badge-enkanomiya' },
        { keywords: ['鶴観', 'tsurumi'], class: 'badge-tsurumi' },
        { keywords: ['沈玉', 'chenyu', '谷'], class: 'badge-chenyu' },
        { keywords: ['モンド', 'mondstadt'], class: 'badge-mondstadt' },
        { keywords: ['璃月', 'liyue'], class: 'badge-liyue' },
        { keywords: ['稲妻', 'inazuma'], class: 'badge-inazuma' },
        { keywords: ['スメール', 'sumeru'], class: 'badge-sumeru' },
        { keywords: ['フォンテーヌ', 'fontaine'], class: 'badge-fontaine' },
        { keywords: ['ナタ', 'natlan'], class: 'badge-natlan' },
        { keywords: ['スネージナヤ', 'snezhnaya'], class: 'badge-snezhnaya' },
        { keywords: ['ナド', 'クライ', 'nadoh', 'kuraibōn'], class: 'badge-nadoh' }
    ];
    
    for (const { keywords, class: className } of regionMap) {
        if (keywords.some(keyword => regionLower.includes(keyword))) {
            return className;
        }
    }
    
    return 'badge-default';
}

