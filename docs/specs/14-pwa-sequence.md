# PWA機能シーケンス図

## ServiceWorker登録

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant F as フロントエンド
    participant SW as ServiceWorker
    participant C as Cache Storage

    U->>B: アプリアクセス
    B->>F: ページロード
    
    F->>F: ServiceWorker対応確認
    Note over F: 'serviceWorker' in navigator
    
    alt 対応ブラウザ
        F->>B: ServiceWorker登録
        Note over F,B: navigator.serviceWorker.register('/sw.js')
        
        B->>SW: sw.jsダウンロード
        
        SW->>SW: install イベント
        SW->>C: 必須リソースキャッシュ
        Note over C: HTML, CSS, JS, 画像
        
        SW->>SW: activate イベント
        SW->>C: 古いキャッシュ削除
        
        SW-->>F: 登録成功
        F-->>U: PWA機能有効
    else 非対応
        F-->>U: 通常のWebアプリ
    end
```

## オフライン対応

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant SW as ServiceWorker
    participant C as Cache Storage
    participant N as Network

    U->>B: ページリクエスト
    
    B->>SW: fetch イベント
    
    SW->>SW: キャッシュ戦略判定
    
    alt Cache First
        SW->>C: キャッシュ確認
        alt キャッシュヒット
            C-->>SW: キャッシュデータ
            SW-->>B: キャッシュレスポンス
        else キャッシュミス
            SW->>N: ネットワークリクエスト
            alt オンライン
                N-->>SW: レスポンス
                SW->>C: キャッシュ更新
                SW-->>B: レスポンス
            else オフライン
                SW->>C: フォールバック取得
                C-->>SW: offline.html
                SW-->>B: オフラインページ
            end
        end
    else Network First
        SW->>N: ネットワーク試行
        alt 成功
            N-->>SW: レスポンス
            SW->>C: キャッシュ更新
            SW-->>B: レスポンス
        else 失敗
            SW->>C: キャッシュ取得
            C-->>SW: キャッシュデータ
            SW-->>B: キャッシュレスポンス
        end
    end
    
    B-->>U: ページ表示
```

## アプリインストール

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant F as フロントエンド
    participant M as Manifest
    participant OS as OS/ホーム画面

    B->>M: manifest.json取得
    M-->>B: アプリ情報
    
    B->>B: インストール条件確認
    Note over B: HTTPS
    Note over B: ServiceWorker登録済み
    Note over B: エンゲージメント基準
    
    alt 条件満たす
        B->>F: beforeinstallprompt イベント
        
        F->>F: インストールバナー表示
        F-->>U: "アプリをインストール"
        
        U->>F: インストールボタンクリック
        
        F->>B: prompt() 実行
        B-->>U: インストールダイアログ
        
        U->>B: インストール承認
        
        B->>OS: アプリ追加
        Note over OS: アイコン、名前、URL
        
        OS-->>U: ホーム画面に追加
        
        F->>F: appinstalled イベント
        F-->>U: "インストール完了"
    end
```

## プッシュ通知購読

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant SW as ServiceWorker
    participant PS as Push Service(FCM)
    participant A as API Server
    participant D as Database

    F->>F: 通知許可確認
    
    alt 未許可
        F->>U: 許可リクエスト
        U->>F: 許可/拒否
    end
    
    alt 許可済み
        F->>SW: 購読リクエスト
        Note over F,SW: registration.pushManager.subscribe()
        
        SW->>PS: VAPID鍵で購読
        PS-->>SW: 購読情報
        Note over PS,SW: endpoint, keys
        
        SW-->>F: 購読オブジェクト
        
        F->>A: POST /api/notifications/subscribe
        Note over F,A: 購読情報送信
        
        A->>D: 購読情報保存
        Note over D: user_id, endpoint
        
        A-->>F: 200 OK
        F-->>U: "通知有効"
    end
```

## バックグラウンド同期

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant SW as ServiceWorker
    participant IDB as IndexedDB
    participant A as API Server

    Note over U: オフライン状態
    
    U->>F: 投稿作成
    
    F->>F: オンライン確認
    Note over F: navigator.onLine
    
    alt オフライン
        F->>IDB: 投稿を保存
        Note over IDB: pending_posts
        
        F->>SW: sync登録
        Note over F,SW: registration.sync.register('sync-posts')
        
        F-->>U: "オフライン保存"
    end
    
    Note over SW: オンライン復帰
    
    SW->>SW: sync イベント
    
    SW->>IDB: 保留投稿取得
    IDB-->>SW: 投稿リスト
    
    loop 各投稿
        SW->>A: POST /api/posts
        alt 成功
            A-->>SW: 201 Created
            SW->>IDB: 投稿削除
            SW->>F: 同期成功通知
        else 失敗
            SW->>SW: リトライ登録
        end
    end
    
    F-->>U: "同期完了"
```

## キャッシュ更新戦略

```mermaid
sequenceDiagram
    participant SW as ServiceWorker
    participant C as Cache Storage
    participant N as Network
    participant F as フロントエンド

    Note over SW: Stale While Revalidate
    
    SW->>C: キャッシュ取得
    C-->>SW: キャッシュデータ
    
    SW-->>F: 即座にレスポンス
    Note over F: 古い可能性のあるデータ
    
    par バックグラウンド更新
        SW->>N: ネットワークリクエスト
        N-->>SW: 新データ
        
        SW->>C: キャッシュ更新
        
        SW->>F: postMessage
        Note over SW,F: 更新通知
        
        F->>F: UI更新
        Note over F: 新データで再描画
    end
```

## アプリ更新

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant SW1 as 旧ServiceWorker
    participant SW2 as 新ServiceWorker
    participant F as フロントエンド

    B->>B: 更新チェック
    Note over B: 24時間ごと or 再読み込み
    
    B->>SW2: 新sw.jsダウンロード
    
    SW2->>SW2: install イベント
    SW2->>SW2: waiting 状態
    Note over SW2: 旧SWがアクティブ
    
    SW2->>F: updatefound イベント
    
    F->>F: 更新バナー表示
    F-->>U: "更新があります"
    
    U->>F: 更新ボタン
    
    F->>SW1: skipWaiting()
    SW1->>SW2: アクティベート
    
    SW2->>SW2: activate イベント
    SW2->>SW2: 古いキャッシュ削除
    
    SW2->>F: controllerchange
    F->>B: location.reload()
    
    B-->>U: 更新完了
```

## ホーム画面から起動

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant OS as OS
    participant B as ブラウザ(スタンドアロン)
    participant SW as ServiceWorker
    participant F as フロントエンド

    U->>OS: アプリアイコンタップ
    
    OS->>B: アプリ起動
    Note over B: display: standalone
    
    B->>SW: activate
    
    SW->>F: ページロード
    
    F->>F: スタンドアロン検出
    Note over F: window.matchMedia('(display-mode: standalone)')
    
    F->>F: UI調整
    Note over F: ネイティブ風UI
    
    F->>F: 起動画面非表示
    
    F-->>U: アプリ表示
```

## Web Share API

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant B as ブラウザ
    participant OS as OS Share Sheet
    participant A as 外部アプリ

    U->>F: 共有ボタンクリック
    
    F->>F: Web Share API確認
    Note over F: navigator.share
    
    alt API利用可能
        F->>B: navigator.share()
        Note over F,B: {title, text, url}
        
        B->>OS: ネイティブ共有
        OS-->>U: 共有シート表示
        
        U->>OS: アプリ選択
        OS->>A: データ転送
        
        A-->>U: 外部アプリで開く
        
        OS-->>B: 共有完了
        B-->>F: Promise resolve
    else API不可
        F->>F: フォールバック
        F-->>U: URL コピーボタン
    end
```

## IndexedDBでのデータ永続化

```mermaid
sequenceDiagram
    participant F as フロントエンド
    participant IDB as IndexedDB
    participant SW as ServiceWorker
    participant A as API Server

    F->>IDB: DB初期化
    Note over IDB: posts, drafts, cache
    
    F->>A: GET /api/posts
    A-->>F: 投稿データ
    
    F->>IDB: データ保存
    Note over IDB: トランザクション
    
    Note over F: オフライン時
    
    F->>IDB: データ取得
    IDB-->>F: ローカルデータ
    
    F-->>F: オフライン表示
    
    Note over F: 下書き保存
    
    F->>IDB: 下書き保存
    Note over IDB: drafts store
    
    SW->>IDB: 定期クリーンアップ
    Note over SW: 古いデータ削除
```

## パフォーマンス最適化

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant SW as ServiceWorker
    participant C as Cache
    participant CDN as CDN

    U->>B: 初回アクセス
    
    B->>SW: install
    
    SW->>SW: Critical CSS抽出
    SW->>C: インライン化
    
    SW->>CDN: プリフェッチ
    Note over SW,CDN: 重要リソース
    
    CDN-->>SW: リソース
    SW->>C: 事前キャッシュ
    
    Note over U: 2回目以降
    
    U->>B: アクセス
    
    SW->>C: App Shell取得
    C-->>SW: 即座に返却
    
    SW-->>B: 高速表示
    Note over B: First Paint < 1秒
    
    par コンテンツ取得
        SW->>C: キャッシュ確認
        SW->>CDN: 更新確認
    end
```

## Web App Manifest

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant M as manifest.json
    participant I as アイコン
    participant S as スプラッシュ画面

    B->>M: manifest取得
    
    M-->>B: アプリ設定
    Note over M,B: name, short_name
    Note over M,B: start_url, scope
    Note over M,B: display, orientation
    Note over M,B: theme_color, background_color
    
    B->>I: アイコン取得
    Note over I: 複数サイズ
    I-->>B: アイコンセット
    
    B->>B: スプラッシュ生成
    Note over B: アイコン + 背景色
    
    B->>S: 起動画面表示
    S-->>B: ローディング表示
    
    B->>B: アプリ起動
    B-->>S: フェードアウト
```