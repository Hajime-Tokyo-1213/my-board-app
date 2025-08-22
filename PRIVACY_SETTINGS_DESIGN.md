# プライバシー設定機能設計書

## 1. 概要

SNSアプリケーションにおけるユーザーのプライバシーを保護し、安心して利用できる環境を提供するための包括的なプライバシー設定機能を設計します。

### 主要機能
- 非公開アカウント（鍵垢）機能
- ブロック・ミュート機能
- 投稿の公開範囲設定
- フォローリクエスト承認システム
- 通知の細かい制御

## 2. データモデル設計

### 2.1 User モデルの拡張

```typescript
// models/User.ts に追加
interface IPrivacySettings {
  // アカウント設定
  isPrivate: boolean;                    // 非公開アカウント
  allowSearchIndexing: boolean;          // 検索エンジンのインデックス許可
  showOnlineStatus: boolean;             // オンライン状態の表示
  showLastSeen: boolean;                 // 最終アクセス時刻の表示
  
  // フォロー設定
  requireFollowApproval: boolean;        // フォロー承認制
  allowFollowRequests: boolean;          // フォローリクエストの受付
  autoApproveFollowers: string[];        // 自動承認するユーザーID
  
  // 投稿設定
  defaultPostVisibility: 'public' | 'followers' | 'mutual' | 'private';
  allowComments: 'everyone' | 'followers' | 'mutual' | 'none';
  allowLikes: 'everyone' | 'followers' | 'mutual' | 'none';
  allowShares: 'everyone' | 'followers' | 'mutual' | 'none';
  
  // メッセージ設定
  allowMessages: 'everyone' | 'followers' | 'mutual' | 'none';
  messageRequestFilter: 'all' | 'verified' | 'none';
  
  // 通知設定
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    shares: boolean;
    messages: boolean;
    followRequests: boolean;
  };
  
  // プロフィール表示設定
  showFollowerCount: boolean;
  showFollowingCount: boolean;
  showPostCount: boolean;
  showJoinDate: boolean;
}

interface IUser extends mongoose.Document {
  // 既存のフィールド...
  
  // プライバシー設定
  privacySettings: IPrivacySettings;
  
  // ブロック・ミュート
  blockedUsers: mongoose.Types.ObjectId[];
  blockedBy: mongoose.Types.ObjectId[];
  mutedUsers: mongoose.Types.ObjectId[];
  
  // フォローリクエスト
  pendingFollowers: mongoose.Types.ObjectId[];  // 承認待ちのフォロワー
  pendingFollowing: mongoose.Types.ObjectId[];  // 承認待ちのフォロー
}
```

### 2.2 FollowRequest モデル

```typescript
// models/FollowRequest.ts
interface IFollowRequest extends mongoose.Document {
  requester: mongoose.Types.ObjectId;      // リクエスト送信者
  recipient: mongoose.Types.ObjectId;      // リクエスト受信者
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;                        // フォローリクエストメッセージ
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;                        // 有効期限（30日後）
}

const followRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  message: {
    type: String,
    maxlength: 200,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日
    index: { expireAfterSeconds: 0 },
  },
}, {
  timestamps: true,
});

// 複合インデックス
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
followRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
```

### 2.3 BlockedRelation モデル

```typescript
// models/BlockedRelation.ts
interface IBlockedRelation extends mongoose.Document {
  blocker: mongoose.Types.ObjectId;        // ブロックした側
  blocked: mongoose.Types.ObjectId;        // ブロックされた側
  reason?: string;                         // ブロック理由（内部用）
  reportId?: mongoose.Types.ObjectId;      // 通報IDとの関連
  createdAt: Date;
}

const blockedRelationSchema = new mongoose.Schema({
  blocker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  blocked: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'other'],
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
  },
}, {
  timestamps: true,
});

// 複合ユニークインデックス
blockedRelationSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
```

### 2.4 MutedRelation モデル

```typescript
// models/MutedRelation.ts
interface IMutedRelation extends mongoose.Document {
  user: mongoose.Types.ObjectId;           // ミュートした側
  mutedUser: mongoose.Types.ObjectId;      // ミュートされた側
  muteType: 'posts' | 'stories' | 'all';   // ミュートの種類
  duration?: number;                        // ミュート期間（分）
  expiresAt?: Date;                        // 有効期限
  createdAt: Date;
}

const mutedRelationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mutedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  muteType: {
    type: String,
    enum: ['posts', 'stories', 'all'],
    default: 'all',
  },
  duration: Number,
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 },
  },
}, {
  timestamps: true,
});

mutedRelationSchema.index({ user: 1, mutedUser: 1 }, { unique: true });
```

### 2.5 Post モデルの拡張

```typescript
// models/Post.ts に追加
interface IPost extends mongoose.Document {
  // 既存のフィールド...
  
  // 公開範囲設定
  visibility: 'public' | 'followers' | 'mutual' | 'private' | 'custom';
  visibleTo?: mongoose.Types.ObjectId[];   // カスタム公開時の対象ユーザー
  hiddenFrom?: mongoose.Types.ObjectId[];  // 特定ユーザーから非表示
  
  // インタラクション設定
  allowComments: boolean;
  allowLikes: boolean;
  allowShares: boolean;
  
  // コメント承認
  commentApproval: 'none' | 'all' | 'non-followers';
  pendingComments?: mongoose.Types.ObjectId[];
}
```

## 3. API 設計

### 3.1 プライバシー設定 API

```typescript
// GET /api/users/privacy-settings
// 現在のプライバシー設定を取得
interface GetPrivacySettingsResponse {
  settings: IPrivacySettings;
}

// PUT /api/users/privacy-settings
// プライバシー設定を更新
interface UpdatePrivacySettingsRequest {
  settings: Partial<IPrivacySettings>;
}

// POST /api/users/privacy-settings/reset
// プライバシー設定をデフォルトにリセット
```

### 3.2 ブロック・ミュート API

```typescript
// GET /api/users/blocks
// ブロックリストを取得
interface GetBlockedUsersResponse {
  users: Array<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    blockedAt: Date;
  }>;
  total: number;
  page: number;
}

// POST /api/users/blocks
// ユーザーをブロック
interface BlockUserRequest {
  userId: string;
  reason?: string;
}

// DELETE /api/users/blocks/:userId
// ブロック解除

// GET /api/users/mutes
// ミュートリストを取得

// POST /api/users/mutes
// ユーザーをミュート
interface MuteUserRequest {
  userId: string;
  muteType: 'posts' | 'stories' | 'all';
  duration?: number; // 分単位（空の場合は無期限）
}

// DELETE /api/users/mutes/:userId
// ミュート解除
```

### 3.3 フォローリクエスト API

```typescript
// GET /api/follow-requests
// 受信したフォローリクエスト一覧
interface GetFollowRequestsResponse {
  requests: Array<{
    id: string;
    requester: {
      id: string;
      name: string;
      username: string;
      avatar: string;
      bio: string;
      followersCount: number;
      isVerified: boolean;
    };
    message?: string;
    createdAt: Date;
    mutualFollowers: string[]; // 共通のフォロワー
  }>;
  total: number;
  page: number;
}

// POST /api/follow-requests/:requestId/approve
// フォローリクエストを承認

// POST /api/follow-requests/:requestId/reject
// フォローリクエストを拒否

// POST /api/follow-requests/bulk-approve
// 複数のリクエストを一括承認
interface BulkApproveRequest {
  requestIds: string[];
}

// GET /api/follow-requests/sent
// 送信したフォローリクエスト一覧

// DELETE /api/follow-requests/sent/:requestId
// 送信したリクエストをキャンセル
```

### 3.4 投稿公開範囲 API

```typescript
// POST /api/posts
// 投稿作成時の公開範囲設定
interface CreatePostRequest {
  content: string;
  visibility: 'public' | 'followers' | 'mutual' | 'private' | 'custom';
  visibleTo?: string[];     // カスタム公開時
  hiddenFrom?: string[];    // 特定ユーザーから非表示
  allowComments: boolean;
  allowLikes: boolean;
  allowShares: boolean;
}

// PUT /api/posts/:postId/visibility
// 既存投稿の公開範囲を変更
interface UpdatePostVisibilityRequest {
  visibility: 'public' | 'followers' | 'mutual' | 'private' | 'custom';
  visibleTo?: string[];
  hiddenFrom?: string[];
}

// GET /api/posts/audience-preview
// 投稿の閲覧可能ユーザーをプレビュー
interface AudiencePreviewRequest {
  visibility: string;
  visibleTo?: string[];
  hiddenFrom?: string[];
}
```

### 3.5 通知制御 API

```typescript
// GET /api/notifications/settings
// 通知設定を取得

// PUT /api/notifications/settings
// 通知設定を更新
interface UpdateNotificationSettingsRequest {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  shares: boolean;
  messages: boolean;
  followRequests: boolean;
  
  // 詳細設定
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string;   // "08:00"
  };
  
  // 通知のグループ化
  groupNotifications: boolean;
  notificationFrequency: 'instant' | 'hourly' | 'daily';
}

// POST /api/notifications/mute-thread/:postId
// 特定の投稿スレッドの通知をミュート

// POST /api/notifications/mark-all-read
// すべての通知を既読にする
```

## 4. UI コンポーネント設計

### 4.1 プライバシー設定画面

```typescript
// components/PrivacySettings.tsx
interface PrivacySettingsProps {
  user: IUser;
  onUpdate: (settings: IPrivacySettings) => void;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ user, onUpdate }) => {
  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        プライバシー設定
      </Typography>
      
      {/* アカウントのプライバシー */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            アカウントのプライバシー
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={privacySettings.isPrivate}
                onChange={(e) => handleToggle('isPrivate', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography>非公開アカウント</Typography>
                <Typography variant="caption" color="text.secondary">
                  承認したフォロワーのみがあなたの投稿を見ることができます
                </Typography>
              </Box>
            }
          />
          
          <Divider sx={{ my: 2 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={privacySettings.allowSearchIndexing}
                onChange={(e) => handleToggle('allowSearchIndexing', e.target.checked)}
              />
            }
            label="検索エンジンでの表示を許可"
          />
        </CardContent>
      </Card>
      
      {/* 投稿の公開範囲 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            投稿のデフォルト設定
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>デフォルトの公開範囲</InputLabel>
            <Select
              value={privacySettings.defaultPostVisibility}
              onChange={(e) => handleChange('defaultPostVisibility', e.target.value)}
            >
              <MenuItem value="public">
                <PublicIcon sx={{ mr: 1 }} /> 全員に公開
              </MenuItem>
              <MenuItem value="followers">
                <GroupIcon sx={{ mr: 1 }} /> フォロワーのみ
              </MenuItem>
              <MenuItem value="mutual">
                <SwapHorizIcon sx={{ mr: 1 }} /> 相互フォローのみ
              </MenuItem>
              <MenuItem value="private">
                <LockIcon sx={{ mr: 1 }} /> 自分のみ
              </MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle2" gutterBottom>
            インタラクションの許可
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>コメント</InputLabel>
                <Select value={privacySettings.allowComments}>
                  <MenuItem value="everyone">全員</MenuItem>
                  <MenuItem value="followers">フォロワー</MenuItem>
                  <MenuItem value="mutual">相互フォロー</MenuItem>
                  <MenuItem value="none">許可しない</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* 同様にいいね、シェアの設定 */}
          </Grid>
        </CardContent>
      </Card>
      
      {/* 通知設定 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            通知設定
          </Typography>
          
          <List>
            {Object.entries(privacySettings.notifications).map(([key, value]) => (
              <ListItem key={key}>
                <ListItemText
                  primary={notificationLabels[key]}
                  secondary={notificationDescriptions[key]}
                />
                <Switch
                  checked={value}
                  onChange={(e) => handleNotificationToggle(key, e.target.checked)}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
      
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSave}
        sx={{ mb: 2 }}
      >
        設定を保存
      </Button>
    </Container>
  );
};
```

### 4.2 フォローリクエスト管理画面

```typescript
// components/FollowRequestManager.tsx
const FollowRequestManager: React.FC = () => {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">
          フォローリクエスト ({requests.length})
        </Typography>
        
        {selectedRequests.length > 0 && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBulkApprove}
              sx={{ mr: 1 }}
            >
              選択を承認 ({selectedRequests.length})
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleBulkReject}
            >
              選択を拒否
            </Button>
          </Box>
        )}
      </Box>
      
      <List>
        {requests.map((request) => (
          <ListItem key={request.id}>
            <Checkbox
              checked={selectedRequests.includes(request.id)}
              onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
            />
            
            <ListItemAvatar>
              <Avatar src={request.requester.avatar}>
                {request.requester.name[0]}
              </Avatar>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Box>
                  <Typography variant="subtitle1">
                    {request.requester.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{request.requester.username} • {formatDate(request.createdAt)}
                  </Typography>
                </Box>
              }
              secondary={
                <Box>
                  {request.message && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      "{request.message}"
                    </Typography>
                  )}
                  <Typography variant="caption">
                    {request.requester.followersCount} フォロワー
                    {request.mutualFollowers.length > 0 && (
                      <> • 共通: {request.mutualFollowers.slice(0, 3).join(', ')}</>
                    )}
                  </Typography>
                </Box>
              }
            />
            
            <ListItemSecondaryAction>
              <IconButton
                color="primary"
                onClick={() => handleApprove(request.id)}
                size="small"
              >
                <CheckIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={() => handleReject(request.id)}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
```

### 4.3 ブロック・ミュート管理画面

```typescript
// components/BlockMuteManager.tsx
const BlockMuteManager: React.FC = () => {
  const [tab, setTab] = useState<'blocked' | 'muted'>('blocked');
  
  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="ブロック中" value="blocked" />
        <Tab label="ミュート中" value="muted" />
      </Tabs>
      
      <TabPanel value={tab} index="blocked">
        <BlockedUsersList />
      </TabPanel>
      
      <TabPanel value={tab} index="muted">
        <MutedUsersList />
      </TabPanel>
    </Box>
  );
};

// ブロックリストコンポーネント
const BlockedUsersList: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);
  
  return (
    <List>
      {blockedUsers.map((user) => (
        <ListItem key={user.id}>
          <ListItemAvatar>
            <Avatar src={user.avatar}>{user.name[0]}</Avatar>
          </ListItemAvatar>
          
          <ListItemText
            primary={user.name}
            secondary={`@${user.username} • ブロック: ${formatDate(user.blockedAt)}`}
          />
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirmUnblock(user.id)}
          >
            ブロック解除
          </Button>
        </ListItem>
      ))}
      
      {/* ブロック解除確認ダイアログ */}
      <Dialog open={!!confirmUnblock} onClose={() => setConfirmUnblock(null)}>
        <DialogTitle>ブロック解除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            このユーザーのブロックを解除しますか？
            解除すると、相手はあなたをフォローしたり、
            投稿を見ることができるようになります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUnblock(null)}>
            キャンセル
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleUnblock}
          >
            ブロック解除
          </Button>
        </DialogActions>
      </Dialog>
    </List>
  );
};
```

### 4.4 投稿時の公開範囲選択

```typescript
// components/PostVisibilitySelector.tsx
interface PostVisibilitySelectorProps {
  value: string;
  onChange: (visibility: string, options?: any) => void;
}

const PostVisibilitySelector: React.FC<PostVisibilitySelectorProps> = ({
  value,
  onChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customDialog, setCustomDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const visibilityOptions = [
    { value: 'public', label: '全員に公開', icon: <PublicIcon /> },
    { value: 'followers', label: 'フォロワーのみ', icon: <GroupIcon /> },
    { value: 'mutual', label: '相互フォロー', icon: <SwapHorizIcon /> },
    { value: 'private', label: '自分のみ', icon: <LockIcon /> },
    { value: 'custom', label: 'カスタム', icon: <TuneIcon /> },
  ];
  
  const currentOption = visibilityOptions.find(opt => opt.value === value);
  
  return (
    <>
      <Button
        startIcon={currentOption?.icon}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        variant="outlined"
        size="small"
      >
        {currentOption?.label}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {visibilityOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              if (option.value === 'custom') {
                setCustomDialog(true);
              } else {
                onChange(option.value);
              }
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText primary={option.label} />
            {value === option.value && <CheckIcon fontSize="small" />}
          </MenuItem>
        ))}
      </Menu>
      
      {/* カスタム公開範囲ダイアログ */}
      <Dialog
        open={customDialog}
        onClose={() => setCustomDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>カスタム公開範囲</DialogTitle>
        <DialogContent>
          <UserSelector
            label="表示するユーザー"
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="ユーザーを検索..."
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            選択したユーザーのみがこの投稿を見ることができます
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onChange('custom', { visibleTo: selectedUsers });
              setCustomDialog(false);
            }}
          >
            適用
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
```

## 5. セキュリティとアクセス制御

### 5.1 アクセス制御ミドルウェア

```typescript
// middleware/privacy.ts
export async function checkPostVisibility(
  post: IPost,
  viewerId: string | null
): Promise<boolean> {
  // 投稿者本人は常に閲覧可能
  if (post.authorId.toString() === viewerId) {
    return true;
  }
  
  // 公開投稿
  if (post.visibility === 'public') {
    // ブロックチェック
    if (viewerId && await isBlocked(post.authorId, viewerId)) {
      return false;
    }
    return true;
  }
  
  // 未ログインユーザーは非公開投稿を見られない
  if (!viewerId) {
    return false;
  }
  
  // ブロックチェック
  if (await isBlocked(post.authorId, viewerId)) {
    return false;
  }
  
  // 公開範囲による判定
  switch (post.visibility) {
    case 'followers':
      return await isFollowing(viewerId, post.authorId);
      
    case 'mutual':
      return await isMutualFollow(viewerId, post.authorId);
      
    case 'private':
      return false;
      
    case 'custom':
      return post.visibleTo?.includes(viewerId) && 
             !post.hiddenFrom?.includes(viewerId);
      
    default:
      return false;
  }
}

// フォロー関係のチェック
export async function canFollow(
  followerId: string,
  targetId: string
): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
  // 自分自身はフォローできない
  if (followerId === targetId) {
    return { allowed: false, requiresApproval: false, reason: 'self_follow' };
  }
  
  // ブロックチェック
  if (await isBlocked(targetId, followerId)) {
    return { allowed: false, requiresApproval: false, reason: 'blocked' };
  }
  
  // 既にフォロー済み
  if (await isFollowing(followerId, targetId)) {
    return { allowed: false, requiresApproval: false, reason: 'already_following' };
  }
  
  // 承認待ち
  if (await hasPendingRequest(followerId, targetId)) {
    return { allowed: false, requiresApproval: false, reason: 'pending_request' };
  }
  
  const targetUser = await User.findById(targetId);
  const requiresApproval = targetUser?.privacySettings?.isPrivate || false;
  
  return { allowed: true, requiresApproval };
}
```

### 5.2 プライバシー検証関数

```typescript
// utils/privacyValidation.ts
export function validatePrivacySettings(
  settings: Partial<IPrivacySettings>
): ValidationResult {
  const errors: string[] = [];
  
  // 論理的整合性のチェック
  if (settings.isPrivate === false) {
    // 公開アカウントの場合、フォロー承認は不要
    if (settings.requireFollowApproval === true) {
      errors.push('公開アカウントではフォロー承認を必須にできません');
    }
  }
  
  if (settings.defaultPostVisibility === 'private') {
    // 投稿が非公開の場合、インタラクション設定も制限
    if (settings.allowComments === 'everyone') {
      errors.push('非公開投稿では全員からのコメントを許可できません');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// レート制限
export const privacyRateLimiter = {
  blockUser: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 20, // 最大20回
    message: 'ブロック操作が多すぎます。しばらく待ってから再試行してください。',
  }),
  
  followRequest: rateLimit({
    windowMs: 60 * 60 * 1000, // 1時間
    max: 50, // 最大50回
    message: 'フォローリクエストが多すぎます。',
  }),
  
  privacyUpdate: rateLimit({
    windowMs: 5 * 60 * 1000, // 5分
    max: 10, // 最大10回
    message: 'プライバシー設定の更新が頻繁すぎます。',
  }),
};
```

### 5.3 通知フィルタリング

```typescript
// services/notificationFilter.ts
export async function shouldSendNotification(
  recipientId: string,
  senderId: string,
  type: NotificationType
): Promise<boolean> {
  const recipient = await User.findById(recipientId);
  if (!recipient) return false;
  
  // ブロックチェック
  if (await isBlocked(recipientId, senderId)) {
    return false;
  }
  
  // ミュートチェック
  if (await isMuted(recipientId, senderId)) {
    return false;
  }
  
  const settings = recipient.privacySettings.notifications;
  
  // 通知タイプ別の設定チェック
  switch (type) {
    case 'like':
      return settings.likes;
    case 'comment':
      return settings.comments;
    case 'follow':
      return settings.follows;
    case 'mention':
      return settings.mentions;
    case 'share':
      return settings.shares;
    case 'message':
      return settings.messages;
    case 'follow_request':
      return settings.followRequests;
    default:
      return true;
  }
}

// 通知のバッチ処理
export async function batchNotifications(
  userId: string,
  notifications: INotification[]
): Promise<INotification[]> {
  const user = await User.findById(userId);
  if (!user?.privacySettings?.groupNotifications) {
    return notifications;
  }
  
  // 同じ投稿に対する通知をグループ化
  const grouped = notifications.reduce((acc, notif) => {
    const key = `${notif.type}-${notif.relatedPost}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(notif);
    return acc;
  }, {} as Record<string, INotification[]>);
  
  // グループ化された通知を作成
  return Object.values(grouped).map(group => {
    if (group.length === 1) return group[0];
    
    return {
      ...group[0],
      message: `${group.length}人が${getActionText(group[0].type)}しました`,
      actors: group.map(n => n.actor),
      groupedCount: group.length,
    };
  });
}
```

## 6. 実装優先順位

### Phase 1: 基本機能（1週間）
1. データモデルの実装
2. 非公開アカウント機能
3. 基本的なブロック機能
4. フォローリクエストシステム

### Phase 2: 詳細機能（1週間）
1. ミュート機能
2. 投稿の公開範囲設定
3. 通知設定
4. プライバシー設定UI

### Phase 3: 高度な機能（1週間）
1. カスタム公開範囲
2. 一時的ミュート
3. 通知のグループ化
4. 詳細な通知制御

## 7. テスト計画

### ユニットテスト
- プライバシー設定の検証ロジック
- アクセス制御関数
- ブロック・ミュートのチェック関数

### 統合テスト
- フォローリクエストフロー
- 投稿の公開範囲による表示制御
- 通知フィルタリング

### E2Eテスト
- プライバシー設定の変更と反映
- ブロック・ミュートの動作確認
- フォローリクエストの承認フロー

## 8. パフォーマンス考慮事項

### インデックス戦略
```javascript
// 効率的なクエリのためのインデックス
db.users.createIndex({ "privacySettings.isPrivate": 1 });
db.blockedRelations.createIndex({ blocker: 1, blocked: 1 });
db.mutedRelations.createIndex({ user: 1, mutedUser: 1, expiresAt: 1 });
db.followRequests.createIndex({ recipient: 1, status: 1, createdAt: -1 });
db.posts.createIndex({ authorId: 1, visibility: 1, createdAt: -1 });
```

### キャッシュ戦略
- ブロック・ミュートリストのRedisキャッシュ
- フォロー関係のキャッシュ
- プライバシー設定のセッションキャッシュ

### クエリ最適化
- N+1問題の回避（populate の適切な使用）
- バッチ処理による効率化
- 不要なフィールドの除外（select/projection）

## まとめ

このプライバシー設定設計により、ユーザーは自分の情報とコンテンツを細かく制御でき、安心してSNSを利用できるようになります。段階的な実装により、基本機能から高度な機能まで着実に構築していきます。