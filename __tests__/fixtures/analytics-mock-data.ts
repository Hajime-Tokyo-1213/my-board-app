// 分析ダッシュボードのテスト用モックデータ

import { Types } from 'mongoose';

// ユーザーモックデータ
export const mockUsers = [
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'test@example.com',
    username: 'testuser',
    profile: {
      bio: 'Test user bio',
      avatar: 'https://example.com/avatar.jpg',
      location: 'Tokyo, Japan'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'follower1@example.com',
    username: 'follower1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  },
  {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    email: 'follower2@example.com',
    username: 'follower2',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  }
];

// 投稿モックデータ
export const mockPosts = Array(30).fill(null).map((_, index) => {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));
  createdAt.setHours(Math.floor(Math.random() * 24));
  
  return {
    _id: new Types.ObjectId(),
    author: mockUsers[0]._id,
    content: `This is test post #${index + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    likes: Array(Math.floor(Math.random() * 50)).fill(null).map(() => new Types.ObjectId()),
    comments: Array(Math.floor(Math.random() * 20)).fill(null).map(() => new Types.ObjectId()),
    shares: Array(Math.floor(Math.random() * 10)).fill(null).map(() => new Types.ObjectId()),
    views: Math.floor(Math.random() * 500) + 100,
    hashtags: [`#test${index % 5}`, '#analytics', '#dashboard'],
    images: index % 3 === 0 ? [`https://example.com/image${index}.jpg`] : [],
    createdAt,
    updatedAt: createdAt
  };
});

// フォロー関係モックデータ
export const mockFollows = [
  {
    _id: new Types.ObjectId(),
    follower: mockUsers[1]._id,
    following: mockUsers[0]._id,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  },
  {
    _id: new Types.ObjectId(),
    follower: mockUsers[2]._id,
    following: mockUsers[0]._id,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    _id: new Types.ObjectId(),
    follower: mockUsers[0]._id,
    following: mockUsers[1]._id,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  }
];

// コメントモックデータ
export const mockComments = Array(100).fill(null).map((_, index) => ({
  _id: new Types.ObjectId(),
  post: mockPosts[Math.floor(index / 4)]._id,
  author: mockUsers[index % 3]._id,
  content: `This is comment #${index + 1}`,
  likes: Array(Math.floor(Math.random() * 10)).fill(null).map(() => new Types.ObjectId()),
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  updatedAt: new Date()
}));

// Analytics履歴データ
export const mockAnalyticsHistory = Array(30).fill(null).map((_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - index));
  date.setHours(0, 0, 0, 0);
  
  return {
    _id: new Types.ObjectId(),
    userId: mockUsers[0]._id,
    date,
    metrics: {
      followers: 100 + index * 2,
      following: 50 + Math.floor(index / 2),
      totalPosts: 20 + index,
      totalLikes: 500 + index * 20,
      totalComments: 100 + index * 5,
      totalViews: 2000 + index * 50,
      engagementRate: 3.5 + (index * 0.1)
    },
    hourlyActivity: new Map([
      [9, 10 + index],
      [12, 15 + index],
      [15, 20 + index],
      [18, 25 + index],
      [21, 30 + index]
    ]),
    topHashtags: ['#test', '#analytics', '#dashboard', '#trending', '#popular'],
    createdAt: date,
    updatedAt: date
  };
});

// API レスポンスモックデータ
export const mockStatsResponse = {
  followers: 158,
  following: 75,
  totalPosts: 30,
  totalLikes: 850,
  totalComments: 245,
  engagementRate: 5.2,
  periodComparison: {
    followersChange: 12.5,
    postsChange: 8.3,
    engagementChange: 0.8
  }
};

export const mockGrowthResponse = {
  data: Array(7).fill(null).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    
    return {
      date: date.toISOString().split('T')[0],
      followers: 150 + index * 2,
      posts: 25 + index,
      engagement: 4.5 + index * 0.2,
      likes: 800 + index * 20
    };
  })
};

export const mockPopularPostsResponse = {
  posts: mockPosts
    .sort((a, b) => b.likes.length - a.likes.length)
    .slice(0, 10)
    .map(post => ({
      id: post._id.toString(),
      title: post.content.substring(0, 50) + '...',
      content: post.content,
      thumbnail: post.images[0] || null,
      likes: post.likes.length,
      comments: post.comments.length,
      engagementScore: ((post.likes.length + post.comments.length * 2) / 10).toFixed(1),
      createdAt: post.createdAt.toISOString()
    }))
};

export const mockBestTimesResponse = {
  heatmap: (() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heatmap = [];
    
    days.forEach(day => {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push({
          day,
          hour,
          activity: Math.floor(Math.random() * 50) + (hour >= 9 && hour <= 21 ? 20 : 5)
        });
      }
    });
    
    return heatmap;
  })(),
  recommendations: [
    '最も活発な時間: Wednesday 18:00',
    '継続的な投稿が重要です'
  ]
};

export const mockInsightsResponse = {
  insights: [
    {
      type: 'success',
      message: '素晴らしいエンゲージメント率です！この調子を維持しましょう。'
    },
    {
      type: 'success',
      message: 'フォロワーが12.5%増加しています！'
    },
    {
      type: 'info',
      message: '投稿頻度を上げることで、より多くのエンゲージメントが期待できます。'
    }
  ]
};

// テストヘルパー関数
export function generateMockPost(overrides = {}) {
  const post = {
    _id: new Types.ObjectId(),
    author: mockUsers[0]._id,
    content: 'Test post content',
    likes: [],
    comments: [],
    shares: [],
    views: 100,
    hashtags: ['#test'],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
  
  return post;
}

export function generateMockUser(overrides = {}) {
  return {
    _id: new Types.ObjectId(),
    email: `user${Date.now()}@example.com`,
    username: `user${Date.now()}`,
    profile: {
      bio: 'Test bio',
      avatar: 'https://example.com/avatar.jpg',
      location: 'Test Location'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

export function generateMockAnalytics(userId: Types.ObjectId, date: Date, overrides = {}) {
  return {
    _id: new Types.ObjectId(),
    userId,
    date,
    metrics: {
      followers: 100,
      following: 50,
      totalPosts: 20,
      totalLikes: 500,
      totalComments: 100,
      totalViews: 2000,
      engagementRate: 3.5
    },
    hourlyActivity: new Map(),
    topHashtags: [],
    createdAt: date,
    updatedAt: date,
    ...overrides
  };
}

// 時系列データ生成
export function generateTimeSeriesData(days: number, metric: string) {
  const data = [];
  const endDate = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    
    let value;
    switch (metric) {
      case 'followers':
        value = 100 + (days - i) * 3 + Math.floor(Math.random() * 10);
        break;
      case 'engagement':
        value = 3 + Math.random() * 2;
        break;
      case 'posts':
        value = 20 + Math.floor((days - i) / 2);
        break;
      case 'likes':
        value = 500 + (days - i) * 15 + Math.floor(Math.random() * 50);
        break;
      default:
        value = Math.floor(Math.random() * 100);
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      [metric]: value
    });
  }
  
  return data;
}

// モックセッション
export const mockSession = {
  user: {
    id: mockUsers[0]._id.toString(),
    email: mockUsers[0].email,
    name: mockUsers[0].username,
    image: mockUsers[0].profile.avatar
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// エラーレスポンス
export const mockErrorResponses = {
  unauthorized: {
    error: 'Unauthorized',
    message: 'Please sign in to access this resource'
  },
  notFound: {
    error: 'Not Found',
    message: 'Resource not found'
  },
  serverError: {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  },
  badRequest: {
    error: 'Bad Request',
    message: 'Invalid request parameters'
  }
};