'use client';

import { Avatar } from '@mui/material';

interface UserAvatarProps {
  name: string;
  size?: number;
}

export default function UserAvatar({ name, size = 40 }: UserAvatarProps) {
  // デフォルト値を設定
  const displayName = name || 'Unknown User';
  
  // 名前から頭文字を取得
  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length === 1) {
      // 日本語の場合は最初の1文字、英語の場合は最初の2文字
      const firstChar = names[0].charAt(0);
      if (/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(firstChar)) {
        // 日本語の文字の場合
        return names[0].substring(0, 1);
      } else {
        // 英語の場合
        return names[0].substring(0, 2).toUpperCase();
      }
    }
    // 複数の単語がある場合は各単語の最初の文字
    return names.map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  // 名前から色を生成（一貫性のある色を生成）
  const stringToColor = (string: string) => {
    if (!string || string.length === 0) {
      return '#9e9e9e'; // デフォルトのグレー色
    }
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  };

  return (
    <Avatar
      sx={{
        bgcolor: stringToColor(displayName),
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {getInitials(displayName)}
    </Avatar>
  );
}