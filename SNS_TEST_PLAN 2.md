# SNS機能テスト計画書

## 1. テスト概要

### 1.1 目的
SNS機能（フォロー、タイムライン、いいね、コメント、通知）の品質保証と信頼性確保

### 1.2 テスト環境
- **開発環境**: Node.js 20+, Next.js 15, MongoDB 7.0
- **テストフレームワーク**: Jest, Playwright, React Testing Library
- **CI/CD**: GitHub Actions
- **モニタリング**: Sentry, DataDog

### 1.3 テスト戦略
- ピラミッド型テスト（単体テスト > 統合テスト > E2Eテスト）
- TDD（テスト駆動開発）アプローチ
- 継続的インテグレーション

## 2. テストカテゴリと優先順位

### 優先度: Critical（必須）
これらのテストは最初に実装し、常に100%パスする必要があります。

| カテゴリ | 説明 | カバレッジ目標 |
|---------|------|--------------|
| 認証・認可 | ユーザー認証とアクセス制御 | 100% |
| データ整合性 | データベースの一貫性保証 | 95% |
| セキュリティ | XSS、CSRF、SQLインジェクション対策 | 100% |
| 基本CRUD | フォロー、投稿、コメントの作成・削除 | 90% |

### 優先度: High（重要）
主要機能の動作を保証するテスト

| カテゴリ | 説明 | カバレッジ目標 |
|---------|------|--------------|
| タイムライン | フィード生成と表示 | 85% |
| 通知システム | リアルタイム通知の配信 | 85% |
| パフォーマンス | レスポンスタイムとスループット | 80% |
| UI/UX | ユーザーインタラクション | 80% |

### 優先度: Medium（標準）
エッジケースとエラーハンドリング

| カテゴリ | 説明 | カバレッジ目標 |
|---------|------|--------------|
| エラー処理 | 異常系のハンドリング | 75% |
| バリデーション | 入力値検証 | 80% |
| 並行処理 | 同時アクセス時の動作 | 70% |
| キャッシュ | キャッシュの一貫性 | 70% |

### 優先度: Low（補助的）
追加的な品質向上のためのテスト

| カテゴリ | 説明 | カバレッジ目標 |
|---------|------|--------------|
| アクセシビリティ | WCAG準拠 | 60% |
| 国際化 | 多言語対応 | 50% |
| ブラウザ互換性 | クロスブラウザテスト | 70% |

## 3. 単体テスト（Unit Tests）

### 3.1 モデル層テスト

#### User Model Tests
```typescript
// tests/models/User.test.ts
describe('User Model', () => {
  describe('Follow Functionality', () => {
    test('should add follower to user', async () => {
      const user1 = await User.create(mockUser1);
      const user2 = await User.create(mockUser2);
      
      await user1.addFollower(user2.id);
      
      expect(user1.followers).toContain(user2.id);
      expect(user1.followersCount).toBe(1);
    });

    test('should prevent duplicate follows', async () => {
      const user1 = await User.create(mockUser1);
      const user2 = await User.create(mockUser2);
      
      await user1.addFollower(user2.id);
      await expect(user1.addFollower(user2.id))
        .rejects.toThrow('Already following');
    });

    test('should handle follow limits', async () => {
      const user = await User.create(mockUser1);
      const MAX_FOLLOWS = 5000;
      
      // フォロー上限のテスト
      user.followingCount = MAX_FOLLOWS;
      await expect(user.follow(anotherUserId))
        .rejects.toThrow('Follow limit reached');
    });
  });
});
```

#### Comment Model Tests
```typescript
// tests/models/Comment.test.ts
describe('Comment Model', () => {
  describe('Validation', () => {
    test('should reject empty content', async () => {
      const comment = new Comment({ content: '' });
      await expect(comment.save())
        .rejects.toThrow('Content is required');
    });

    test('should sanitize HTML in content', async () => {
      const comment = new Comment({
        content: '<script>alert("XSS")</script>Hello',
        postId: validPostId,
        authorId: validUserId
      });
      
      await comment.save();
      expect(comment.content).toBe('Hello');
    });

    test('should enforce content length limit', async () => {
      const longContent = 'a'.repeat(1001);
      const comment = new Comment({ content: longContent });
      
      await expect(comment.save())
        .rejects.toThrow('Content exceeds maximum length');
    });
  });

  describe('Nested Comments', () => {
    test('should create reply to comment', async () => {
      const parentComment = await Comment.create(mockComment);
      const reply = await Comment.create({
        ...mockReply,
        parentCommentId: parentComment.id
      });
      
      expect(reply.parentCommentId).toBe(parentComment.id);
      expect(parentComment.repliesCount).toBe(1);
    });

    test('should limit nesting depth', async () => {
      // 最大3階層までのネスト制限
      const level1 = await Comment.create(mockComment);
      const level2 = await Comment.create({
        ...mockReply,
        parentCommentId: level1.id
      });
      const level3 = await Comment.create({
        ...mockReply,
        parentCommentId: level2.id
      });
      
      await expect(Comment.create({
        ...mockReply,
        parentCommentId: level3.id
      })).rejects.toThrow('Maximum nesting depth exceeded');
    });
  });
});
```

### 3.2 ビジネスロジックテスト

#### Timeline Service Tests
```typescript
// tests/services/timeline.test.ts
describe('Timeline Service', () => {
  describe('Feed Generation', () => {
    test('should generate personalized timeline', async () => {
      const userId = 'user123';
      const timeline = await TimelineService.generate(userId);
      
      expect(timeline.posts).toBeDefined();
      expect(timeline.posts.length).toBeLessThanOrEqual(50);
      expect(timeline.posts[0].createdAt)
        .toBeGreaterThan(timeline.posts[1].createdAt);
    });

    test('should filter blocked users from timeline', async () => {
      const userId = 'user123';
      const blockedUserId = 'blocked456';
      await User.block(userId, blockedUserId);
      
      const timeline = await TimelineService.generate(userId);
      const blockedPosts = timeline.posts.filter(
        post => post.authorId === blockedUserId
      );
      
      expect(blockedPosts).toHaveLength(0);
    });

    test('should handle empty timeline gracefully', async () => {
      const newUserId = 'newuser789';
      const timeline = await TimelineService.generate(newUserId);
      
      expect(timeline.posts).toEqual([]);
      expect(timeline.suggestedUsers).toBeDefined();
      expect(timeline.suggestedUsers.length).toBeGreaterThan(0);
    });
  });

  describe('Timeline Caching', () => {
    test('should cache timeline for performance', async () => {
      const userId = 'user123';
      
      const start1 = Date.now();
      const timeline1 = await TimelineService.generate(userId);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      const timeline2 = await TimelineService.generate(userId);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1 / 2); // キャッシュは2倍以上高速
      expect(timeline1).toEqual(timeline2);
    });

    test('should invalidate cache on new post', async () => {
      const userId = 'user123';
      const timeline1 = await TimelineService.generate(userId);
      
      await Post.create({ authorId: userId, content: 'New post' });
      
      const timeline2 = await TimelineService.generate(userId);
      expect(timeline2.posts[0].content).toBe('New post');
    });
  });
});
```

#### Notification Service Tests
```typescript
// tests/services/notification.test.ts
describe('Notification Service', () => {
  describe('Notification Creation', () => {
    test('should create follow notification', async () => {
      const follower = await User.create(mockUser1);
      const following = await User.create(mockUser2);
      
      await NotificationService.notifyFollow(
        follower.id,
        following.id
      );
      
      const notifications = await Notification.find({
        recipientId: following.id
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('follow');
      expect(notifications[0].senderId).toBe(follower.id);
    });

    test('should batch similar notifications', async () => {
      const postId = 'post123';
      const authorId = 'author456';
      
      // 複数のいいねを短期間に受信
      for (let i = 0; i < 5; i++) {
        await NotificationService.notifyLike(
          `user${i}`,
          authorId,
          postId
        );
      }
      
      const notifications = await Notification.find({
        recipientId: authorId,
        targetId: postId
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message)
        .toContain('5 people liked your post');
    });

    test('should respect notification preferences', async () => {
      const user = await User.create({
        ...mockUser1,
        notifications: { email: false, push: false }
      });
      
      await NotificationService.notifyFollow('follower123', user.id);
      
      const emailsSent = await EmailQueue.count({
        recipientId: user.id
      });
      
      expect(emailsSent).toBe(0);
    });
  });

  describe('Real-time Delivery', () => {
    test('should emit WebSocket event for online users', async () => {
      const recipientId = 'user123';
      const mockSocket = { emit: jest.fn() };
      WebSocketManager.addClient(recipientId, mockSocket);
      
      await NotificationService.notifyComment(
        'commenter456',
        recipientId,
        'post789'
      );
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'new-notification',
        expect.objectContaining({
          type: 'comment'
        })
      );
    });
  });
});
```

## 4. 統合テスト（Integration Tests）

### 4.1 API エンドポイントテスト

#### Follow API Tests
```typescript
// tests/api/follows.test.ts
describe('Follow API', () => {
  let authToken: string;
  let userId: string;
  let targetUserId: string;

  beforeEach(async () => {
    const { token, user } = await createAuthenticatedUser();
    authToken = token;
    userId = user.id;
    targetUserId = await createTestUser().id;
  });

  describe('POST /api/follows/:userId', () => {
    test('should follow user successfully', async () => {
      const response = await request(app)
        .post(`/api/follows/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'follow' });
      
      expect(response.status).toBe(200);
      expect(response.body.following).toBe(true);
      expect(response.body.followersCount).toBe(1);
    });

    test('should unfollow user successfully', async () => {
      // まずフォロー
      await request(app)
        .post(`/api/follows/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'follow' });
      
      // アンフォロー
      const response = await request(app)
        .post(`/api/follows/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'unfollow' });
      
      expect(response.status).toBe(200);
      expect(response.body.following).toBe(false);
      expect(response.body.followersCount).toBe(0);
    });

    test('should prevent self-follow', async () => {
      const response = await request(app)
        .post(`/api/follows/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'follow' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot follow yourself');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/follows/${targetUserId}`)
        .send({ action: 'follow' });
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/:userId/followers', () => {
    test('should return paginated followers list', async () => {
      // 複数のフォロワーを作成
      for (let i = 0; i < 15; i++) {
        const follower = await createTestUser();
        await followUser(follower.id, targetUserId);
      }
      
      const response = await request(app)
        .get(`/api/users/${targetUserId}/followers`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.followers).toHaveLength(10);
      expect(response.body.total).toBe(15);
      expect(response.body.page).toBe(1);
    });

    test('should indicate mutual follow status', async () => {
      await followUser(userId, targetUserId);
      await followUser(targetUserId, userId);
      
      const response = await request(app)
        .get(`/api/users/${targetUserId}/followers`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const mutualFollower = response.body.followers.find(
        f => f.id === userId
      );
      
      expect(mutualFollower.isFollowing).toBe(true);
    });
  });
});
```

#### Timeline API Tests
```typescript
// tests/api/timeline.test.ts
describe('Timeline API', () => {
  describe('GET /api/timeline', () => {
    test('should return personalized timeline', async () => {
      const { token, user } = await createAuthenticatedUser();
      
      // フォローする人の投稿を作成
      const following = await createTestUser();
      await followUser(user.id, following.id);
      await createPost(following.id, 'Following post');
      
      // フォローしていない人の投稿を作成
      const stranger = await createTestUser();
      await createPost(stranger.id, 'Stranger post');
      
      const response = await request(app)
        .get('/api/timeline')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      
      const postContents = response.body.posts.map(p => p.content);
      expect(postContents).toContain('Following post');
      expect(postContents).not.toContain('Stranger post');
    });

    test('should support timeline filters', async () => {
      const { token } = await createAuthenticatedUser();
      
      const response = await request(app)
        .get('/api/timeline')
        .query({ type: 'trending' })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      // トレンド投稿はいいね数でソート
      expect(response.body.posts[0].likesCount)
        .toBeGreaterThanOrEqual(response.body.posts[1]?.likesCount || 0);
    });

    test('should handle rate limiting', async () => {
      const { token } = await createAuthenticatedUser();
      
      // 短時間に大量リクエスト
      const requests = Array(50).fill(null).map(() =>
        request(app)
          .get('/api/timeline')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

### 4.2 WebSocketテスト

```typescript
// tests/websocket/notifications.test.ts
describe('WebSocket Notifications', () => {
  let io: Server;
  let clientSocket: Socket;
  let serverSocket: Socket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  test('should receive real-time notification', (done) => {
    const userId = 'user123';
    const notification = {
      type: 'follow',
      senderId: 'follower456',
      message: 'New follower'
    };

    clientSocket.emit('join-room', { userId });
    
    clientSocket.on('new-notification', (data) => {
      expect(data).toEqual(notification);
      done();
    });

    serverSocket.emit('new-notification', notification);
  });

  test('should handle connection loss gracefully', async () => {
    const userId = 'user123';
    
    clientSocket.emit('join-room', { userId });
    serverSocket.disconnect();
    
    // 再接続を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(clientSocket.connected).toBe(true);
  });
});
```

## 5. E2Eテスト（End-to-End Tests）

### 5.1 ユーザーフロー テスト

```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SNS User Journey', () => {
  test('complete social interaction flow', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    // 2. ユーザー検索とフォロー
    await page.goto('/users');
    await page.fill('[placeholder="Search users"]', 'Jane');
    await page.click('text=Jane Doe');
    await page.click('button:has-text("Follow")');
    await expect(page.locator('button:has-text("Following")')).toBeVisible();
    
    // 3. 投稿の作成
    await page.goto('/');
    await page.click('button:has-text("New Post")');
    await page.fill('[name="content"]', 'Hello SNS world! #firstpost');
    await page.click('button:has-text("Post")');
    
    // 4. タイムラインで投稿を確認
    await page.goto('/timeline');
    await expect(page.locator('text=Hello SNS world!')).toBeVisible();
    
    // 5. いいねとコメント
    await page.click('[aria-label="Like post"]');
    await expect(page.locator('[aria-label="Unlike post"]')).toBeVisible();
    
    await page.click('button:has-text("Comment")');
    await page.fill('[placeholder="Write a comment"]', 'Great post!');
    await page.click('button:has-text("Send")');
    await expect(page.locator('text=Great post!')).toBeVisible();
    
    // 6. 通知の確認
    await page.click('[aria-label="Notifications"]');
    await expect(page.locator('.notification-badge')).toContainText('1');
    await page.click('.notification-bell');
    await expect(page.locator('text=liked your post')).toBeVisible();
  });

  test('mobile responsive flow', async ({ page, browserName }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // ハンバーガーメニューのテスト
    await page.click('[aria-label="Menu"]');
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // スワイプジェスチャーのテスト
    const timeline = page.locator('.timeline-container');
    await timeline.swipe({ direction: 'down', distance: 100 });
    
    // 無限スクロールのテスト
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    const posts = await page.locator('.post-card').count();
    expect(posts).toBeGreaterThan(10);
  });
});
```

### 5.2 パフォーマンステスト

```typescript
// tests/e2e/performance.spec.ts
test.describe('Performance Tests', () => {
  test('timeline load performance', async ({ page }) => {
    await page.goto('/timeline');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        loadComplete: navigation.loadEventEnd,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    });
    
    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2秒以内
    expect(metrics.loadComplete).toBeLessThan(3000); // 3秒以内
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5秒以内
  });

  test('infinite scroll performance', async ({ page }) => {
    await page.goto('/timeline');
    
    const loadTimes = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      await page.evaluate(() => 
        window.scrollTo(0, document.body.scrollHeight)
      );
      
      await page.waitForLoadState('networkidle');
      
      loadTimes.push(Date.now() - startTime);
    }
    
    // 各ロードが1秒以内
    loadTimes.forEach(time => {
      expect(time).toBeLessThan(1000);
    });
    
    // 平均ロード時間が500ms以内
    const avgTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
    expect(avgTime).toBeLessThan(500);
  });
});
```

## 6. セキュリティテスト

### 6.1 認証・認可テスト

```typescript
// tests/security/auth.test.ts
describe('Authentication & Authorization', () => {
  test('should prevent unauthorized access to protected routes', async () => {
    const protectedRoutes = [
      '/api/timeline',
      '/api/posts',
      '/api/notifications',
      '/api/follows/user123'
    ];
    
    for (const route of protectedRoutes) {
      const response = await request(app).get(route);
      expect(response.status).toBe(401);
    }
  });

  test('should prevent JWT token manipulation', async () => {
    const validToken = generateToken({ userId: 'user123' });
    const manipulatedToken = validToken.replace(/.$/, 'X');
    
    const response = await request(app)
      .get('/api/timeline')
      .set('Authorization', `Bearer ${manipulatedToken}`);
    
    expect(response.status).toBe(401);
  });

  test('should enforce CORS policy', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://malicious-site.com');
    
    expect(response.headers['access-control-allow-origin'])
      .not.toBe('http://malicious-site.com');
  });
});
```

### 6.2 入力検証テスト

```typescript
// tests/security/validation.test.ts
describe('Input Validation', () => {
  test('should prevent XSS in post content', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(1)">',
      'javascript:alert(1)',
      '<svg onload="alert(1)">'
    ];
    
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: payload });
      
      const post = await Post.findById(response.body.id);
      expect(post.content).not.toContain('<script>');
      expect(post.content).not.toContain('javascript:');
      expect(post.content).not.toContain('onerror');
    }
  });

  test('should prevent SQL injection', async () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--"
    ];
    
    for (const payload of sqlPayloads) {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: payload })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).not.toBe(500);
      // データベースが正常に動作していることを確認
      const users = await User.find({});
      expect(users).toBeDefined();
    }
  });

  test('should enforce rate limiting', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Spam post' })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toContain('Too many requests');
  });
});
```

## 7. 負荷テスト

### 7.1 スケーラビリティテスト

```javascript
// tests/load/scalability.test.js
const autocannon = require('autocannon');

describe('Load Testing', () => {
  test('should handle 1000 concurrent timeline requests', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/timeline',
      connections: 100,
      pipelining: 10,
      duration: 30,
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.requests.average).toBeGreaterThan(100); // 100+ req/s
    expect(result.latency.p99).toBeLessThan(1000); // 99%が1秒以内
  });

  test('should handle spike traffic', async () => {
    // 通常負荷
    const normalLoad = await autocannon({
      url: 'http://localhost:3000/api/posts',
      connections: 10,
      duration: 10
    });
    
    // スパイク負荷（10倍）
    const spikeLoad = await autocannon({
      url: 'http://localhost:3000/api/posts',
      connections: 100,
      duration: 10
    });
    
    // エラー率が5%未満
    const errorRate = spikeLoad.errors / spikeLoad.requests.total;
    expect(errorRate).toBeLessThan(0.05);
  });
});
```

## 8. テスト実行計画

### 8.1 開発フェーズ
```bash
# 単体テスト（開発中に頻繁に実行）
npm run test:unit -- --watch

# 統合テスト（機能完成時）
npm run test:integration

# カバレッジ確認
npm run test:coverage
```

### 8.2 CI/CDパイプライン
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        test-type: [unit, integration, e2e]
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ${{ matrix.test-type }} tests
        run: npm run test:${{ matrix.test-type }}
      
      - name: Upload coverage
        if: matrix.test-type == 'unit'
        uses: codecov/codecov-action@v2
```

### 8.3 リリース前チェックリスト

- [ ] 全単体テストがパス（カバレッジ80%以上）
- [ ] 全統合テストがパス
- [ ] E2Eテストがパス
- [ ] セキュリティテストがパス
- [ ] パフォーマンステストがパス
- [ ] 負荷テストがパス
- [ ] アクセシビリティテストがパス
- [ ] ブラウザ互換性テスト完了
- [ ] モバイルテスト完了

## 9. テストデータ管理

### 9.1 テストフィクスチャ
```typescript
// tests/fixtures/users.ts
export const testUsers = {
  alice: {
    email: 'alice@test.com',
    password: 'Alice123!',
    name: 'Alice Test',
    followers: [],
    following: []
  },
  bob: {
    email: 'bob@test.com',
    password: 'Bob123!',
    name: 'Bob Test',
    followers: ['alice'],
    following: ['alice']
  }
};

// tests/fixtures/posts.ts
export const testPosts = {
  public: {
    content: 'Public test post',
    visibility: 'public',
    likes: [],
    comments: []
  },
  followersOnly: {
    content: 'Followers only post',
    visibility: 'followers',
    likes: ['alice'],
    comments: []
  }
};
```

### 9.2 データベースシーディング
```typescript
// tests/helpers/seed.ts
export async function seedDatabase() {
  // テスト用ユーザー作成
  const users = await User.insertMany(testUsers);
  
  // フォロー関係の設定
  await Follow.insertMany(testFollows);
  
  // テスト投稿の作成
  const posts = await Post.insertMany(testPosts);
  
  // 通知の作成
  await Notification.insertMany(testNotifications);
  
  return { users, posts };
}

export async function cleanDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Follow.deleteMany({}),
    Notification.deleteMany({})
  ]);
}
```

## 10. テストレポートとメトリクス

### 10.1 カバレッジ目標
| コンポーネント | 目標 | 現在 |
|--------------|-----|------|
| Models | 95% | - |
| Services | 90% | - |
| API Routes | 85% | - |
| UI Components | 80% | - |
| Utils | 100% | - |

### 10.2 品質メトリクス
- **テスト実行時間**: < 5分（単体）、< 15分（統合）、< 30分（E2E）
- **不具合検出率**: 開発フェーズで80%以上
- **リグレッション防止率**: 95%以上
- **テスト保守性**: 変更影響度を最小化

### 10.3 継続的改善
- 週次でテスト結果レビュー
- 月次でテストカバレッジ分析
- 四半期ごとにテスト戦略見直し