# ユーザー検索機能 設計書

## 1. 機能概要

ユーザー検索機能は、プラットフォーム上のユーザーを効率的に検索・発見できる機能を提供します。
日本語入力に完全対応し、リアルタイムサジェスト、検索履歴、おすすめユーザー表示などの機能を含みます。

## 2. アーキテクチャ

### 2.1 システム構成

```
┌─────────────────────────────────────────────────┐
│                  フロントエンド                    │
├─────────────────────────────────────────────────┤
│  UserSearchBox    │  UserSearchResults          │
│  (検索入力)        │  (検索結果表示)              │
│                   │                              │
│  SearchHistory    │  RecommendedUsers           │
│  (検索履歴)        │  (おすすめユーザー)           │
└─────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────┐
│                    API層                         │
├─────────────────────────────────────────────────┤
│  /api/users/search     │  検索API               │
│  /api/users/suggest    │  サジェストAPI          │
│  /api/users/recommend  │  おすすめAPI            │
│  /api/search/history   │  検索履歴API            │
└─────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────┐
│                  データベース層                    │
├─────────────────────────────────────────────────┤
│  Users Collection      │  ユーザー情報           │
│  SearchHistory         │  検索履歴              │
│  UserRelations         │  ユーザー関係性         │
└─────────────────────────────────────────────────┘
```

## 3. データモデル設計

### 3.1 User モデル拡張

```typescript
interface IUser {
  // 既存フィールド
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  profileImage?: string;
  
  // 検索用フィールド
  username: string;           // ユニークなユーザー名
  displayName: string;         // 表示名
  bio?: string;               // 自己紹介
  searchableText: string;      // 検索用テキスト（自動生成）
  
  // メタデータ
  followersCount: number;      // フォロワー数
  followingCount: number;      // フォロー数
  postsCount: number;         // 投稿数
  lastActiveAt: Date;         // 最終活動日時
  
  // 検索最適化
  searchRank: number;         // 検索ランク（人気度）
  tags: string[];             // ユーザータグ
  language: string[];         // 使用言語
}
```

### 3.2 SearchHistory モデル

```typescript
interface ISearchHistory {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  query: string;              // 検索クエリ
  queryNormalized: string;    // 正規化されたクエリ
  searchType: 'user' | 'content' | 'hashtag';
  results: {
    count: number;
    clickedResults: mongoose.Types.ObjectId[];
  };
  timestamp: Date;
}
```

### 3.3 UserRelation モデル

```typescript
interface IUserRelation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  relationType: 'follow' | 'block' | 'mute';
  score: number;              // 関係性スコア
  interactions: {
    likes: number;
    comments: number;
    mentions: number;
  };
  createdAt: Date;
}
```

## 4. 検索アルゴリズム

### 4.1 日本語対応検索

```typescript
class JapaneseSearchEngine {
  // ひらがな・カタカナ変換
  toHiragana(text: string): string
  toKatakana(text: string): string
  
  // 検索用正規化
  normalize(text: string): string {
    // 1. 全角半角統一
    // 2. ひらがな・カタカナ両方で検索
    // 3. 漢字の読み仮名対応
    // 4. 英数字の正規化
  }
  
  // あいまい検索
  fuzzySearch(query: string, options: {
    threshold: number;      // 類似度閾値
    includePhonetic: boolean; // 読み仮名検索
    includePartial: boolean;  // 部分一致
  })
}
```

### 4.2 スコアリングアルゴリズム

```typescript
interface SearchScore {
  textRelevance: number;     // テキスト関連性 (0-40)
  userPopularity: number;    // ユーザー人気度 (0-30)
  socialConnection: number;  // ソーシャル接続度 (0-20)
  activityRecency: number;   // 活動の最新性 (0-10)
  
  totalScore: number;        // 合計スコア (0-100)
}

function calculateSearchScore(
  user: IUser,
  query: string,
  currentUserId: string
): SearchScore {
  // 1. テキスト関連性の計算
  // 2. ユーザー人気度の計算
  // 3. ソーシャル接続度の計算
  // 4. 活動の最新性の計算
}
```

## 5. API設計

### 5.1 ユーザー検索 API

```typescript
// GET /api/users/search
interface SearchRequest {
  q: string;              // 検索クエリ
  type?: 'all' | 'name' | 'username' | 'bio';
  limit?: number;         // 結果数（デフォルト: 20）
  offset?: number;        // オフセット
  sort?: 'relevance' | 'popularity' | 'recent';
  filters?: {
    hasImage?: boolean;
    isActive?: boolean;
    minFollowers?: number;
  };
}

interface SearchResponse {
  users: UserSearchResult[];
  totalCount: number;
  suggestions: string[];  // 検索候補
  relatedTags: string[];
}
```

### 5.2 サジェスト API

```typescript
// GET /api/users/suggest
interface SuggestRequest {
  q: string;              // 入力中のクエリ
  limit?: number;         // 候補数（デフォルト: 5）
  includeHistory?: boolean;
}

interface SuggestResponse {
  suggestions: Array<{
    type: 'user' | 'query' | 'history';
    value: string;
    metadata?: {
      userId?: string;
      username?: string;
      profileImage?: string;
      count?: number;
    };
  }>;
}
```

### 5.3 おすすめユーザー API

```typescript
// GET /api/users/recommend
interface RecommendRequest {
  userId?: string;
  limit?: number;
  type?: 'similar' | 'popular' | 'active' | 'new';
}

interface RecommendResponse {
  users: Array<{
    user: UserSearchResult;
    reason: string;       // おすすめ理由
    score: number;        // おすすめスコア
  }>;
}
```

## 6. UI/UXコンポーネント設計

### 6.1 UserSearchBox

```typescript
interface UserSearchBoxProps {
  onSearch: (query: string) => void;
  onUserSelect: (userId: string) => void;
  placeholder?: string;
  showHistory?: boolean;
  showSuggestions?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
}

// 機能
- リアルタイムサジェスト（300ms デバウンス）
- 検索履歴表示
- キーボードナビゲーション
- 音声入力対応
- クリアボタン
```

### 6.2 UserSearchResults

```typescript
interface UserSearchResultsProps {
  query: string;
  results: UserSearchResult[];
  loading: boolean;
  viewMode?: 'grid' | 'list';
  onUserClick: (userId: string) => void;
  onFollow: (userId: string) => void;
}

// 表示要素
- ユーザーアバター
- 名前・ユーザー名
- 自己紹介（一部）
- フォロワー数
- フォローボタン
- 共通のフォロワー表示
```

### 6.3 SearchHistory

```typescript
interface SearchHistoryProps {
  userId: string;
  onQueryClick: (query: string) => void;
  onClear: () => void;
  maxItems?: number;
}

// 機能
- 最近の検索表示
- 個別削除
- 全削除
- プライバシーモード
```

### 6.4 RecommendedUsers

```typescript
interface RecommendedUsersProps {
  userId?: string;
  type: 'similar' | 'popular' | 'active' | 'new';
  limit?: number;
  onUserClick: (userId: string) => void;
}

// 表示タイプ
- 似ているユーザー
- 人気ユーザー
- アクティブユーザー
- 新規ユーザー
```

## 7. パフォーマンス最適化

### 7.1 インデックス設計

```javascript
// MongoDB インデックス
db.users.createIndex({ 
  searchableText: "text",
  username: 1,
  displayName: 1 
});

db.users.createIndex({ 
  searchRank: -1,
  lastActiveAt: -1 
});

db.searchHistory.createIndex({ 
  userId: 1,
  timestamp: -1 
});
```

### 7.2 キャッシュ戦略

```typescript
interface CacheStrategy {
  // Redis キャッシュ
  suggestions: {
    ttl: 300,  // 5分
    key: `suggest:${query}`
  };
  
  // メモリキャッシュ
  popularUsers: {
    ttl: 3600, // 1時間
    key: 'users:popular'
  };
  
  // ブラウザキャッシュ
  searchHistory: {
    storage: 'localStorage',
    maxItems: 50
  };
}
```

### 7.3 検索最適化

```typescript
class SearchOptimizer {
  // デバウンス処理
  debounce(fn: Function, delay: number): Function;
  
  // 検索結果のページネーション
  paginate(results: any[], page: number, limit: number);
  
  // インクリメンタル検索
  incrementalSearch(query: string, cache: Map<string, any>);
  
  // 検索クエリの最適化
  optimizeQuery(query: string): string {
    // 1. 不要な空白の削除
    // 2. 特殊文字のエスケープ
    // 3. 検索語の分解
    // 4. 同義語の展開
  }
}
```

## 8. セキュリティ考慮事項

### 8.1 プライバシー保護

- 検索履歴の暗号化
- プライベートアカウントの除外
- ブロックユーザーの非表示
- 検索履歴の自動削除オプション

### 8.2 レート制限

```typescript
interface RateLimit {
  search: {
    requests: 100,
    window: '1m'
  };
  suggest: {
    requests: 200,
    window: '1m'
  };
}
```

### 8.3 入力検証

- SQLインジェクション対策
- XSS対策
- 検索クエリ長の制限（最大100文字）
- 特殊文字のサニタイズ

## 9. 実装優先順位

1. **Phase 1: 基本検索機能**
   - User モデルの拡張
   - 基本的な検索API
   - シンプルな検索UI

2. **Phase 2: 日本語対応**
   - ひらがな・カタカナ変換
   - あいまい検索
   - 日本語サジェスト

3. **Phase 3: 高度な機能**
   - リアルタイムサジェスト
   - 検索履歴
   - おすすめユーザー

4. **Phase 4: 最適化**
   - キャッシュ実装
   - パフォーマンス改善
   - UIの洗練

## 10. テスト計画

### 10.1 単体テスト

- 検索アルゴリズムのテスト
- 日本語変換のテスト
- スコアリングのテスト

### 10.2 統合テスト

- API エンドポイントのテスト
- データベースクエリのテスト
- キャッシュの動作テスト

### 10.3 パフォーマンステスト

- 大量データでの検索速度
- 同時接続数のテスト
- メモリ使用量の監視