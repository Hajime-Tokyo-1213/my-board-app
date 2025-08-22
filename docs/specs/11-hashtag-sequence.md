# ハッシュタグ機能シーケンス図

## ハッシュタグ解析と保存

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant P as Parser
    participant D as Database
    participant T as Trending Service

    U->>F: 投稿入力
    Note over U,F: "新機能 #React #TypeScript"
    
    F->>F: リアルタイム解析
    Note over F: #タグをハイライト
    
    F->>F: オートコンプリート
    Note over F: 既存タグサジェスト
    
    U->>F: 投稿送信
    
    F->>A: POST /api/posts
    Note over F,A: content with hashtags
    
    A->>P: ハッシュタグ抽出
    
    P->>P: 正規表現マッチング
    Note over P: /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g
    
    P->>P: タグ正規化
    Note over P: 小文字変換
    Note over P: 特殊文字削除
    
    P-->>A: タグリスト
    Note over P,A: ['react', 'typescript']
    
    A->>D: トランザクション開始
    
    loop 各ハッシュタグ
        A->>D: タグ存在確認
        alt タグ新規
            A->>D: タグ作成
            Note over D: hashtags table
        else タグ既存
            A->>D: 使用回数更新
            Note over D: count++
        end
        
        A->>D: 投稿-タグ関連付け
        Note over D: posts_hashtags
    end
    
    A->>T: トレンド更新
    Note over T: 使用頻度記録
    
    A->>D: トランザクションコミット
    
    A-->>F: 201 Created
    F-->>U: 投稿完了
```

## ハッシュタグ検索

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant C as Cache(Redis)

    U->>F: ハッシュタグクリック
    Note over U,F: #React
    
    F->>A: GET /api/hashtags/React
    
    A->>C: キャッシュ確認
    Note over C: hashtag:react:posts
    
    alt キャッシュミス
        A->>D: タグ情報取得
        D-->>A: タグ詳細
        
        A->>D: 関連投稿取得
        Note over D: JOIN posts_hashtags
        D-->>A: 投稿リスト
        
        A->>D: 関連タグ取得
        Note over D: 共起タグ分析
        D-->>A: 関連タグ
        
        A->>C: キャッシュ保存
        Note over C: TTL: 3分
    end
    
    A-->>F: 200 OK
    F->>F: タグページ表示
    F-->>U: ハッシュタグフィード
```

## トレンディングハッシュタグ

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant A as API Server
    participant D as Database
    participant An as Analytics
    participant C as Cache(Redis)

    Cron->>A: トレンド計算
    Note over Cron,A: 15分ごと
    
    A->>D: 使用統計取得
    Note over D: 過去1時間、24時間、7日間
    D-->>A: 統計データ
    
    A->>An: トレンド分析
    
    An->>An: スコア計算
    Note over An: 使用頻度
    Note over An: 成長率
    Note over An: ユニークユーザー数
    
    An->>An: 異常検知
    Note over An: スパム検出
    
    An-->>A: トレンドリスト
    
    A->>C: トレンド保存
    Note over C: trending:hourly
    Note over C: trending:daily
    Note over C: trending:weekly
    
    A->>D: 履歴保存
    
    Note over A: API提供
    A-->>F: GET /api/hashtags/trending
```

## ハッシュタグサジェスト

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant ML as ML Service
    participant D as Database

    U->>F: # 入力開始
    
    F->>F: サジェストトリガー
    Note over F: # の後に文字入力
    
    F->>A: GET /api/hashtags/suggest
    Note over F,A: ?prefix=Re
    
    A->>D: プレフィックス検索
    D-->>A: 候補リスト
    
    A->>ML: 関連性スコアリング
    
    ML->>ML: コンテキスト分析
    Note over ML: 投稿内容
    Note over ML: ユーザー履歴
    
    ML->>ML: 人気度加味
    
    ML-->>A: ランキング済み候補
    
    A-->>F: サジェストリスト
    F->>F: ドロップダウン表示
    F-->>U: タグ候補
    
    U->>F: 候補選択
    F->>F: タグ挿入
```

## ハッシュタグフォロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant T as Timeline Service

    U->>F: タグフォローボタン
    Note over U,F: #React をフォロー
    
    F->>A: POST /api/hashtags/React/follow
    
    A->>D: フォロー関係作成
    Note over D: user_hashtag_follows
    
    A->>D: フォロワー数更新
    Note over D: hashtags.followers_count++
    
    A->>T: タイムライン再構築
    Note over T: タグ投稿を含める
    
    A-->>F: 200 OK
    F-->>U: フォロー完了
    
    Note over T: 新規投稿時
    
    T->>D: フォロー中タグ確認
    D-->>T: フォロータグリスト
    
    T->>T: タイムライン更新
    Note over T: タグ投稿を追加
```

## ハッシュタグ統計

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant V as Visualization

    U->>F: タグ分析ページ
    Note over U,F: #React の統計
    
    F->>A: GET /api/hashtags/React/stats
    
    A->>D: 統計データ取得
    Note over D: 時系列使用数
    Note over D: ユーザー分布
    Note over D: 共起タグ
    D-->>A: 統計データ
    
    A->>V: グラフデータ生成
    
    V->>V: データ整形
    Note over V: Chart.js形式
    
    V-->>A: ビジュアライゼーションデータ
    
    A-->>F: 200 OK
    F->>F: グラフ描画
    F-->>U: 統計表示
```

## ハッシュタグマージ（管理機能）

```mermaid
sequenceDiagram
    participant Ad as 管理者
    participant F as フロントエンド
    participant A as API Server
    participant D as Database

    Ad->>F: タグマージ画面
    Note over Ad,F: #JS と #JavaScript を統合
    
    F->>A: POST /api/admin/hashtags/merge
    Note over F,A: {source: "JS", target: "JavaScript"}
    
    A->>D: トランザクション開始
    
    A->>D: 関連投稿更新
    Note over D: posts_hashtags更新
    
    A->>D: フォロー関係移行
    Note over D: user_hashtag_follows更新
    
    A->>D: 統計データマージ
    Note over D: カウント合算
    
    A->>D: ソースタグ削除
    Note over D: またはエイリアス化
    
    A->>D: トランザクションコミット
    
    A-->>F: 200 OK
    F-->>Ad: マージ完了
```

## ハッシュタグクラウド

```mermaid
sequenceDiagram
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant C as Cache(Redis)

    F->>A: GET /api/hashtags/cloud
    
    A->>C: キャッシュ確認
    Note over C: tagcloud:global
    
    alt キャッシュミス
        A->>D: 人気タグ取得
        Note over D: TOP 50
        D-->>A: タグリスト
        
        A->>A: サイズ計算
        Note over A: 使用頻度→フォントサイズ
        
        A->>A: カラー割り当て
        Note over A: カテゴリ別色分け
        
        A->>C: キャッシュ保存
    end
    
    A-->>F: タグクラウドデータ
    F->>F: D3.js描画
    F-->>F: インタラクティブ表示
```

## ハッシュタグ自動補完

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant AI as AI Service
    participant A as API Server

    U->>F: 投稿作成
    Note over U,F: タグなしテキスト
    
    F->>AI: タグ提案リクエスト
    Note over F,AI: 投稿内容送信
    
    AI->>AI: 自然言語処理
    Note over AI: テキスト分析
    Note over AI: トピック抽出
    
    AI->>AI: タグ生成
    Note over AI: 関連タグ提案
    
    AI-->>F: 提案タグリスト
    
    F->>F: 提案表示
    F-->>U: "提案: #React #Web開発"
    
    U->>F: タグ選択/承認
    F->>F: タグ追加
```

## ハッシュタグブラックリスト

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant M as Moderation
    participant D as Database

    U->>F: 投稿送信
    Note over U,F: 不適切なタグ含む
    
    F->>A: POST /api/posts
    
    A->>M: タグ検証
    
    M->>D: ブラックリスト確認
    D-->>M: 禁止タグリスト
    
    M->>M: マッチング確認
    
    alt 禁止タグ検出
        M-->>A: 違反検出
        A-->>F: 400 Bad Request
        F-->>U: "不適切なタグです"
    else 問題なし
        M-->>A: 承認
        A->>D: 投稿作成
        A-->>F: 201 Created
    end
```

## ハッシュタグランキング

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant A as API Server
    participant D as Database
    participant C as Cache(Redis)
    participant N as Notification

    Cron->>A: ランキング生成
    Note over Cron,A: 毎日0時
    
    A->>D: 集計クエリ
    Note over D: 日次、週次、月次
    D-->>A: 使用統計
    
    A->>A: ランキング計算
    Note over A: 1位〜100位
    
    A->>C: ランキング保存
    Note over C: ranking:daily:YYYY-MM-DD
    
    A->>D: 履歴保存
    
    loop TOP 10 タグ
        A->>N: トレンド通知
        Note over N: フォロワーへ通知
    end
    
    A->>A: レポート生成
```

## ハッシュタグのインポート/エクスポート

```mermaid
sequenceDiagram
    participant Ad as 管理者
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant S as Storage

    Note over Ad,S: エクスポート
    
    Ad->>F: エクスポートボタン
    F->>A: GET /api/admin/hashtags/export
    
    A->>D: 全タグデータ取得
    D-->>A: タグ情報
    
    A->>A: CSV/JSON生成
    A->>S: ファイル保存
    S-->>A: ダウンロードURL
    
    A-->>F: URL返却
    F-->>Ad: ダウンロード
    
    Note over Ad,S: インポート
    
    Ad->>F: ファイル選択
    F->>A: POST /api/admin/hashtags/import
    
    A->>A: ファイル解析
    A->>A: バリデーション
    
    A->>D: 一括挿入/更新
    
    A-->>F: インポート結果
    F-->>Ad: "100件インポート完了"
```