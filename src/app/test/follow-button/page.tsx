'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Divider,
  Alert,
  Button,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import FollowButton from '@/components/FollowButton';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';

// テスト用のユーザーID（MongoDBから実際のIDを使用）
const TEST_USERS = [
  { id: '6714b5c9e123456789abcdef', name: 'Test User A', description: 'メインテストユーザー' },
  { id: '6714b5c9e123456789abcde0', name: 'Test User B', description: 'フォロー対象ユーザー' },
  { id: '6714b5c9e123456789abcde1', name: 'Test User C', description: '相互フォローテスト用' },
];

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function FollowButtonTestPage() {
  const { data: session, status } = useSession();
  const [customUserId, setCustomUserId] = useState('');
  const [testResults, setTestResults] = useState<TestCase[]>([
    { id: '1', title: 'ログイン状態', description: 'ユーザーがログインしているか確認', status: 'pending' },
    { id: '2', title: 'ボタン表示', description: 'フォローボタンが正しく表示されるか', status: 'pending' },
    { id: '3', title: 'フォロー機能', description: 'フォローが正常に動作するか', status: 'pending' },
    { id: '4', title: 'アンフォロー機能', description: 'アンフォローが正常に動作するか', status: 'pending' },
    { id: '5', title: 'エラーハンドリング', description: 'エラー時の通知が表示されるか', status: 'pending' },
  ]);

  useEffect(() => {
    // ログイン状態のチェック
    setTestResults(prev => prev.map(test => 
      test.id === '1' ? {
        ...test,
        status: session ? 'success' : 'error',
        message: session ? `${session.user?.email} でログイン中` : 'ログインしてください'
      } : test
    ));
  }, [session]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 4, mb: 4, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h4" gutterBottom>
          🧪 フォローボタン テストページ
        </Typography>
        <Typography variant="body1">
          フォローボタンの動作確認とエラーケースのテストを行います
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* ステップ1: ログイン確認 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Step 1: ログイン状態の確認
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {status === 'loading' ? (
                <Alert severity="info">確認中...</Alert>
              ) : session ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  ✅ ログイン済み: {session.user?.email}
                  <br />
                  ユーザーID: {session.user?.id || 'N/A'}
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ ログインしていません
                  <Button 
                    size="small" 
                    sx={{ ml: 2 }}
                    onClick={() => signIn()}
                  >
                    ログイン
                  </Button>
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                フォローボタンのテストにはログインが必要です
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* ステップ2: テストユーザー */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Step 2: テストユーザーの準備
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                {TEST_USERS.map(user => (
                  <ListItem key={user.id}>
                    <ListItemText
                      primary={user.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption">{user.id}</Typography>
                          <Tooltip title="コピー">
                            <IconButton size="small" onClick={() => copyToClipboard(user.id)}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                MongoDBに実際のユーザーを作成するか、
                <br />
                `node scripts/test-follow.mjs` を実行してテストユーザーを作成
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* ステップ3: ボタンテスト */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Step 3: フォローボタンの動作テスト
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* 基本動作テスト */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                      📌 基本動作テスト
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          1. クリックでフォロー
                        </Typography>
                        <FollowButton
                          userId={TEST_USERS[0].id}
                          userName={TEST_USERS[0].name}
                          variant="contained"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          2. もう一度クリックでアンフォロー
                        </Typography>
                        <FollowButton
                          userId={TEST_USERS[1].id}
                          userName={TEST_USERS[1].name}
                          variant="outlined"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          3. フォロワー数表示
                        </Typography>
                        <FollowButton
                          userId={TEST_USERS[2].id}
                          userName={TEST_USERS[2].name}
                          showFollowerCount
                          followerCount={123}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* エラーケーステスト */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                      ⚠️ エラーケーステスト
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          1. 自分自身をフォロー（エラーになるはず）
                        </Typography>
                        <FollowButton
                          userId={session?.user?.id || 'self'}
                          userName="自分"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          2. 無効なユーザーID
                        </Typography>
                        <FollowButton
                          userId="invalid-user-id"
                          userName="存在しないユーザー"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          3. 空のユーザーID
                        </Typography>
                        <FollowButton
                          userId=""
                          userName="空のID"
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* カスタムIDテスト */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                      🔧 カスタムIDテスト
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="ユーザーID"
                      value={customUserId}
                      onChange={(e) => setCustomUserId(e.target.value)}
                      placeholder="MongoDBのユーザーIDを入力"
                      sx={{ mb: 2 }}
                    />
                    {customUserId && (
                      <FollowButton
                        userId={customUserId}
                        userName="カスタムユーザー"
                        fullWidth
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      MongoDBから実際のユーザーIDをコピーして貼り付け
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* ステップ4: 確認事項 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  Step 4: 動作確認チェックリスト
                </Typography>
                <IconButton onClick={refreshPage}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <List>
                {testResults.map(test => (
                  <ListItem key={test.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {test.status === 'success' && <CheckCircleIcon color="success" sx={{ mr: 2 }} />}
                      {test.status === 'error' && <ErrorIcon color="error" sx={{ mr: 2 }} />}
                      {test.status === 'pending' && <InfoIcon color="disabled" sx={{ mr: 2 }} />}
                      <ListItemText
                        primary={test.title}
                        secondary={
                          <>
                            {test.description}
                            {test.message && (
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                {test.message}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Chip
                        label={
                          test.status === 'success' ? 'OK' :
                          test.status === 'error' ? 'NG' : '未確認'
                        }
                        color={
                          test.status === 'success' ? 'success' :
                          test.status === 'error' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* デバッグ情報 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🐛 デバッグ情報
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                overflow: 'auto'
              }}>
{`セッション情報:
${JSON.stringify(session, null, 2)}

テスト手順:
1. DevTools (F12) → Network タブを開く
2. フォローボタンをクリック
3. /api/sns/follow/* へのリクエストを確認
4. レスポンスのステータスコードを確認
  - 200: 成功
  - 401: 認証エラー
  - 404: ユーザーが見つからない
  - 409: 既にフォロー済み
  - 500: サーバーエラー`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}