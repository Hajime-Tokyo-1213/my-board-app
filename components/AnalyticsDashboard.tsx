'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatsCard from './StatsCard';
import FollowerChart from './FollowerChart';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  FileText,
  TrendingUp,
  Calendar,
  Clock,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface StatsData {
  followers: number;
  following: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
  periodComparison: {
    followersChange: number;
    postsChange: number;
    engagementChange: number;
  };
}

interface GrowthData {
  data: Array<{
    date: string;
    followers: number;
    posts: number;
    engagement: number;
    likes: number;
  }>;
}

interface PopularPost {
  id: string;
  title: string;
  content: string;
  thumbnail: string | null;
  likes: number;
  comments: number;
  engagementScore: string;
  createdAt: string;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [chartMetric, setChartMetric] = useState<'multi' | 'followers' | 'engagement' | 'posts' | 'likes'>('multi');

  // 基本統計データの取得
  const { data: statsData, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ['analytics', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics?type=stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // 5分ごとに更新
  });

  // 成長データの取得
  const { data: growthData, isLoading: growthLoading } = useQuery<GrowthData>({
    queryKey: ['analytics', 'growth', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?type=growth&period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch growth data');
      return response.json();
    },
  });

  // 人気投稿の取得
  const { data: popularPosts, isLoading: postsLoading } = useQuery<{ posts: PopularPost[] }>({
    queryKey: ['analytics', 'popular-posts'],
    queryFn: async () => {
      const response = await fetch('/api/analytics?type=popular-posts');
      if (!response.ok) throw new Error('Failed to fetch popular posts');
      return response.json();
    },
  });

  // インサイトの取得
  const { data: insights, isLoading: insightsLoading } = useQuery<{ insights: Insight[] }>({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => {
      const response = await fetch('/api/analytics?type=insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
  });

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">分析ダッシュボード</h1>
          <p className="text-gray-600">
            アカウントのパフォーマンスと成長を追跡
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="フォロワー"
            value={formatNumber(statsData?.followers)}
            change={statsData?.periodComparison.followersChange}
            changeLabel="過去7日間"
            icon={<Users className="w-5 h-5" />}
            color="blue"
            loading={statsLoading}
          />
          <StatsCard
            title="総投稿数"
            value={formatNumber(statsData?.totalPosts)}
            change={statsData?.periodComparison.postsChange}
            changeLabel="過去7日間"
            icon={<FileText className="w-5 h-5" />}
            color="purple"
            loading={statsLoading}
          />
          <StatsCard
            title="総いいね数"
            value={formatNumber(statsData?.totalLikes)}
            icon={<Heart className="w-5 h-5" />}
            color="pink"
            loading={statsLoading}
          />
          <StatsCard
            title="エンゲージメント率"
            value={statsData ? `${statsData.engagementRate}%` : '0%'}
            change={statsData?.periodComparison.engagementChange}
            changeLabel="過去7日間"
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
            loading={statsLoading}
          />
        </div>

        {/* チャートセクション */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">成長推移</h2>
            <div className="flex flex-wrap gap-2">
              {/* 期間選択 */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">過去7日間</option>
                <option value="30">過去30日間</option>
                <option value="90">過去90日間</option>
              </select>
              
              {/* チャートタイプ選択 */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="line">折れ線グラフ</option>
                <option value="bar">棒グラフ</option>
              </select>
              
              {/* メトリクス選択 */}
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="multi">複合表示</option>
                <option value="followers">フォロワー</option>
                <option value="engagement">エンゲージメント率</option>
                <option value="posts">投稿数</option>
                <option value="likes">いいね数</option>
              </select>
            </div>
          </div>
          
          <FollowerChart
            data={growthData?.data || []}
            type={chartType}
            metric={chartMetric}
            height={350}
            loading={growthLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 人気投稿 */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              人気投稿ランキング
            </h2>
            
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : popularPosts?.posts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">投稿データがありません</p>
            ) : (
              <div className="space-y-3">
                {popularPosts?.posts.slice(0, 5).map((post, index) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {post.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          スコア: {post.engagementScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(new Date(post.createdAt), 'MM/dd', { locale: ja })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* インサイト */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              インサイト
            </h2>
            
            {insightsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : insights?.insights.length === 0 ? (
              <p className="text-gray-500 text-center py-8">分析中...</p>
            ) : (
              <div className="space-y-3">
                {insights?.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'success'
                        ? 'bg-green-50 border-green-200'
                        : insight.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <p className={`text-sm ${
                      insight.type === 'success'
                        ? 'text-green-800'
                        : insight.type === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最適な投稿時間（プレースホルダー） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            最適な投稿時間
          </h2>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">
              投稿時間分析は今後実装予定です
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;