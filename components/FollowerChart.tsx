'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  date: string;
  followers: number;
  posts: number;
  engagement: number;
  likes: number;
}

interface FollowerChartProps {
  data: ChartData[];
  type?: 'line' | 'bar';
  metric?: 'followers' | 'engagement' | 'posts' | 'likes' | 'multi';
  height?: number;
  loading?: boolean;
}

const FollowerChart: React.FC<FollowerChartProps> = ({
  data,
  type = 'line',
  metric = 'multi',
  height = 300,
  loading = false,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.map(item => 
      format(parseISO(item.date), 'MM/dd', { locale: ja })
    );

    if (metric === 'multi') {
      return {
        labels,
        datasets: [
          {
            label: 'フォロワー',
            data: data.map(item => item.followers),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'エンゲージメント率 (%)',
            data: data.map(item => item.engagement),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: false,
          },
        ],
      };
    }

    const metricConfig = {
      followers: {
        label: 'フォロワー',
        color: 'rgb(59, 130, 246)',
        bgColor: 'rgba(59, 130, 246, 0.1)',
      },
      engagement: {
        label: 'エンゲージメント率 (%)',
        color: 'rgb(16, 185, 129)',
        bgColor: 'rgba(16, 185, 129, 0.1)',
      },
      posts: {
        label: '投稿数',
        color: 'rgb(168, 85, 247)',
        bgColor: 'rgba(168, 85, 247, 0.1)',
      },
      likes: {
        label: 'いいね数',
        color: 'rgb(251, 146, 60)',
        bgColor: 'rgba(251, 146, 60, 0.1)',
      },
    };

    const config = metricConfig[metric];
    return {
      labels,
      datasets: [
        {
          label: config.label,
          data: data.map(item => item[metric]),
          borderColor: config.color,
          backgroundColor: type === 'line' ? config.bgColor : config.color,
          tension: 0.4,
          fill: type === 'line',
        },
      ],
    };
  }, [data, metric, type]);

  const options: ChartOptions<typeof type> = useMemo(() => {
    const baseOptions: ChartOptions<typeof type> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 12,
          },
          bodyFont: {
            size: 11,
          },
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (label.includes('率')) {
                  label += context.parsed.y.toFixed(2) + '%';
                } else {
                  label += context.parsed.y.toLocaleString();
                }
              }
              return label;
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y: {
          display: true,
          position: 'left' as const,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: {
              size: 11,
            },
            callback: function(value) {
              return typeof value === 'number' ? value.toLocaleString() : value;
            },
          },
        },
      },
    };

    if (metric === 'multi') {
      baseOptions.scales = {
        ...baseOptions.scales,
        y1: {
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            font: {
              size: 11,
            },
            callback: function(value) {
              return typeof value === 'number' ? value.toFixed(1) + '%' : value;
            },
          },
        },
      };
    }

    return baseOptions;
  }, [metric]);

  if (loading) {
    return (
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
        style={{ height }}
      >
        <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="h-full bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-gray-500">データがありません</p>
      </div>
    );
  }

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div style={{ height }}>
        <ChartComponent data={chartData} options={options} />
      </div>
    </div>
  );
};

export default FollowerChart;