# Resend メール送信設定ガイド（さくらインターネット）

## 1. Resendアカウントの準備

### 1.1 アカウント作成
1. [Resend](https://resend.com)にアクセス
2. 「Sign up」からアカウント作成
3. メールアドレス確認を完了

### 1.2 APIキーの取得
1. ダッシュボードにログイン
2. 「API Keys」セクションへ移動
3. 「Create API Key」をクリック
4. 名前を入力（例：`my-board-app-production`）
5. 生成されたAPIキーをコピー（`re_`で始まる文字列）

## 2. ドメインの追加（Resend側）

1. Resendダッシュボードで「Domains」セクションへ
2. 「Add Domain」をクリック
3. ドメイン名を入力（例：`yourdomain.com`）
4. 「Add」をクリック
5. 表示されるDNSレコード情報をメモ

### 必要なDNSレコード（例）
```
# SPFレコード
Type: TXT
Name: @ または空欄
Value: v=spf1 include:amazonses.com ~all

# DKIMレコード（3つ）
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.yourdomain.com.dkim.amazonses.com

Type: CNAME  
Name: resend2._domainkey
Value: resend2._domainkey.yourdomain.com.dkim.amazonses.com

Type: CNAME
Name: resend3._domainkey
Value: resend3._domainkey.yourdomain.com.dkim.amazonses.com

# MXレコード（オプション：受信用）
Type: MX
Name: @ または空欄
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

## 3. さくらインターネットでのDNS設定

### 3.1 コントロールパネルへログイン
1. [さくらインターネット会員メニュー](https://secure.sakura.ad.jp/menu/)にログイン
2. 「契約中のドメイン一覧」を選択
3. 設定するドメインの「ゾーン編集」をクリック

### 3.2 DNSレコードの追加

#### SPFレコードの追加
1. 「変更」ボタンをクリック
2. 「エントリの追加」をクリック
3. 以下を入力：
   - エントリ名：空欄（@相当）
   - 種別：テキスト(TXT)
   - 値：`v=spf1 include:amazonses.com ~all`
4. 「新規登録」をクリック

#### DKIMレコードの追加（3つ）
各レコードについて以下を繰り返し：

1. 「エントリの追加」をクリック
2. 以下を入力：
   - エントリ名：`resend._domainkey`
   - 種別：別名(CNAME)
   - 値：Resendから提供された値
3. 「新規登録」をクリック

同様に`resend2._domainkey`、`resend3._domainkey`も追加

#### 設定の保存
1. すべてのレコードを追加後、「データ送信」をクリック
2. 確認画面で内容を確認
3. 「送信する」をクリック

### 3.3 DNS反映の確認
- DNS設定は反映まで最大48時間かかる場合があります
- 通常は数時間で反映されます

## 4. Resendでドメイン認証の確認

1. Resendダッシュボードの「Domains」セクションへ
2. 追加したドメインのステータスを確認
3. 「Verify DNS Records」をクリック
4. すべてのレコードが「Verified」になればOK

## 5. アプリケーションの環境変数設定

### .env.localファイルの設定
```env
# Resend API設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# メール送信設定
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# アプリケーションURL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Vercelでの環境変数設定（本番環境）
1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 上記の環境変数を追加
5. デプロイを再実行

## 6. メールアドレスの設定例

### 推奨するメールアドレス構成
- `noreply@yourdomain.com` - システム送信用（返信不可）
- `support@yourdomain.com` - サポート問い合わせ用
- `admin@yourdomain.com` - 管理者通知用
- `info@yourdomain.com` - 一般問い合わせ用

## 7. テスト送信

### 開発環境でのテスト
```bash
# テスト用APIエンドポイントを呼び出し
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 本番環境でのテスト
1. Resendダッシュボードの「Emails」セクション
2. 「Send Test Email」機能を使用
3. 送信ログを確認

## トラブルシューティング

### DNS設定が反映されない場合
- さくらインターネットのDNS設定画面で「データ送信」を忘れていないか確認
- 48時間待っても反映されない場合は、レコードの値を再確認

### メールが届かない場合
1. Resendダッシュボードで送信ログを確認
2. スパムフォルダを確認
3. APIキーが正しく設定されているか確認
4. ドメイン認証が完了しているか確認

### エラーメッセージ別対処法
- `Invalid API Key`: APIキーを再確認
- `Domain not verified`: DNS設定を確認し、認証を完了させる
- `Rate limit exceeded`: 無料プランの制限（月100通）を確認

## 参考リンク
- [Resend公式ドキュメント](https://resend.com/docs)
- [さくらインターネット DNS設定マニュアル](https://help.sakura.ad.jp/domain/2157/)