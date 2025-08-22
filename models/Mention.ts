import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMention extends Document {
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  mentionedBy: mongoose.Types.ObjectId;
  mentionedUser: mongoose.Types.ObjectId;
  content: string;
  position: {
    start: number;
    end: number;
  };
  read: boolean;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MentionSchema = new Schema<IMention>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: false,
      index: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      required: false,
      index: true,
    },
    mentionedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mentionedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    position: {
      start: {
        type: Number,
        required: true,
      },
      end: {
        type: Number,
        required: true,
      },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 複合インデックス
MentionSchema.index({ mentionedUser: 1, read: 1, createdAt: -1 });
MentionSchema.index({ mentionedBy: 1, createdAt: -1 });
MentionSchema.index({ postId: 1, mentionedUser: 1 });
MentionSchema.index({ commentId: 1, mentionedUser: 1 });

// バリデーション: postIdまたはcommentIdのいずれかが必要
MentionSchema.pre('validate', function(next) {
  if (!this.postId && !this.commentId) {
    next(new Error('Either postId or commentId must be provided'));
  } else if (this.postId && this.commentId) {
    next(new Error('Cannot have both postId and commentId'));
  } else {
    next();
  }
});

// 静的メソッド
MentionSchema.statics = {
  // ユーザーの未読メンション数を取得
  async getUnreadCount(userId: string): Promise<number> {
    return this.countDocuments({
      mentionedUser: userId,
      read: false,
    });
  },

  // ユーザーのメンションを取得
  async getUserMentions(
    userId: string,
    options: {
      type?: 'received' | 'sent';
      read?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ) {
    const { type = 'received', read, limit = 20, skip = 0 } = options;
    
    const query: any = {};
    
    if (type === 'received') {
      query.mentionedUser = userId;
    } else {
      query.mentionedBy = userId;
    }
    
    if (read !== undefined) {
      query.read = read;
    }
    
    return this.find(query)
      .populate('mentionedBy', 'username name profileImage')
      .populate('mentionedUser', 'username name profileImage')
      .populate('postId', 'content createdAt')
      .populate('commentId', 'content createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  },

  // メンションを既読にする
  async markAsRead(mentionIds: string[]): Promise<void> {
    await this.updateMany(
      { _id: { $in: mentionIds } },
      { read: true }
    );
  },

  // 投稿/コメントのメンションを作成
  async createMentions(
    type: 'post' | 'comment',
    entityId: string,
    mentionedBy: string,
    mentions: Array<{
      userId: string;
      username: string;
      position: { start: number; end: number };
    }>,
    content: string
  ) {
    const mentionDocs = mentions.map(mention => ({
      [type === 'post' ? 'postId' : 'commentId']: entityId,
      mentionedBy,
      mentionedUser: mention.userId,
      content: content.substring(0, 1000), // 最大1000文字
      position: mention.position,
      read: false,
      notificationSent: false,
    }));
    
    return this.insertMany(mentionDocs);
  },
};

// インスタンスメソッド
MentionSchema.methods = {
  // メンションを既読にする
  async markAsRead(): Promise<void> {
    this.read = true;
    await this.save();
  },

  // 通知送信済みにする
  async markNotificationSent(): Promise<void> {
    this.notificationSent = true;
    await this.save();
  },
};

// モデルの型定義
type MentionModel = Model<IMention> & {
  getUnreadCount(userId: string): Promise<number>;
  getUserMentions(
    userId: string,
    options?: {
      type?: 'received' | 'sent';
      read?: boolean;
      limit?: number;
      skip?: number;
    }
  ): Promise<IMention[]>;
  markAsRead(mentionIds: string[]): Promise<void>;
  createMentions(
    type: 'post' | 'comment',
    entityId: string,
    mentionedBy: string,
    mentions: Array<{
      userId: string;
      username: string;
      position: { start: number; end: number };
    }>,
    content: string
  ): Promise<IMention[]>;
};

// モデルのエクスポート
const Mention: MentionModel = 
  (mongoose.models.Mention as MentionModel) || 
  mongoose.model<IMention, MentionModel>('Mention', MentionSchema);

export default Mention;