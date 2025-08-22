# メンション機能シーケンス図

## メンション入力と解析

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant N as Notification Service

    U->>F: @ 入力
    Note over U,F: "@" キー押下
    
    F->>F: メンショントリガー検出
    
    F->>A: GET /api/users/search/mention
    Note over F,A: リアルタイム検索
    
    A->>D: ユーザー検索
    Note over D: アクティブユーザー優先
    D-->>A: ユーザーリスト
    
    A->>A: ランキング処理
    Note over A: 関連性、最近のやり取り
    
    A-->>F: サジェストリスト
    
    F->>F: ドロップダウン表示
    F-->>U: ユーザー候補
    
    U->>F: ユーザー選択
    Note over U,F: @john_doe
    
    F->>F: メンション挿入
    Note over F: リンク化
    
    U->>F: 投稿送信
    
    F->>A: POST /api/posts
    Note over F,A: mentions: ["john_doe"]
    
    A->>D: トランザクション開始
    
    A->>D: 投稿作成
    A->>D: メンション保存
    Note over D: mentions table
    
    A->>N: メンション通知作成
    Note over N: 各メンションユーザーへ
    
    A->>D: トランザクションコミット
    
    A-->>F: 201 Created
    F-->>U: 投稿完了
```

## メンションオートコンプリート

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant C as Cache(Redis)

    U->>F: @j 入力
    Note over U,F: 文字入力開始
    
    F->>F: デバウンス処理
    Note over F: 200ms待機
    
    F->>A: GET /api/users/autocomplete
    Note over F,A: ?prefix=j&context=mention
    
    A->>C: キャッシュ確認
    Note over C: autocomplete:j
    
    alt キャッシュミス
        A->>D: プレフィックス検索
        Note over D: username LIKE 'j%'
        D-->>A: マッチユーザー
        
        A->>D: 関連性スコア取得
        Note over D: 相互フォロー
        Note over D: 最近のインタラクション
        D-->>A: スコア付きリスト
        
        A->>A: ソート処理
        
        A->>C: キャッシュ保存
        Note over C: TTL: 5分
    end
    
    A-->>F: 候補リスト
    F->>F: リスト更新
    F-->>U: @john, @jane, @jack
```

## コメント内メンション

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant N as Notification Service

    U->>F: コメント作成
    Note over U,F: "@alice 同意します"
    
    F->>F: メンション解析
    F->>F: ユーザー検証
    
    F->>A: POST /api/comments
    Note over F,A: {content, mentions}
    
    A->>D: メンションユーザー確認
    
    alt ユーザー存在
        D-->>A: ユーザー情報
        
        A->>D: コメント作成
        A->>D: メンション関連付け
        
        A->>N: 通知作成
        Note over N: タイプ: comment_mention
        
        N->>D: 通知保存
        N->>N: プッシュ通知送信
        
        A-->>F: 201 Created
    else ユーザー不在
        A-->>F: 422 Unprocessable
        F-->>U: "ユーザーが見つかりません"
    end
```

## メンション通知

```mermaid
sequenceDiagram
    participant M as メンション送信者
    participant A as API Server
    participant N as Notification Service
    participant D as Database
    participant P as Push Service
    participant R as 受信者

    M->>A: メンション付き投稿
    
    A->>D: メンション保存
    
    A->>N: 通知リクエスト
    
    N->>D: 受信者設定確認
    D-->>N: 通知設定
    
    alt メンション通知有効
        N->>D: 通知作成
        Note over D: 優先度: 高
        
        N->>P: プッシュ通知
        P-->>R: システム通知
        
        N->>D: メール通知確認
        alt メール通知有効
            N->>N: メール送信
            N-->>R: メール受信
        end
        
        N->>A: WebSocket通知
        A-->>R: リアルタイム通知
    else 通知無効
        N->>D: サイレント記録
        Note over D: 通知履歴のみ保存
    end
```

## グループメンション

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant N as Notification Service

    U->>F: @team 入力
    Note over U,F: グループメンション
    
    F->>A: GET /api/groups/search
    Note over F,A: ?name=team
    
    A->>D: グループ検索
    D-->>A: グループ情報
    
    A-->>F: グループ詳細
    F-->>U: @team (5人)
    
    U->>F: 投稿送信
    
    F->>A: POST /api/posts
    Note over F,A: group_mentions: ["team"]
    
    A->>D: グループメンバー取得
    D-->>A: メンバーリスト
    
    A->>D: トランザクション開始
    
    loop 各メンバー
        A->>D: メンション作成
        A->>N: 通知作成
    end
    
    A->>D: トランザクションコミット
    
    A-->>F: 201 Created
    F-->>U: "5人にメンション"
```

## メンション権限管理

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database

    U->>F: プライバシー設定
    F->>A: PUT /api/settings/mentions
    Note over F,A: {allow_mentions: "followers"}
    
    A->>D: 設定更新
    D-->>A: 更新完了
    
    Note over A: 他ユーザーがメンション時
    
    A->>D: メンション権限確認
    D-->>A: 権限設定
    
    alt フォロワーのみ許可
        A->>D: フォロー関係確認
        alt フォロワー
            D-->>A: 許可
            A->>D: メンション作成
        else 非フォロワー
            D-->>A: 拒否
            A-->>F: 403 Forbidden
            F-->>U: "メンションできません"
        end
    else 全員許可
        A->>D: メンション作成
    else メンション無効
        A-->>F: 403 Forbidden
    end
```

## メンション履歴

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant C as Cache(Redis)

    U->>F: メンション履歴ページ
    
    F->>A: GET /api/mentions/history
    Note over F,A: 自分がメンションされた投稿
    
    A->>C: キャッシュ確認
    
    alt キャッシュミス
        A->>D: メンション取得
        Note over D: WHERE mentioned_user = userId
        D-->>A: メンションリスト
        
        A->>D: 関連投稿取得
        D-->>A: 投稿詳細
        
        A->>C: キャッシュ保存
    end
    
    A-->>F: メンション履歴
    F->>F: タイムライン表示
    F-->>U: メンション一覧
```

## スマートメンション提案

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant ML as ML Service
    participant D as Database

    U->>F: 投稿作成開始
    
    F->>A: POST /api/mentions/suggest
    Note over F,A: {content: "プロジェクト進捗"}
    
    A->>ML: コンテキスト分析
    
    ML->>D: 関連ユーザー取得
    Note over D: トピック関連
    Note over D: 過去のやり取り
    D-->>ML: 候補ユーザー
    
    ML->>ML: スコアリング
    Note over ML: 関連性計算
    
    ML-->>A: 提案リスト
    
    A-->>F: 推奨メンション
    F->>F: 提案表示
    F-->>U: "関連: @pm @dev_lead"
```

## メンションのエスケープ

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant P as Parser

    U->>F: テキスト入力
    Note over U,F: "メールは user@example.com"
    
    F->>F: @ 検出
    
    F->>F: コンテキスト判定
    Note over F: メールアドレス判定
    
    alt メールアドレス
        F->>F: エスケープ処理
        Note over F: メンションとして扱わない
    else メンション
        F->>F: メンション処理
    end
    
    F->>A: POST /api/posts
    
    A->>P: パース処理
    
    P->>P: メンション抽出
    Note over P: 正規表現with除外パターン
    
    P-->>A: メンションリスト
    Note over P,A: 空（メールは除外）
```

## メンション検索

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant E as Elasticsearch

    U->>F: メンション検索
    Note over U,F: "@john を含む投稿"
    
    F->>A: GET /api/search/mentions
    Note over F,A: ?user=john
    
    alt Elasticsearch使用
        A->>E: メンション検索
        E->>E: インデックス検索
        E-->>A: 検索結果
    else DB検索
        A->>D: メンションJOIN
        Note over D: mentions.username = 'john'
        D-->>A: 投稿リスト
    end
    
    A-->>F: 検索結果
    F-->>U: メンション投稿一覧
```

## メンション統計

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant D as Database
    participant An as Analytics

    U->>F: メンション分析
    
    F->>A: GET /api/mentions/analytics
    
    A->>D: メンション統計取得
    Note over D: 受信数、送信数
    D-->>A: 統計データ
    
    A->>An: 分析処理
    
    An->>An: トレンド分析
    Note over An: 時系列変化
    
    An->>An: ネットワーク分析
    Note over An: メンション関係図
    
    An-->>A: 分析結果
    
    A-->>F: 統計データ
    F->>F: グラフ描画
    F-->>U: メンション統計表示
```

## リアルタイムメンション更新

```mermaid
sequenceDiagram
    participant S as 送信者
    participant A as API Server
    participant W as WebSocket Server
    participant R as 受信者

    S->>A: メンション付き投稿
    
    A->>A: メンション処理
    
    A->>W: メンションイベント
    Note over A,W: {type: "mention", data}
    
    W->>W: 受信者接続確認
    
    alt オンライン
        W->>R: WebSocket送信
        R->>R: 通知表示
        Note over R: リアルタイム表示
    else オフライン
        W->>W: キューに保存
        Note over W: 次回接続時に配信
    end
```