import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export const metadata: Metadata = {
  title: '分析ダッシュボード | My Board App',
  description: 'アカウントのパフォーマンスと成長を追跡',
};

export default async function AnalyticsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return <AnalyticsDashboard />;
}