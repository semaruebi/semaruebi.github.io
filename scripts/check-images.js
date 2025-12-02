#!/usr/bin/env node

/**
 * 画像存在確認スクリプト
 * 参照されている画像ファイルが実際に存在するかチェックするのよ💉
 */

const fs = require('fs');
const path = require('path');

function checkImages() {
  console.log('🖼️  画像存在確認開始...\n');

  const errors = [];
  const warnings = [];

  // index.html から参照されている画像をチェック
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  const imgRegex = /(?:src|href)=["']([^"']*\.(?:png|jpg|jpeg|gif|webp|svg))["']/gi;
  const matches = [...html.matchAll(imgRegex)];
  
  console.log(`📄 index.htmlから ${matches.length} 個の画像参照を検出\n`);

  for (const match of matches) {
    const imagePath = match[1];
    
    // 外部URLはスキップ
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      continue;
    }

    const fullPath = path.join(__dirname, '..', imagePath);
    
    if (!fs.existsSync(fullPath)) {
      errors.push(`❌ 画像が見つからないわ: ${imagePath}`);
    }
  }

  // assets/images/eliteenemies/ の画像数をチェック
  const eliteEnemiesDir = path.join(__dirname, '..', 'assets', 'images', 'eliteenemies');
  
  if (fs.existsSync(eliteEnemiesDir)) {
    const eliteImages = fs.readdirSync(eliteEnemiesDir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    
    console.log(`🐉 精鋭画像: ${eliteImages.length} 枚\n`);

    // elite-enemy-images.js と一致チェック
    const eliteImagesJsPath = path.join(__dirname, '..', 'js', 'elite-enemy-images.js');
    
    if (fs.existsSync(eliteImagesJsPath)) {
      const eliteImagesJs = fs.readFileSync(eliteImagesJsPath, 'utf-8');
      const jsImages = [...eliteImagesJs.matchAll(/['"]([^'"]+\.(?:png|jpg|jpeg|webp))['"/gi)];
      
      if (jsImages.length !== eliteImages.length) {
        warnings.push(`⚠️  elite-enemy-images.js の更新が必要かも（実際: ${eliteImages.length}枚、JS: ${jsImages.length}枚）`);
      }
    }
  }

  // シグウィン画像をチェック
  const sigewinneDir = path.join(__dirname, '..', 'assets', 'images', 'sigewinne');
  
  if (fs.existsSync(sigewinneDir)) {
    const sigewinneImages = fs.readdirSync(sigewinneDir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    
    console.log(`💉 シグウィン画像: ${sigewinneImages.length} 枚\n`);
  }

  // 結果表示
  if (warnings.length > 0) {
    console.log('警告:\n');
    warnings.forEach(w => console.log(w));
    console.log();
  }

  if (errors.length > 0) {
    console.error('エラー:\n');
    errors.forEach(e => console.error(e));
    console.error(`\n合計 ${errors.length} 個のエラーが見つかったわ\n`);
    return 1;
  }

  console.log('✅ すべての画像が正常に存在してるわ！完璧なのよ💉\n');
  return 0;
}

process.exit(checkImages());

