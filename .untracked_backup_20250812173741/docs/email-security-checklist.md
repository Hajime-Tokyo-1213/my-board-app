# メールセキュリティチェックリスト

## 1. SMTP認証設定 ✅

### 現在の設定
- **認証方式**: SMTP AUTH（ユーザー名/パスワード）
- **接続方式**: STARTTLS（ポート587）
- **暗号化**: TLS 1.2以上

### 確認方法
```bash
# SMTP接続テスト
node scripts/test-smtp-connection.js
```

## 2. SPF設定 ✅

### 現在の設定
```
TXT "v=spf1 a:www3386.sakura.ne.jp mx ~all"
```

### 確認方法
```bash
# SPFレコード確認
nslookup -type=txt teqham.com
```

## 3. DKIM設定 ✅

### 現在の設定
- セレクタ: `rs20250810._domainkey`
- 公開鍵設定済み

### 確認方法
```bash
# DKIMレコード確認
nslookup -type=txt rs20250810._domainkey.teqham.com
```

## 4. DMARC設定 ✅

### 現在の設定
```
_dmarc TXT "v=DMARC1; p=none; aspf=r; adkim=r"
```

### 推奨改善
本番環境では以下への変更を検討：
```
v=DMARC1; p=quarantine; rua=mailto:admin@teqham.com; aspf=s; adkim=s
```

## 5. 環境変数のセキュリティ

### ローカル環境
- ✅ `.env.local`ファイルを使用
- ✅ `.gitignore`に追加済み
- ⚠️ パスワードは暗号化されていない（ローカルのみ）

### Vercel環境
- ✅ 環境変数は暗号化保存
- ✅ プロジェクト単位でアクセス制御
- ✅ ビルドログからの除外

### 設定方法
1. Vercel Dashboard → Settings → Environment Variables
2. 以下を設定：
   - `SMTP_USER`
   - `SMTP_PASS`（Sensitive設定を有効化）
   - `SMTP_HOST`
   - `SMTP_PORT`

## 6. アプリケーションレベルのセキュリティ

### 実装済み
- ✅ TLS/STARTTLS使用
- ✅ ポート587使用（サブミッションポート）
- ✅ SMTP認証必須

### 推奨実装
```javascript
// 本番環境での推奨設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: true,  // 本番環境では必須
    minVersion: 'TLSv1.2'      // TLS 1.2以上を強制
  }
});
```

## 7. レート制限とスパム対策

### 推奨実装
- メール送信レート制限（1分あたり10通など）
- 送信先ホワイトリスト（開発環境）
- CAPTCHAまたは認証後のみ送信可能

## 8. ログとモニタリング

### 推奨実装
```javascript
// メール送信ログ
const logEmailSend = async (to, subject, status) => {
  console.log({
    timestamp: new Date().toISOString(),
    to: to.replace(/(.{3}).*(@.*)/, '$1***$2'), // メールアドレスを部分的にマスク
    subject,
    status,
    // パスワードは絶対にログに含めない
  });
};
```

## 9. テスト手順

### 1. 接続テスト
```bash
node scripts/test-smtp-connection.js
```

### 2. 送信テスト
```bash
node scripts/test-email.js
```

### 3. SPF/DKIM/DMARC検証
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx)
- [Mail-tester](https://www.mail-tester.com/)

## 10. 本番環境チェックリスト

- [ ] 環境変数をVercelに設定
- [ ] `rejectUnauthorized: true`に変更
- [ ] DMARCポリシーを`quarantine`または`reject`に変更
- [ ] メール送信ログの実装
- [ ] レート制限の実装
- [ ] エラーハンドリングの強化
- [ ] バックアップSMTPサーバーの検討

## トラブルシューティング

### 認証エラー
1. パスワードの確認
2. ユーザー名の形式確認（完全なメールアドレス）
3. アカウントロックの確認

### 接続エラー
1. ファイアウォール設定
2. ポート番号の確認
3. ホスト名のDNS解決確認

### 送信エラー
1. SPFレコードの確認
2. 送信元アドレスの確認
3. 送信先のスパムフィルター確認