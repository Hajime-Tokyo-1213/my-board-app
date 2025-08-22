# SNS機能設計書

## 1. 概要
本設計書は、Next.js 15、MongoDB、Material UIを使用したSNS機能の実装設計をまとめたものです。

## 2. 機能要件

### 2.1 実装する機能
1. **ユーザーフォロー/フォロワー機能**
   - ユーザー間のフォロー関係の管理
   - フォロー/フォロワー一覧表示

2. **タイムライン機能**
   - フォローしているユーザーの投稿を時系列で表示
   - リアルタイム更新対応

3. **いいね機能**
   - 投稿への「いいね」の追加/削除
   - いいね数のカウント表示

4. **コメント機能**
   - 投稿へのコメント追加
   - コメントスレッド表示

5. **通知システム**
   - フォロー、いいね、コメントの通知
   - 未読/既読管理

## 3. データベース設計

### 3.1 既存スキーマの拡張

#### User Schema（拡張）
```typescript
interface IUser extends mongoose.Document {
  // 既存フィールド
  email: string;
  password: string;
  name: string;
  bio?: string;
  emailVerified: Date | null;
  verificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // 新規追加フィールド
  avatar?: string;                    // アバター画像URL
  followers: string[];                // フォロワーのユーザーID配列
  following: string[];                // フォロー中のユーザーID配列
  followersCount: number;             // フォロワー数（キャッシュ）
  followingCount: number;             // フォロー数（キャッシュ）
  postsCount: number;                 // 投稿数（キャッシュ）
  isPrivate: boolean;                 // プライベートアカウント設定
  notifications: {
    email: boolean;                   // メール通知設定
    push: boolean;                    // プッシュ通知設定
  };
}
```

#### Post Schema（拡張）
```typescript
interface IPost extends mongoose.Document {
  // 既存フィールド
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string;
  likes: string[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // 新規追加フィールド
  commentsCount: number;              // コメント数（キャッシュ）
  isRepost: boolean;                  // リポスト判定
  originalPostId?: string;            // リポスト元の投稿ID
  mentions: string[];                 // メンション対象ユーザーID配列
  hashtags: string[];                 // ハッシュタグ配列
  visibility: 'public' | 'followers' | 'private'; // 公開範囲
}
```

### 3.2 新規スキーマ

#### Follow Schema
```typescript
interface IFollow extends mongoose.Document {
  followerId: string;                 // フォローする人のID
  followingId: string;                // フォローされる人のID
  status: 'pending' | 'accepted';     // フォロー状態（プライベートアカウント対応）
  createdAt: Date;
}

// インデックス
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, status: 1 });
followSchema.index({ followerId: 1, status: 1 });
```

#### Comment Schema
```typescript
interface IComment extends mongoose.Document {
  postId: string;                      // 投稿ID
  authorId: string;                    // コメント投稿者ID
  authorName: string;                  // コメント投稿者名
  authorImage?: string;                // コメント投稿者画像
  content: string;                     // コメント内容
  parentCommentId?: string;            // 親コメントID（返信の場合）
  likes: string[];                     // いいねしたユーザーID配列
  likesCount: number;                  // いいね数
  repliesCount: number;                // 返信数
  mentions: string[];                  // メンション対象ユーザーID配列
  isEdited: boolean;                   // 編集済みフラグ
  createdAt: Date;
  updatedAt: Date;
}

// インデックス
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ parentCommentId: 1 });
```

#### Notification Schema
```typescript
interface INotification extends mongoose.Document {
  recipientId: string;                 // 通知受信者ID
  senderId: string;                    // 通知送信者ID
  senderName: string;                  // 通知送信者名
  senderImage?: string;                // 通知送信者画像
  type: 'follow' | 'like_post' | 'like_comment' | 'comment' | 'mention' | 'repost';
  targetId: string;                    // 対象ID（投稿ID、コメントIDなど）
  targetType: 'post' | 'comment' | 'user';
  message: string;                     // 通知メッセージ
  isRead: boolean;                     // 既読フラグ
  readAt?: Date;                       // 既読日時
  createdAt: Date;
}

// インデックス
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
```

#### Timeline Schema（キャッシュ用）
```typescript
interface ITimeline extends mongoose.Document {
  userId: string;                      // ユーザーID
  postIds: string[];                   // タイムラインに表示する投稿ID配列
  lastUpdated: Date;                   // 最終更新日時
}

// インデックス
timelineSchema.index({ userId: 1 }, { unique: true });
```

## 4. API設計

### 4.1 フォロー関連API

#### POST /api/follows/:userId
フォロー/フォロー解除
```typescript
// Request
{
  action: 'follow' | 'unfollow'
}

// Response
{
  success: boolean;
  message: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
}
```

#### GET /api/users/:userId/followers
フォロワー一覧取得
```typescript
// Query Parameters
{
  page?: number;
  limit?: number;
}

// Response
{
  followers: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    isFollowing: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

#### GET /api/users/:userId/following
フォロー中ユーザー一覧取得
```typescript
// Query Parameters
{
  page?: number;
  limit?: number;
}

// Response
{
  following: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    isFollowing: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### 4.2 タイムライン関連API

#### GET /api/timeline
タイムライン取得
```typescript
// Query Parameters
{
  page?: number;
  limit?: number;
  type?: 'home' | 'following' | 'trending';
}

// Response
{
  posts: Array<{
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    likes: string[];
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isRepost: boolean;
    originalPost?: object;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### 4.3 いいね関連API

#### POST /api/posts/:postId/like
投稿へのいいね追加/削除
```typescript
// Response
{
  success: boolean;
  liked: boolean;
  likesCount: number;
}
```

#### POST /api/comments/:commentId/like
コメントへのいいね追加/削除
```typescript
// Response
{
  success: boolean;
  liked: boolean;
  likesCount: number;
}
```

### 4.4 コメント関連API

#### POST /api/posts/:postId/comments
コメント投稿
```typescript
// Request
{
  content: string;
  parentCommentId?: string;
  mentions?: string[];
}

// Response
{
  success: boolean;
  comment: {
    id: string;
    content: string;
    author: object;
    likes: string[];
    likesCount: number;
    repliesCount: number;
    createdAt: Date;
  };
}
```

#### GET /api/posts/:postId/comments
コメント一覧取得
```typescript
// Query Parameters
{
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'popular';
}

// Response
{
  comments: Array<{
    id: string;
    content: string;
    author: object;
    likes: string[];
    likesCount: number;
    replies?: Array<object>;
    repliesCount: number;
    isLiked: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

#### PUT /api/comments/:commentId
コメント編集
```typescript
// Request
{
  content: string;
}

// Response
{
  success: boolean;
  comment: object;
}
```

#### DELETE /api/comments/:commentId
コメント削除
```typescript
// Response
{
  success: boolean;
  message: string;
}
```

### 4.5 通知関連API

#### GET /api/notifications
通知一覧取得
```typescript
// Query Parameters
{
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

// Response
{
  notifications: Array<{
    id: string;
    type: string;
    sender: object;
    message: string;
    targetId: string;
    targetType: string;
    isRead: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}
```

#### PUT /api/notifications/:notificationId/read
通知既読化
```typescript
// Response
{
  success: boolean;
  notification: object;
}
```

#### PUT /api/notifications/read-all
全通知既読化
```typescript
// Response
{
  success: boolean;
  updatedCount: number;
}
```

#### GET /api/notifications/unread-count
未読通知数取得
```typescript
// Response
{
  count: number;
}
```

## 5. リアルタイム機能

### 5.1 WebSocket実装
Socket.IOを使用したリアルタイム通信

#### イベント一覧
```typescript
// クライアント → サーバー
socket.emit('join-room', { userId });
socket.emit('leave-room', { userId });

// サーバー → クライアント
socket.on('new-notification', { notification });
socket.on('timeline-update', { post });
socket.on('comment-added', { postId, comment });
socket.on('like-updated', { targetId, targetType, likesCount });
```

## 6. セキュリティ考慮事項

### 6.1 認証・認可
- JWTトークンベースの認証
- APIレート制限の実装
- CORS設定の適切な管理

### 6.2 データ検証
- 入力値のサニタイゼーション
- SQLインジェクション対策
- XSS対策

### 6.3 プライバシー
- プライベートアカウント機能
- ブロック機能の実装
- 削除されたコンテンツの適切な処理

## 7. パフォーマンス最適化

### 7.1 キャッシュ戦略
- Redisを使用したタイムラインキャッシュ
- 頻繁にアクセスされるデータのメモリキャッシュ
- CDNを使用した静的アセットの配信

### 7.2 データベース最適化
- 適切なインデックスの設定
- 集計値のキャッシュ（フォロワー数、いいね数など）
- ページネーションの実装

### 7.3 非同期処理
- 通知送信の非同期化
- タイムライン更新のバックグラウンド処理
- 画像アップロードの非同期処理

## 8. フロントエンド実装方針

### 8.1 コンポーネント構成
```
components/
├── sns/
│   ├── Timeline/
│   │   ├── TimelineContainer.tsx
│   │   ├── TimelinePost.tsx
│   │   └── TimelineFilter.tsx
│   ├── Follow/
│   │   ├── FollowButton.tsx
│   │   ├── FollowersList.tsx
│   │   └── FollowingList.tsx
│   ├── Comments/
│   │   ├── CommentForm.tsx
│   │   ├── CommentList.tsx
│   │   └── CommentItem.tsx
│   ├── Notifications/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationList.tsx
│   │   └── NotificationItem.tsx
│   └── common/
│       ├── LikeButton.tsx
│       ├── ShareButton.tsx
│       └── UserAvatar.tsx
```

### 8.2 状態管理
- React Context APIまたはZustandを使用
- リアルタイムデータの管理
- オプティミスティックUI更新

### 8.3 UI/UX設計
- Material UIコンポーネントの活用
- レスポンシブデザイン
- ローディング状態の適切な表示
- エラーハンドリング

## 9. テスト戦略

### 9.1 単体テスト
- APIエンドポイントのテスト
- データベースモデルのテスト
- ユーティリティ関数のテスト

### 9.2 統合テスト
- API統合テスト
- WebSocketイベントのテスト
- 認証フローのテスト

### 9.3 E2Eテスト
- ユーザーフローのテスト
- リアルタイム機能のテスト
- パフォーマンステスト

## 10. デプロイメント

### 10.1 環境構成
- 開発環境
- ステージング環境
- 本番環境

### 10.2 CI/CD
- GitHub Actionsを使用した自動デプロイ
- 自動テストの実行
- コード品質チェック

### 10.3 モニタリング
- エラートラッキング（Sentry）
- パフォーマンスモニタリング
- ログ管理

## 11. 今後の拡張予定

### Phase 1（優先度高）
- 基本的なフォロー機能
- タイムライン表示
- いいね機能
- シンプルなコメント機能

### Phase 2（優先度中）
- リアルタイム通知
- コメントへの返信
- メンション機能
- ハッシュタグ機能

### Phase 3（優先度低）
- ダイレクトメッセージ
- グループ機能
- ストーリー機能
- ライブ配信機能