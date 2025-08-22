import mongoose, { Document, Schema } from 'mongoose';

// プライバシー設定の型定義
export interface IPrivacySettings {
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

// デフォルトのプライバシー設定
export const defaultPrivacySettings: IPrivacySettings = {
  // アカウント設定
  isPrivate: false,
  allowSearchIndexing: true,
  showOnlineStatus: true,
  showLastSeen: true,
  
  // フォロー設定
  requireFollowApproval: false,
  allowFollowRequests: true,
  autoApproveFollowers: [],
  
  // 投稿設定
  defaultPostVisibility: 'public',
  allowComments: 'everyone',
  allowLikes: 'everyone',
  allowShares: 'everyone',
  
  // メッセージ設定
  allowMessages: 'everyone',
  messageRequestFilter: 'all',
  
  // 通知設定
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    shares: true,
    messages: true,
    followRequests: true,
  },
  
  // プロフィール表示設定
  showFollowerCount: true,
  showFollowingCount: true,
  showPostCount: true,
  showJoinDate: true,
};

// プライバシー設定のスキーマ
export const privacySettingsSchema = new Schema<IPrivacySettings>({
  // アカウント設定
  isPrivate: {
    type: Boolean,
    default: false,
  },
  allowSearchIndexing: {
    type: Boolean,
    default: true,
  },
  showOnlineStatus: {
    type: Boolean,
    default: true,
  },
  showLastSeen: {
    type: Boolean,
    default: true,
  },
  
  // フォロー設定
  requireFollowApproval: {
    type: Boolean,
    default: false,
  },
  allowFollowRequests: {
    type: Boolean,
    default: true,
  },
  autoApproveFollowers: [{
    type: String,
  }],
  
  // 投稿設定
  defaultPostVisibility: {
    type: String,
    enum: ['public', 'followers', 'mutual', 'private'],
    default: 'public',
  },
  allowComments: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone',
  },
  allowLikes: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone',
  },
  allowShares: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone',
  },
  
  // メッセージ設定
  allowMessages: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone',
  },
  messageRequestFilter: {
    type: String,
    enum: ['all', 'verified', 'none'],
    default: 'all',
  },
  
  // 通知設定
  notifications: {
    likes: {
      type: Boolean,
      default: true,
    },
    comments: {
      type: Boolean,
      default: true,
    },
    follows: {
      type: Boolean,
      default: true,
    },
    mentions: {
      type: Boolean,
      default: true,
    },
    shares: {
      type: Boolean,
      default: true,
    },
    messages: {
      type: Boolean,
      default: true,
    },
    followRequests: {
      type: Boolean,
      default: true,
    },
  },
  
  // プロフィール表示設定
  showFollowerCount: {
    type: Boolean,
    default: true,
  },
  showFollowingCount: {
    type: Boolean,
    default: true,
  },
  showPostCount: {
    type: Boolean,
    default: true,
  },
  showJoinDate: {
    type: Boolean,
    default: true,
  },
}, {
  _id: false, // サブドキュメントなので_idは不要
});

// プライバシー設定の検証
export function validatePrivacySettings(
  settings: Partial<IPrivacySettings>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 論理的整合性のチェック
  if (settings.isPrivate === false && settings.requireFollowApproval === true) {
    errors.push('公開アカウントではフォロー承認を必須にできません');
  }
  
  if (settings.defaultPostVisibility === 'private') {
    // 非公開投稿の場合、インタラクション設定も制限
    if (settings.allowComments === 'everyone') {
      errors.push('非公開投稿では全員からのコメントを許可できません');
    }
    if (settings.allowLikes === 'everyone') {
      errors.push('非公開投稿では全員からのいいねを許可できません');
    }
    if (settings.allowShares === 'everyone') {
      errors.push('非公開投稿では全員からのシェアを許可できません');
    }
  }
  
  if (settings.allowFollowRequests === false && settings.requireFollowApproval === true) {
    errors.push('フォローリクエストを受け付けない場合、承認制にできません');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// プライバシー設定をマージ（部分更新用）
export function mergePrivacySettings(
  current: IPrivacySettings,
  updates: Partial<IPrivacySettings>
): IPrivacySettings {
  const merged = { ...current };
  
  // 各フィールドを再帰的にマージ
  Object.keys(updates).forEach((key) => {
    const updateValue = updates[key as keyof IPrivacySettings];
    if (updateValue !== undefined) {
      if (typeof updateValue === 'object' && !Array.isArray(updateValue)) {
        // ネストされたオブジェクトの場合
        merged[key as keyof IPrivacySettings] = {
          ...current[key as keyof IPrivacySettings] as any,
          ...updateValue,
        };
      } else {
        // プリミティブ値または配列の場合
        merged[key as keyof IPrivacySettings] = updateValue as any;
      }
    }
  });
  
  return merged;
}