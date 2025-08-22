# API設計図

## RESTful API エンドポイント一覧

```mermaid
graph TB
    subgraph "認証 API"
        AUTH["/api/auth"]
        AUTH --> REGISTER["/register<br/>POST: ユーザー登録"]
        AUTH --> SIGNIN["/signin<br/>POST: サインイン"]
        AUTH --> SIGNOUT["/signout<br/>POST: サインアウト"]
        AUTH --> VERIFY["/verify-email<br/>POST: メール認証"]
        AUTH --> RESET["/reset-password<br/>POST: パスワードリセット"]
        AUTH --> REFRESH["/refresh<br/>POST: トークンリフレッシュ"]
    end
    
    subgraph "ユーザー API"
        USER["/api/users"]
        USER --> USER_SEARCH["/search<br/>GET: ユーザー検索"]
        USER --> USER_ID["/:userId<br/>GET: ユーザー詳細"]
        USER --> USER_UPDATE["/:userId<br/>PUT: ユーザー更新"]
        USER --> USER_DELETE["/:userId<br/>DELETE: ユーザー削除"]
        USER --> FOLLOWERS["/:userId/followers<br/>GET: フォロワー一覧"]
        USER --> FOLLOWING["/:userId/following<br/>GET: フォロー中一覧"]
    end
    
    subgraph "投稿 API"
        POST["/api/posts"]
        POST --> POST_LIST["/<br/>GET: 投稿一覧"]
        POST --> POST_CREATE["/<br/>POST: 投稿作成"]
        POST --> POST_ID["/:id<br/>GET: 投稿詳細"]
        POST --> POST_UPDATE["/:id<br/>PUT: 投稿更新"]
        POST --> POST_DELETE["/:id<br/>DELETE: 投稿削除"]
        POST --> POST_LIKE["/:id/like<br/>POST/DELETE: いいね"]
        POST --> POST_COMMENTS["/:id/comments<br/>GET/POST: コメント"]
    end
```

## API仕様詳細

### 認証エンドポイント

```yaml
openapi: 3.0.0
info:
  title: SNS Board API
  version: 1.0.0

paths:
  /api/auth/register:
    post:
      summary: ユーザー登録
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - username
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                username:
                  type: string
                  pattern: '^[a-zA-Z0-9_]{3,20}$'
                name:
                  type: string
      responses:
        201:
          description: 登録成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  userId:
                    type: string
        400:
          description: バリデーションエラー
        409:
          description: ユーザー既存

  /api/auth/signin:
    post:
      summary: サインイン
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        200:
          description: 認証成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        401:
          description: 認証失敗
```

### 投稿エンドポイント

```yaml
paths:
  /api/posts:
    get:
      summary: 投稿一覧取得
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
            maximum: 100
        - in: query
          name: sort
          schema:
            type: string
            enum: [newest, popular, trending]
        - in: query
          name: filter
          schema:
            type: string
            enum: [all, following, media]
      responses:
        200:
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  posts:
                    type: array
                    items:
                      $ref: '#/components/schemas/Post'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: 投稿作成
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - content
              properties:
                title:
                  type: string
                  maxLength: 100
                content:
                  type: string
                  maxLength: 5000
                images:
                  type: array
                  items:
                    type: string
                    format: binary
                hashtags:
                  type: array
                  items:
                    type: string
                mentions:
                  type: array
                  items:
                    type: string
      responses:
        201:
          description: 作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
```

## GraphQL スキーマ

```graphql
type Query {
  # ユーザー関連
  user(id: ID!): User
  users(filter: UserFilter, pagination: Pagination): UserConnection!
  currentUser: User
  
  # 投稿関連
  post(id: ID!): Post
  posts(filter: PostFilter, pagination: Pagination): PostConnection!
  timeline(pagination: Pagination): PostConnection!
  
  # 検索
  search(query: String!, type: SearchType): SearchResult!
  
  # 通知
  notifications(unreadOnly: Boolean): NotificationConnection!
  notificationCount: Int!
}

type Mutation {
  # 認証
  signUp(input: SignUpInput!): AuthPayload!
  signIn(input: SignInInput!): AuthPayload!
  signOut: Boolean!
  
  # 投稿
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  
  # インタラクション
  likePost(postId: ID!): Like!
  unlikePost(postId: ID!): Boolean!
  createComment(input: CreateCommentInput!): Comment!
  deleteComment(id: ID!): Boolean!
  
  # フォロー
  followUser(userId: ID!): Follow!
  unfollowUser(userId: ID!): Boolean!
  
  # 通知
  markNotificationAsRead(id: ID!): Notification!
  markAllNotificationsAsRead: Boolean!
}

type Subscription {
  # リアルタイム更新
  postCreated: Post!
  postUpdated(id: ID!): Post!
  
  # 通知
  notificationReceived: Notification!
  
  # タイムライン
  timelineUpdate: TimelineUpdate!
  
  # タイピングインジケーター
  userTyping(postId: ID!): TypingIndicator!
}
```

## API レート制限

```mermaid
graph LR
    subgraph "レート制限ティア"
        ANON[匿名ユーザー<br/>10 req/min]
        AUTH[認証済みユーザー<br/>60 req/min]
        PRO[Proユーザー<br/>300 req/min]
        API[API Key<br/>1000 req/min]
    end
    
    subgraph "エンドポイント別制限"
        SEARCH[検索API<br/>30 req/min]
        UPLOAD[アップロード<br/>10 req/min]
        POST_CREATE[投稿作成<br/>5 req/min]
        FOLLOW[フォロー<br/>20 req/min]
    end
```

## エラーレスポンス標準化

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "email",
        "message": "有効なメールアドレスを入力してください"
      }
    ],
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## API バージョニング戦略

```mermaid
graph TB
    subgraph "バージョニング方式"
        URL[URLパス方式<br/>/api/v1/posts]
        HEADER[ヘッダー方式<br/>API-Version: 1.0]
        QUERY[クエリパラメータ<br/>/api/posts?version=1]
    end
    
    subgraph "サポートポリシー"
        CURRENT[現行バージョン<br/>v2 - フル機能]
        DEPRECATED[非推奨<br/>v1 - 6ヶ月後廃止]
        SUNSET[廃止済み<br/>v0 - 404返却]
    end
```

## WebSocket API

```javascript
// WebSocket接続
ws://api.example.com/realtime

// 認証
{
  "type": "auth",
  "token": "jwt_token_here"
}

// ルーム参加
{
  "type": "join",
  "room": "post:123"
}

// イベント購読
{
  "type": "subscribe",
  "events": ["new_comment", "new_like", "typing"]
}

// メッセージ送信
{
  "type": "message",
  "data": {
    "content": "Hello",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## API セキュリティ

```mermaid
graph TB
    subgraph "認証方式"
        JWT[JWT Bearer Token]
        APIKEY[API Key]
        OAUTH[OAuth 2.0]
        SESSION[Session Cookie]
    end
    
    subgraph "セキュリティ対策"
        CORS[CORS設定]
        RATE[レート制限]
        VALIDATION[入力検証]
        SANITIZE[サニタイゼーション]
        CSRF[CSRF保護]
        XSS[XSS対策]
    end
    
    subgraph "暗号化"
        HTTPS[HTTPS必須]
        HASH[パスワードハッシュ<br/>bcrypt]
        ENCRYPT[データ暗号化<br/>AES-256]
    end
```

## API モニタリング

```yaml
monitoring:
  metrics:
    - response_time:
        p50: < 100ms
        p95: < 500ms
        p99: < 1000ms
    
    - availability:
        target: 99.9%
        
    - error_rate:
        threshold: < 1%
    
  alerts:
    - high_error_rate:
        condition: error_rate > 5%
        action: page_oncall
        
    - slow_response:
        condition: p95 > 1000ms
        action: notify_team
        
    - rate_limit_exceeded:
        condition: rate_limit_violations > 100/min
        action: auto_scale
        
  logging:
    - access_log:
        format: combined
        retention: 30_days
        
    - error_log:
        level: error
        retention: 90_days
        
    - audit_log:
        events: [create, update, delete]
        retention: 365_days
```

## API ドキュメント自動生成

```mermaid
graph LR
    subgraph "ドキュメント生成"
        CODE[コード<br/>TypeScript/JSDoc]
        OPENAPI[OpenAPI Spec<br/>swagger.yaml]
        POSTMAN[Postman<br/>Collection]
    end
    
    subgraph "ドキュメントツール"
        SWAGGER[Swagger UI]
        REDOC[ReDoc]
        SLATE[Slate]
    end
    
    CODE --> OPENAPI
    OPENAPI --> SWAGGER
    OPENAPI --> REDOC
    OPENAPI --> POSTMAN
```

## バッチ API

```json
// バッチリクエスト
POST /api/batch
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/api/posts/123"
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/api/posts/123/like"
    },
    {
      "id": "3",
      "method": "GET",
      "url": "/api/users/456"
    }
  ]
}

// バッチレスポンス
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "body": { /* post data */ }
    },
    {
      "id": "2",
      "status": 201,
      "body": { /* like data */ }
    },
    {
      "id": "3",
      "status": 200,
      "body": { /* user data */ }
    }
  ]
}
```