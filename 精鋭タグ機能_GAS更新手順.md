# 精鋭タグ機能 - GAS更新手順 💉

シグウィンが手順を説明するわよ！

## 📋 前提条件

スプレッドシートに **`EEs`** という名前のシートを作成して、以下の形式でデータを入力してあること：

| A列（中分類） | B列（要素1） | C列（要素2） | D列（要素3） | ...  |
|--------------|-------------|-------------|-------------|------|
| 魔偶        | 幼岩龍蜥     | 遺跡守衛     | 丘丘岩兜王   | ...  |
| 浮遊         | 深海龍蜥     | 淵下深淵法師  | ...         | ...  |
| 獣類         | フライム     | ...         | ...         | ...  |

## 🔧 GAS コード更新手順

### 1. Google Apps Scriptエディタを開く

スプレッドシートから **拡張機能 > Apps Script** を開く

### 2. `doGet` 関数を修正

#### 📍 修正箇所1: コメント取得の後に追加

```javascript
// 3. コメント取得（安全装置付き）の後に、以下を追加：

  // 4. 精鋭データ取得（EEsシート）
  let eliteEnemies = [];
  const eeSheet = ss.getSheetByName("EEs");
  if (eeSheet && eeSheet.getLastRow() > 1) {
    const eeData = eeSheet.getDataRange().getValues();
    // 1行目はヘッダーとしてスキップ
    for (let i = 1; i < eeData.length; i++) {
      const category = eeData[i][0]; // A列: 中分類
      if (!category) continue;
      
      const enemies = [];
      // B列以降の要素を取得
      for (let j = 1; j < eeData[i].length; j++) {
        if (eeData[i][j]) {
          enemies.push(eeData[i][j]);
        }
      }
      
      eliteEnemies.push({
        category: category,
        enemies: enemies
      });
    }
  }
```

#### 📍 修正箇所2: return文を変更

```javascript
// 元の return文を以下に変更：
  return createResponse({ 
    routes: routes, 
    posts: posts, 
    comments: comments,
    eliteEnemies: eliteEnemies  // 追加
  });
```

### 3. デプロイ

1. **デプロイ > 新しいデプロイ** をクリック
2. 説明に「精鋭タグ機能追加」など記入
3. **デプロイ** をクリック

## ✅ 動作確認

1. フロントエンド（GitHub Pages）をリロード
2. ブラウザのコンソール（F12）を開く
3. データ取得時に `eliteEnemiesCount: X` が表示されることを確認
4. 投稿フォームの「精鋭を選択する」ボタンが機能することを確認

## 🎯 期待される動作

- 投稿フォームに「精鋭（任意）」セクションが表示される
- 「精鋭を選択する」ボタンをクリックするとモーダルが開く
- 中分類ごとに精鋭が表示され、選択/解除できる
- 選択した精鋭がタグとして投稿に保存される
- カードに精鋭タグが表示される

## 💡 トラブルシューティング

### モーダルに「精鋭データが読み込まれていないわ💦」と表示される

- GAS側のコードが正しく更新されているか確認
- デプロイが完了しているか確認
- `EEs`シートが存在し、データが正しく入力されているか確認

### エラーが出る

- スプレッドシートのシート名が **`EEs`**（大文字小文字正確に）であることを確認
- ブラウザのコンソールでエラー内容を確認

---

がんばってね💉 何か困ったらシグウィンに聞いてちょうだい！

