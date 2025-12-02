#!/usr/bin/env node

/**
 * HTML バリデーションスクリプト
 * index.html の構文チェックを行うのよ💉
 */

const { HtmlValidate } = require('html-validate');
const fs = require('fs');
const path = require('path');

const htmlValidate = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'no-inline-style': 'off',
    'require-sri': 'off',
    'no-trailing-whitespace': 'off',
    'attr-quotes': 'error',
    'doctype-html': 'error',
    'no-dup-id': 'error',
    'no-dup-attr': 'error',
  },
});

async function validateHtml() {
  console.log('🔍 HTMLバリデーション開始...\n');

  const htmlPath = path.join(__dirname, '..', 'index.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ index.html が見つからないわ！');
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const report = await htmlValidate.validateString(html, htmlPath);

  if (report.valid) {
    console.log('✅ HTMLバリデーション成功！完璧なのよ💉\n');
    return 0;
  }

  console.error('❌ HTMLエラーが見つかったわ：\n');
  
  for (const result of report.results) {
    for (const message of result.messages) {
      console.error(`  Line ${message.line}:${message.column} - ${message.message}`);
      console.error(`    Rule: ${message.ruleId}`);
      console.error();
    }
  }

  console.error(`合計 ${report.errorCount} 個のエラー、${report.warningCount} 個の警告\n`);
  return 1;
}

validateHtml()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('❌ バリデーション中にエラーが発生したわ：', err);
    process.exit(1);
  });

