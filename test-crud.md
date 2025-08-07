# 📝 掲示板CRUD機能テスト手順書

## 🎯 テスト環境
- **URL**: http://localhost:3000
- **API**: http://localhost:3000/api/posts
- **ブラウザ**: Chrome/Firefox/Safari推奨
- **開発者ツール**: F12キーで開く

## 1️⃣ Create（投稿作成）のテスト手順

### A. 正常系テスト
```bash
# コマンドラインでのテスト
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content": "CRUDテスト：新規投稿を作成します"}'
```

### B. ブラウザでのテスト
1. トップページにアクセス
2. 「今何を考えていますか？」テキストエリアに入力
3. 文字数カウンターが正しく表示されることを確認
4. 「投稿する」ボタンをクリック
5. 投稿が一覧の最上部に表示されることを確認

### C. 検証ポイント
- [ ] 空の投稿は送信できない
- [ ] 投稿ボタンが適切に有効/無効になる
- [ ] 投稿後、テキストエリアがクリアされる
- [ ] 投稿日時が正しく表示される

## 2️⃣ Read（一覧表示）のテスト手順

### A. APIレベルテスト
```bash
# 全投稿を取得
curl -X GET http://localhost:3000/api/posts

# 特定の投稿を取得（IDを置き換えてください）
curl -X GET http://localhost:3000/api/posts/[POST_ID]
```

### B. ブラウザでのテスト
1. ページをリロード（F5キー）
2. 以下を確認：
   - [ ] ローディングスピナーが表示される
   - [ ] 投稿が新しい順に表示される
   - [ ] 投稿数が正しく表示される
   - [ ] 各投稿の内容が正しく表示される
   - [ ] 日時が日本時間で表示される

### C. パフォーマンステスト
```javascript
// Console で実行
console.time('投稿読み込み');
fetch('/api/posts')
  .then(res => res.json())
  .then(data => {
    console.timeEnd('投稿読み込み');
    console.log('投稿数:', data.data.length);
  });
```

## 3️⃣ Update（編集）のテスト手順

### A. APIレベルテスト
```bash
# 投稿を更新（IDを置き換えてください）
curl -X PUT http://localhost:3000/api/posts/[POST_ID] \
  -H "Content-Type: application/json" \
  -d '{"content": "CRUDテスト：投稿を更新しました"}'
```

### B. ブラウザでのテスト
1. 任意の投稿の「編集」ボタン（鉛筆アイコン）をクリック
2. テキストエリアが表示されることを確認
3. 内容を編集
4. 文字数カウンターが更新されることを確認
5. 「保存」ボタンをクリック
6. 更新後の内容が表示されることを確認
7. 「編集済み」の表示と日時を確認

### C. 検証ポイント
- [ ] 編集中は他のボタンが無効になる
- [ ] キャンセルボタンで元の内容に戻る
- [ ] 空の内容では保存できない
- [ ] 200文字を超える内容は保存できない

## 4️⃣ Delete（削除）のテスト手順

### A. APIレベルテスト
```bash
# 投稿を削除（IDを置き換えてください）
curl -X DELETE http://localhost:3000/api/posts/[POST_ID]
```

### B. ブラウザでのテスト
1. 任意の投稿の「削除」ボタン（ゴミ箱アイコン）をクリック
2. 確認ダイアログが表示されることを確認
3. 「OK」をクリック
4. 投稿が一覧から消えることを確認
5. 投稿数が減ることを確認

### C. 検証ポイント
- [ ] 確認ダイアログでキャンセルした場合、削除されない
- [ ] 削除後、投稿数が正しく更新される
- [ ] 削除された投稿は復元できない

## 🔥 エッジケースのテスト方法

### 1. 文字数制限テスト
```javascript
// Console で実行
const longText = 'あ'.repeat(201); // 201文字
fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: longText })
})
.then(res => res.json())
.then(data => console.log('結果:', data));
// 期待：エラーメッセージ「投稿は200文字以内にしてください」
```

### 2. 特殊文字テスト
```javascript
// 各種特殊文字をテスト
const testCases = [
  '😀🎉🔥', // 絵文字
  '<script>alert("XSS")</script>', // HTMLタグ
  '改行\nテスト\n複数行', // 改行
  '　全角スペース　', // 全角スペース
  '"引用符" と \'シングルクォート\'', // クォート
];

testCases.forEach(content => {
  fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  .then(res => res.json())
  .then(data => console.log(content, '→', data.success));
});
```

### 3. 同時実行テスト
```javascript
// 同時に複数の投稿を作成
const promises = [];
for (let i = 0; i < 5; i++) {
  promises.push(
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `同時実行テスト ${i + 1}` })
    })
  );
}
Promise.all(promises)
  .then(responses => Promise.all(responses.map(r => r.json())))
  .then(results => console.log('同時実行結果:', results));
```

### 4. エラー処理テスト
```javascript
// 存在しないIDでの操作
const fakeId = '000000000000000000000000';

// 更新テスト
fetch(`/api/posts/${fakeId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'テスト' })
})
.then(res => res.json())
.then(data => console.log('更新エラー:', data));

// 削除テスト
fetch(`/api/posts/${fakeId}`, { method: 'DELETE' })
.then(res => res.json())
.then(data => console.log('削除エラー:', data));
```

### 5. ネットワークエラーテスト
1. Chrome DevTools → Network タブ
2. 「Offline」を選択
3. 投稿の作成/編集/削除を試行
4. エラーメッセージが表示されることを確認

### 6. 大量データテスト
```javascript
// 大量の投稿を作成
async function createManyPosts(count) {
  for (let i = 0; i < count; i++) {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `負荷テスト投稿 #${i + 1}` })
    });
    console.log(`Created post ${i + 1}/${count}`);
  }
}
// createManyPosts(50); // 50件の投稿を作成
```

## 🛠️ デバッグ用ヘルパー

### 現在の投稿を全て削除
```javascript
// ⚠️ 注意：全ての投稿が削除されます
async function deleteAllPosts() {
  const res = await fetch('/api/posts');
  const data = await res.json();
  const posts = data.data;
  
  for (const post of posts) {
    await fetch(`/api/posts/${post._id}`, { method: 'DELETE' });
    console.log(`Deleted: ${post._id}`);
  }
  console.log('All posts deleted');
}
// deleteAllPosts(); // コメントを外して実行
```

### 投稿の統計情報
```javascript
async function getStats() {
  const res = await fetch('/api/posts');
  const data = await res.json();
  const posts = data.data;
  
  const stats = {
    total: posts.length,
    avgLength: posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length,
    shortest: Math.min(...posts.map(p => p.content.length)),
    longest: Math.max(...posts.map(p => p.content.length)),
  };
  
  console.table(stats);
}
getStats();
```

## ✅ テストチェックリスト

### 基本機能
- [ ] 投稿の作成が正常に動作する
- [ ] 投稿一覧が正しく表示される
- [ ] 投稿の編集が正常に動作する
- [ ] 投稿の削除が正常に動作する

### バリデーション
- [ ] 空の投稿は作成できない
- [ ] 200文字を超える投稿は作成できない
- [ ] 特殊文字が正しく処理される

### UI/UX
- [ ] ローディング状態が表示される
- [ ] エラーメッセージが適切に表示される
- [ ] レスポンシブデザインが機能する
- [ ] キーボード操作が可能

### パフォーマンス
- [ ] 投稿の読み込みが3秒以内
- [ ] 大量の投稿でも正常に動作
- [ ] 同時操作でエラーが発生しない