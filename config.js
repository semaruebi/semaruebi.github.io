// 設定ファイル
// GAS API URLをここに設定してください
const CONFIG = {
    GAS_API_URL: "https://script.google.com/macros/s/AKfycbxsZcPaU9gcpqjbAT2XR1A3UX306uIAQHA_NEhZpn5UQMlztTOqIgHUEgkzXj6myLeMng/exec",
    
    // リトライ設定
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ミリ秒
    
    // デバウンス設定
    SEARCH_DEBOUNCE: 300, // ミリ秒
    
    // 画像設定
    MAX_IMAGES: 4,
    MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
    
    // トースト通知設定
    TOAST_DURATION: 3000, // ミリ秒
};

