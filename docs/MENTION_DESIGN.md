# メンション機能設計書

## 概要
ユーザーが投稿やコメント内で`@`を入力することで他のユーザーをメンションし、通知を送信できる機能

## 機能要件

### 1. メンション入力機能
- `@`文字入力でメンション候補リストを表示
- 日本語（ひらがな、カタカナ、漢字）ユーザー名対応
- リアルタイム検索（入力ごとに候補を絞り込み）
- 複数メンション対応（1つの投稿に複数ユーザーをメンション可能）

### 2. UI/UX要件
- **候補表示**
  - ポップアップメニューで候補リスト表示
  - ユーザーアバター、名前、ユーザー名を表示
  - 最大10件まで表示、スクロール可能
  
- **キーボード操作**
  - `↑` `↓`: 候補リストのナビゲーション
  - `Enter`: 選択中の候補を確定
  - `Esc`: 候補リストを閉じる
  - `Tab`: 候補リストの最初の項目を選択

### 3. 通知機能
- メンションされたユーザーに通知を送信
- リアルタイム通知（Socket.io）
- プッシュ通知（PWA）
- データベースに通知を保存

## 技術設計

### データベーススキーマ

#### Mentionコレクション
```typescript
interface Mention {
  _id: ObjectId;
  postId?: ObjectId;        // 投稿ID（投稿の場合）
  commentId?: ObjectId;     // コメントID（コメントの場合）
  mentionedBy: ObjectId;    // メンションしたユーザー
  mentionedUser: ObjectId;  // メンションされたユーザー
  content: string;          // メンションを含むテキスト
  position: {
    start: number;          // メンション開始位置
    end: number;            // メンション終了位置
  };
  createdAt: Date;
  read: boolean;            // 既読フラグ
}
```

#### User コレクション拡張
```typescript
interface User {
  // 既存フィールド...
  
  // メンション用追加フィールド
  mentionStats: {
    totalMentions: number;    // メンションされた総数
    unreadMentions: number;   // 未読メンション数
  };
  mentionSettings: {
    allowMentions: boolean;   // メンション許可
    notifyOnMention: boolean; // メンション時通知
  };
}
```

#### Notification コレクション拡張
```typescript
interface Notification {
  // 既存フィールド...
  
  type: 'like' | 'comment' | 'follow' | 'mention'; // 'mention'を追加
  mentionId?: ObjectId;     // メンションID（type=mentionの場合）
}
```

### APIエンドポイント

#### 1. ユーザー検索API
```
GET /api/users/search/mention
Query Parameters:
  - query: string (検索文字列)
  - limit: number (結果の最大数、デフォルト10)
  - excludeIds: string[] (除外するユーザーID)

Response:
{
  users: [
    {
      _id: string,
      username: string,
      name: string,
      profileImage: string,
      isVerified: boolean
    }
  ]
}
```

#### 2. メンション作成API
```
POST /api/mentions
Body:
{
  postId?: string,
  commentId?: string,
  mentionedUsers: string[],
  content: string,
  positions: Array<{
    userId: string,
    start: number,
    end: number
  }>
}

Response:
{
  success: boolean,
  mentions: Mention[],
  notifications: Notification[]
}
```

#### 3. メンション一覧取得API
```
GET /api/mentions
Query Parameters:
  - userId: string (ユーザーID)
  - type: 'received' | 'sent'
  - read: boolean
  - page: number
  - limit: number

Response:
{
  mentions: Mention[],
  total: number,
  hasMore: boolean
}
```

### フロントエンド実装

#### コンポーネント構成

```
components/
├── mention/
│   ├── MentionInput.tsx         # メンション対応入力フィールド
│   ├── MentionSuggestions.tsx   # 候補リストポップアップ
│   ├── MentionHighlight.tsx     # メンション表示コンポーネント
│   └── MentionNotification.tsx  # メンション通知表示
├── hooks/
│   ├── useMention.ts            # メンション機能フック
│   └── useMentionSearch.ts      # メンション検索フック
└── utils/
    ├── mentionParser.ts          # メンションパース処理
    └── mentionValidator.ts       # メンション検証処理
```

#### MentionInput実装方針

```typescript
interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: MentionData[]) => void;
  placeholder?: string;
  multiline?: boolean;
  maxMentions?: number;
}

interface MentionData {
  userId: string;
  username: string;
  position: { start: number; end: number };
}

// 主要な処理フロー
1. @文字検出
2. 候補リスト表示
3. ユーザー選択
4. テキスト置換
5. メンションデータ保存
```

### リアルタイム通信設計

#### Socket.ioイベント

```typescript
// クライアント → サーバー
socket.emit('mention:created', {
  targetUserId: string,
  mentionData: {
    postId?: string,
    commentId?: string,
    content: string,
    mentionedBy: UserInfo
  }
});

// サーバー → クライアント
socket.on('mention:received', (data: {
  mention: Mention,
  notification: Notification
}) => {
  // リアルタイム通知表示
  // 通知カウント更新
});
```

### 日本語対応実装

#### 検索アルゴリズム
```typescript
// ひらがな・カタカナ・漢字対応の検索
function searchUsers(query: string, users: User[]): User[] {
  const normalizedQuery = query.toLowerCase();
  
  return users.filter(user => {
    // ユーザー名で検索
    const username = user.username.toLowerCase();
    const name = user.name.toLowerCase();
    
    // 部分一致検索
    return username.includes(normalizedQuery) || 
           name.includes(normalizedQuery) ||
           // ローマ字変換検索（オプション）
           toRomaji(name).includes(normalizedQuery);
  });
}

// IME対応
- compositionstart/compositionend イベント処理
- 入力確定まで検索を遅延
```

### パフォーマンス最適化

#### 1. デバウンス処理
```typescript
// 検索リクエストのデバウンス
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchUsers(query);
  }, 300),
  []
);
```

#### 2. キャッシュ戦略
```typescript
// React Queryでユーザー検索結果をキャッシュ
const { data } = useQuery({
  queryKey: ['mention-search', query],
  queryFn: () => searchMentionUsers(query),
  staleTime: 5 * 60 * 1000, // 5分
  cacheTime: 10 * 60 * 1000, // 10分
});
```

#### 3. 仮想スクロール
```typescript
// 大量の候補リストに対応
import { VirtualList } from '@tanstack/react-virtual';

// 100件以上の候補でも高速表示
```

### セキュリティ考慮事項

1. **メンション数制限**
   - 1投稿あたり最大10メンション
   - レート制限: 1分間に20メンションまで

2. **プライバシー設定**
   - メンションを無効化できる設定
   - ブロックユーザーからのメンション防止

3. **XSS対策**
   - メンションテキストのサニタイズ
   - @username形式の厳密な検証

4. **スパム対策**
   - 同一ユーザーへの連続メンション制限
   - メンション通知のクールダウン期間

## UI/UXデザイン

### メンション入力UI
```
┌─────────────────────────────────┐
│ 投稿を入力...                   │
│ @taro と入力すると...           │
└─────────────────────────────────┘
        ↓
┌─────────────────────────────────┐
│ 投稿を入力...                   │
│ @taro|                          │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 👤 田中太郎 @taro_tanaka        │
│ 👤 山田太郎 @yamada_taro        │
│ 👤 太郎丸 @taromaru             │
└─────────────────────────────────┘
```

### メンション表示
```html
<span class="mention-text">
  今日の会議について
  <a href="/users/taro" class="mention-link">
    @田中太郎
  </a>
  さんと話しました
</span>
```

### 通知表示
```
🔔 新着通知
┌─────────────────────────────────┐
│ 👤 山田花子さんがあなたを       │
│    メンションしました           │
│ 「@田中太郎 会議の件ですが...」 │
│                         5分前   │
└─────────────────────────────────┘
```

## 実装優先順位

### Phase 1: 基本機能（1週間）
1. データベーススキーマ実装
2. ユーザー検索API
3. 基本的なメンション入力UI
4. メンション保存処理

### Phase 2: リアルタイム機能（3日）
1. Socket.io統合
2. リアルタイム通知
3. 通知カウント更新

### Phase 3: 高度な機能（3日）
1. 日本語検索最適化
2. キーボードショートカット
3. IME対応

### Phase 4: 最適化（2日）
1. パフォーマンス改善
2. キャッシュ実装
3. エラーハンドリング

## テスト計画

### 単体テスト
- メンションパーサーのテスト
- 検索アルゴリズムのテスト
- バリデーションロジックのテスト

### 統合テスト
- メンション作成フロー
- 通知送信フロー
- リアルタイム通信

### E2Eテスト
- メンション入力から通知受信まで
- 日本語ユーザー名でのメンション
- キーボード操作

### パフォーマンステスト
- 大量候補での検索速度
- リアルタイム通信の遅延
- メモリ使用量

## 監視項目

### メトリクス
- メンション作成数/日
- 平均メンション数/投稿
- メンション検索のレスポンス時間
- 通知配信成功率
- メンション→通知受信までの時間

### エラー監視
- メンション作成失敗
- 通知送信失敗
- 検索タイムアウト

## 今後の拡張

1. **グループメンション**
   - @all, @team などのグループメンション
   - カスタムグループ作成

2. **スマートサジェスト**
   - よくメンションするユーザーを優先表示
   - 最近やり取りしたユーザーを上位に

3. **メンション分析**
   - メンション関係のグラフ表示
   - メンション統計ダッシュボード

4. **高度な通知設定**
   - メンション通知の時間帯設定
   - 特定ユーザーからのメンション優先度