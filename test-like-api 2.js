// いいねAPIのテスト
async function testLikeAPI() {
  const postId = '6894315f2764d648c04a7357'; // テスト用の投稿ID
  
  try {
    // ローカルサーバーのセッションを取得
    const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
      headers: {
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN' // セッショントークンが必要
      }
    });
    
    console.log('Session response:', await sessionRes.text());
    
    // いいねAPIをテスト
    const likeRes = await fetch(`http://localhost:3000/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN'
      }
    });
    
    const result = await likeRes.json();
    console.log('Like API response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('Note: このテストはブラウザのコンソールで実行してください。');
console.log('または、有効なセッショントークンを設定してください。');