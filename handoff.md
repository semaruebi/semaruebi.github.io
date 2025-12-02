# 💉 エリかるて！ 開発カルテ

## 📋 プロジェクト概要
原神の精鋭狩りRTA（Real Time Attack）のための知識共有プラットフォームなのよ。
ユーザーはルートごとのコツや動画、画像を投稿できて、コメントで議論もできるわ。

## 🛠️ 技術スタック
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No Framework)
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Spreadsheet
- **Storage**: Google Drive（画像保存用）
- **Hosting**: GitHub Pages

## 📁 ファイル構造（v3.0 - リファクタリング後）

### JavaScriptファイル（js/）
| ファイル | 役割 | 主要な関数・変数 |
|---------|------|----------------|
| `config.js` | 設定管理 | `CONFIG`（GAS API URL、リトライ設定等） |
| `utils.js` | ユーティリティ | `escapeHtml()`, `escapeUrl()`, `debounce()`, `fetchWithRetry()`, `showToast()`, `parseMarkdown()`, `getRegionClass()` |
| `theme.js` | テーマ管理 | `cycleTheme()`, `loadTheme()` |
| `api.js` | API通信 | `allData`（グローバル変数）, `fetchData()`, `submitComment()`, `submitContact()` |
| `modal.js` | モーダル | `openImageModal()`, `closeImageModal()`, `openAboutModal()`, `openContactForm()`, `openRouteDetailModal()` |
| `search.js` | 検索機能 | `availableTags`（グローバル変数）, `searchType`（グローバル変数）, `handleSearchInput()`, `filterBySearch()`, `searchByTag()` |
| `image.js` | 画像処理 | `selectedImageFiles`, `existingImageUrls`, `handleImagePreview()`, `addImageFiles()`, `removeImageFile()` |
| `ui.js` | UI操作 | `currentFilter`, `openRegions`, `homeSections`, `myLikedPosts`, `myLikedComments`, `TAG_TYPES`, `renderSidebar()`, `renderHome()`, `toggleLike()`, `toggleCommentLike()` |
| `card.js` | カード生成 | `createCardHtml()`, `createVideoHtml()`, `createImageHtml()`, `createTagsHtml()`, `renderCommentTree()` |
| `post.js` | 投稿処理 | `postData()`, `editPost()`, `deletePost()`, `updatePost()`, `setupFormOptions()` |
| `main.js` | 初期化 | `window.onload`, `setupDragAndDrop()`, `handleDrop()` |

### CSSファイル（css/）
| ファイル | 役割 | 主要なスタイル |
|---------|------|--------------|
| `variables.css` | CSS変数 | `:root`, `[data-theme="light"]`, `[data-theme="sigewinne"]` |
| `base.css` | ベーススタイル | `body`, `main`, スクロールバー、トースト通知、フッター |
| `layout.css` | レイアウト | `aside`, `header`, `.sidebar-header`, `.nav-list`, `.search-box` |
| `components.css` | コンポーネント | `.card`, `.badge`, `.button`, `.post-area`, `.tag-badge`, `.comment-card` |
| `modal.css` | モーダル | `.image-modal`, `.about-modal`, `.contact-modal`, `.route-detail-modal` |
| `responsive.css` | レスポンシブ | `@media (max-width: 900px)`, モバイル対応スタイル |

### グローバル変数の依存関係
```
config.js (CONFIG)
  ↓
utils.js (retryCount, fetchWithRetry, showToast等)
  ↓
api.js (allData) ← 他のファイルから参照
  ↓
ui.js (currentFilter, myLikedPosts, myLikedComments, TAG_TYPES等) ← card.jsから参照
  ↓
card.js, post.js, search.js, image.js, modal.js
  ↓
main.js (window.onload)
```

## 🔧 開発時の注意点

### 1. ファイルの読み込み順序
`index.html`での読み込み順序は重要です：
1. `js/config.js` - 最初に読み込む（CONFIG定義）
2. `js/utils.js` - CONFIGを使用
3. `js/theme.js` - CONFIGを使用しない
4. `js/api.js` - allDataを定義、CONFIGを使用
5. `js/modal.js` - CONFIGを使用しない
6. `js/search.js` - availableTags, searchTypeを定義
7. `js/image.js` - CONFIGを使用
8. `js/ui.js` - グローバル変数を定義（TAG_TYPES等）
9. `js/card.js` - TAG_TYPES, allData, myLikedPosts等を使用
10. `js/post.js` - CONFIGを使用
11. `js/main.js` - 最後に読み込む（window.onload）

### 2. グローバル変数の共有
- `allData`: `api.js`で定義、`card.js`, `ui.js`で使用
- `currentFilter`, `myLikedPosts`, `myLikedComments`: `ui.js`で定義、`card.js`で使用
- `TAG_TYPES`: `ui.js`で定義、`card.js`で使用
- `availableTags`, `searchType`: `search.js`で定義
- `retryCount`: `utils.js`で定義、`fetchWithRetry()`内で使用

### 3. 関数の依存関係
- `fetchData()`: `api.js`で定義、`main.js`で呼び出し
- `showToast()`: `utils.js`で定義、全ファイルで使用可能
- `escapeHtml()`, `escapeUrl()`: `utils.js`で定義、全ファイルで使用可能
- `parseMarkdown()`: `utils.js`で定義、`card.js`, `modal.js`で使用

### 4. CSS変数の使用
すべての色やサイズは`css/variables.css`で定義されたCSS変数を使用：
- `var(--bg-main)`, `var(--bg-sidebar)`, `var(--fg-primary)`
- `var(--cyan)`, `var(--pink)`, `var(--purple)`等
- `var(--card-radius)`, `var(--shadow)`等

### 5. 新しい機能を追加する場合
1. 適切なファイルに追加（機能ごとに分かれている）
2. グローバル変数が必要な場合は、適切なファイルで定義
3. 他のファイルから参照する場合は、読み込み順序を確認
4. CSSを追加する場合は、適切なCSSファイルに追加

### 6. デバッグ方法
- ブラウザの開発者ツール（F12）でコンソールエラーを確認
- ネットワークタブでAPIリクエストを確認
- `console.log()`でデバッグ（本番環境では削除推奨）

### 7. パフォーマンス最適化
- 検索入力はデバウンス処理（300ms）
- 画像は`loading="lazy"`属性を使用
- 不要な再レンダリングを避ける

## 🗄️ データ構造

### Google Spreadsheet（想定構造）
- **routesシート**: 地域・ルート情報（region, route, imageUrl, description）
- **postsシート**: 投稿データ（id, region, route, content, imageUrl, tags, likes, timestamp）
- **commentsシート**: コメントデータ（id, postId, parentId, content, likes, timestamp）

### タグシステム
- **必須タグ（レギュレーション）**: NPuI, PuA, PuI, 全般
- **必須タグ（Cost）**: 制限なし、低凸、Cost全般
- **オプションタグ**: 誘導、弓起動、処理法、位置調整、コツ、注意点
- **自由タグ**: 最大2つ（ユーザー入力）

## 🚀 デプロイ方法

### GitHub Pages
1. リポジトリをGitHubにプッシュ
2. Settings > Pagesでソースブランチを選択
3. ルートディレクトリを選択して保存
4. `https://[username].github.io/[repository-name]/`でアクセス可能

### GAS側の設定
- GASプロジェクトでWebアプリとして公開（実行ユーザー: 自分、アクセス権限: 全員）
- 公開URLを`js/config.js`の`CONFIG.GAS_API_URL`に設定

## ⚠️ 既知の問題・制限事項

1. **CORS制限**: GAS APIは`mode: "no-cors"`で送信しているため、レスポンスの詳細なエラーハンドリングが困難
2. **レート制限**: 連続で更新ボタンを押すとGAS側でエラーになる可能性あり
3. **画像サイズ**: 2MB制限はフロントエンドのみ。GAS側でも検証推奨
4. **セキュリティ**: 削除パスワードは平文で送信（GAS側で検証）

## 🔮 今後の拡張候補

- ユーザー認証機能
- 投稿の並び替え（日付、いいね数など）
- エクスポート機能（CSV/JSON）
- 画像のリサイズ機能
- オフライン対応（Service Worker）

## 🔄 改修履歴

### v3.0 - 大規模リファクタリング（2025年）
- ✅ JavaScriptファイルを10個に分割
  - `utils.js`: ユーティリティ関数
  - `theme.js`: テーマ管理
  - `api.js`: API通信
  - `modal.js`: モーダル関連
  - `search.js`: 検索機能
  - `image.js`: 画像処理
  - `ui.js`: UI操作
  - `card.js`: カード生成
  - `post.js`: 投稿処理
  - `main.js`: 初期化
- ✅ CSSファイルを6個に分割
  - `variables.css`: CSS変数とテーマ定義
  - `base.css`: ベーススタイル
  - `layout.css`: レイアウト
  - `components.css`: コンポーネント
  - `modal.css`: モーダル関連
  - `responsive.css`: レスポンシブ
- ✅ コードの可読性と保守性を大幅に向上
- ✅ ファイル構造の整理と最適化

### v2.0 - 包括的改修（2025年）
- ✅ GAS API URLを`config.js`に分離（環境変数化）
- ✅ XSS対策の強化
- ✅ リトライ機能の実装
- ✅ アクセシビリティ改善
- ✅ パフォーマンス改善
- ✅ トースト通知システムの実装

---
