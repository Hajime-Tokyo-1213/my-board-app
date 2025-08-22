# 画像アップロード機能シーケンス図

## 画像アップロード（Cloudinary）

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant C as Cloudinary
    participant D as Database
    participant V as Validator

    U->>F: 画像選択
    Note over U,F: ファイル選択/ドラッグ&ドロップ
    
    F->>F: ファイル検証
    Note over F: サイズ、形式チェック
    
    alt 検証エラー
        F-->>U: エラー表示
        Note over F,U: "10MB以下のJPG/PNG"
    else 検証OK
        F->>F: プレビュー生成
        Note over F: FileReader API
        F-->>U: プレビュー表示
        
        F->>F: 画像圧縮
        Note over F: Canvas APIで圧縮
        
        F->>A: POST /api/upload
        Note over F,A: FormData or Base64
        
        A->>V: セキュリティチェック
        Note over V: ウイルススキャン
        Note over V: 不適切コンテンツ検出
        
        alt セキュリティ問題
            V-->>A: 検出
            A-->>F: 400 Bad Request
            F-->>U: "不適切な画像です"
        else セキュリティOK
            A->>C: アップロード
            Note over A,C: Cloudinary SDK
            
            C->>C: 画像処理
            Note over C: リサイズ
            Note over C: 最適化
            Note over C: フォーマット変換
            
            C->>C: バリエーション生成
            Note over C: サムネイル
            Note over C: 中サイズ
            Note over C: 大サイズ
            
            C-->>A: 画像URL群
            Note over C,A: public_id, secure_url
            
            A->>D: 画像情報保存
            Note over D: urls, metadata
            
            A-->>F: 200 OK
            Note over A,F: {urls, imageId}
            
            F->>F: アップロード完了処理
            F-->>U: 画像表示
        end
    end
```

## 複数画像アップロード

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant C as Cloudinary
    participant Q as Upload Queue

    U->>F: 複数画像選択
    Note over U,F: 最大10枚
    
    F->>F: ファイルリスト作成
    F-->>U: サムネイル一覧表示
    
    F->>F: アップロードキュー初期化
    
    loop 各画像
        F->>F: 順次処理
        F-->>U: 進捗表示
        Note over F,U: プログレスバー
        
        F->>A: POST /api/upload
        
        A->>Q: キューに追加
        Note over Q: 並列処理制限
        
        Q->>C: Cloudinary アップロード
        C-->>Q: URL返却
        
        Q-->>A: 処理完了
        A-->>F: 画像URL
        
        F->>F: 結果更新
        F-->>U: 個別完了表示
    end
    
    F-->>U: 全体完了通知
```

## 画像クロップ・編集

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant E as Image Editor
    participant A as API Server
    participant C as Cloudinary

    U->>F: 画像編集ボタン
    F->>E: エディター起動
    Note over E: Cropper.js等
    
    E-->>U: 編集UI表示
    
    U->>E: 編集操作
    Note over U,E: クロップ、回転、フィルター
    
    E->>E: リアルタイムプレビュー
    E-->>U: プレビュー更新
    
    U->>E: 編集確定
    
    E->>F: 編集データ返却
    Note over E,F: Canvas.toBlob()
    
    F->>A: POST /api/upload/edited
    Note over F,A: 編集済み画像
    
    A->>C: トランスフォーメーション
    Note over A,C: Cloudinary変換
    
    C-->>A: 変換済みURL
    A-->>F: 新画像URL
    F-->>U: 編集完了
```

## ドラッグ&ドロップアップロード

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant DZ as DropZone
    participant A as API Server

    U->>DZ: ファイルドラッグ
    DZ->>DZ: dragenter イベント
    DZ-->>U: ドロップゾーン強調
    
    U->>DZ: ファイルドロップ
    DZ->>DZ: drop イベント
    
    DZ->>DZ: ファイル取得
    Note over DZ: e.dataTransfer.files
    
    DZ->>F: ファイル処理
    
    F->>F: MIME type確認
    alt 非画像ファイル
        F-->>U: "画像のみ対応"
    else 画像ファイル
        F->>F: プレビュー生成
        F-->>U: 即座にプレビュー
        
        F->>A: アップロード開始
        A-->>F: アップロード完了
        F-->>U: 完了通知
    end
```

## 画像URL取得（ダイレクトアップロード）

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant C as Cloudinary
    participant A as API Server
    participant D as Database

    Note over F,C: ダイレクトアップロード設定
    
    U->>F: 画像選択
    
    F->>C: 署名リクエスト
    Note over F,C: 事前署名URL取得
    
    C-->>F: アップロードプリセット
    
    F->>C: 直接アップロード
    Note over F,C: ブラウザから直接
    
    C->>C: 画像処理
    C-->>F: 画像URL
    
    F->>A: POST /api/images/register
    Note over F,A: Cloudinary URLを登録
    
    A->>D: URL保存
    A-->>F: 登録完了
    
    F-->>U: アップロード完了
```

## 画像最適化配信

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant CDN as Cloudinary CDN
    participant T as Transformation

    U->>B: ページアクセス
    
    B->>B: 画面サイズ検出
    Note over B: viewport, DPR
    
    B->>CDN: 画像リクエスト
    Note over B,CDN: /w_auto,q_auto/image.jpg
    
    CDN->>T: 変換パラメータ解析
    
    T->>T: 最適化処理
    Note over T: WebP/AVIF変換
    Note over T: 品質調整
    Note over T: サイズ調整
    
    T-->>CDN: 最適化画像
    
    CDN->>CDN: キャッシュ保存
    
    CDN-->>B: 最適化画像配信
    B-->>U: 高速表示
```

## 画像削除

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant A as API Server
    participant C as Cloudinary
    participant D as Database

    U->>F: 画像削除ボタン
    F->>F: 確認ダイアログ
    
    U->>F: 削除確認
    
    F->>A: DELETE /api/images/[id]
    
    A->>D: 画像情報取得
    D-->>A: public_id等
    
    A->>C: 削除リクエスト
    Note over A,C: destroy(public_id)
    
    C->>C: CDNパージ
    C-->>A: 削除完了
    
    A->>D: DB削除
    Note over D: 関連レコード削除
    
    A-->>F: 204 No Content
    F->>F: UI更新
    F-->>U: 削除完了
```

## 画像圧縮（クライアントサイド）

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant W as Web Worker
    participant C as Canvas API

    U->>F: 大容量画像選択
    Note over U,F: 20MB JPEG
    
    F->>W: Worker起動
    Note over F,W: 圧縮処理を別スレッド
    
    W->>C: Canvas作成
    
    W->>C: 画像読み込み
    Note over C: createImageBitmap
    
    W->>C: リサイズ処理
    Note over C: 最大幅2048px
    
    W->>C: 品質調整
    Note over C: quality: 0.8
    
    W->>W: Blob生成
    Note over W: canvas.toBlob()
    
    W-->>F: 圧縮完了
    Note over W,F: 2MB に圧縮
    
    F-->>U: "圧縮完了"
    F->>A: アップロード
```

## 画像の遅延読み込み

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant IO as IntersectionObserver
    participant CDN as CDN

    B->>B: ページロード
    B->>B: プレースホルダー表示
    Note over B: 低解像度/ブラー画像
    
    U->>B: スクロール
    
    IO->>IO: 画像要素検出
    Note over IO: viewport内
    
    IO->>B: 交差イベント
    
    B->>CDN: 高解像度画像リクエスト
    CDN-->>B: 画像データ
    
    B->>B: 画像差し替え
    Note over B: フェードイン効果
    
    B-->>U: 高解像度表示
```

## 画像メタデータ処理

```mermaid
sequenceDiagram
    participant F as フロントエンド
    participant A as API Server
    participant E as EXIF Parser
    participant D as Database

    F->>A: POST /api/upload
    Note over F,A: 画像 with EXIF
    
    A->>E: メタデータ抽出
    
    E->>E: EXIF解析
    Note over E: 撮影日時
    Note over E: GPS座標
    Note over E: カメラ情報
    
    E-->>A: メタデータ
    
    A->>A: プライバシー処理
    Note over A: GPS削除オプション
    
    A->>D: メタデータ保存
    Note over D: 検索用インデックス
    
    A-->>F: アップロード完了
```

## 画像ギャラリー表示

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant G as Gallery Component
    participant L as Lightbox

    U->>F: ギャラリーページ
    
    F->>G: ギャラリー初期化
    
    G->>G: グリッドレイアウト
    Note over G: Masonry layout
    
    G->>G: サムネイル表示
    
    U->>G: 画像クリック
    
    G->>L: Lightbox起動
    
    L->>L: フルスクリーン表示
    L->>L: ズーム/パン機能
    
    L-->>U: 画像詳細表示
    
    U->>L: スワイプ/矢印
    L->>L: 次の画像
    
    U->>L: ESCキー
    L->>G: Lightbox終了
    G-->>U: ギャラリー表示
```

## 画像のウォーターマーク

```mermaid
sequenceDiagram
    participant A as API Server
    participant C as Cloudinary
    participant T as Transformation

    A->>C: アップロード with 設定
    Note over A,C: watermark option
    
    C->>T: 変換チェーン
    
    T->>T: ウォーターマーク合成
    Note over T: ロゴ/テキスト
    Note over T: 位置、透明度
    
    T->>T: 保護版生成
    Note over T: ダウンロード用
    
    T->>T: 表示版生成
    Note over T: ウォーターマークなし
    Note over T: 低解像度
    
    T-->>C: 複数バージョン
    C-->>A: URLs返却
```