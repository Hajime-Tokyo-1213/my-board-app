'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  time?: number;
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(test => 
        test.name === name ? { ...test, ...updates } : test
      )
    );
  };

  const runCRUDTests = async () => {
    setIsRunning(true);
    
    // テストケースを初期化
    const tests: TestResult[] = [
      { name: 'Create: 通常の投稿作成', status: 'pending' },
      { name: 'Create: 空の投稿（エラー期待）', status: 'pending' },
      { name: 'Create: 201文字の投稿（エラー期待）', status: 'pending' },
      { name: 'Create: 特殊文字を含む投稿', status: 'pending' },
      { name: 'Read: 投稿一覧の取得', status: 'pending' },
      { name: 'Read: 特定の投稿取得', status: 'pending' },
      { name: 'Update: 投稿の更新', status: 'pending' },
      { name: 'Update: 空の内容で更新（エラー期待）', status: 'pending' },
      { name: 'Delete: 投稿の削除', status: 'pending' },
      { name: 'Delete: 存在しないID（エラー期待）', status: 'pending' },
    ];
    setTestResults(tests);

    // Test 1: 通常の投稿作成
    updateTestResult('Create: 通常の投稿作成', { status: 'running' });
    const startTime = Date.now();
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'テスト投稿：正常系テスト' }),
      });
      const data = await res.json();
      const postId = data.data?._id;
      
      if (res.status === 201 && data.success) {
        updateTestResult('Create: 通常の投稿作成', { 
          status: 'passed', 
          message: `投稿ID: ${postId}`,
          time: Date.now() - startTime
        });
      } else {
        throw new Error('投稿作成に失敗');
      }

      // Test 2: 空の投稿
      updateTestResult('Create: 空の投稿（エラー期待）', { status: 'running' });
      const emptyRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });
      const emptyData = await emptyRes.json();
      
      if (emptyRes.status === 400 && !emptyData.success) {
        updateTestResult('Create: 空の投稿（エラー期待）', { 
          status: 'passed', 
          message: 'エラーを正しく検出',
          time: Date.now() - startTime
        });
      } else {
        throw new Error('空の投稿が通ってしまった');
      }

      // Test 3: 201文字の投稿
      updateTestResult('Create: 201文字の投稿（エラー期待）', { status: 'running' });
      const longText = 'あ'.repeat(201);
      const longRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: longText }),
      });
      const longData = await longRes.json();
      
      if (longRes.status === 400 && !longData.success) {
        updateTestResult('Create: 201文字の投稿（エラー期待）', { 
          status: 'passed', 
          message: '文字数制限が機能',
          time: Date.now() - startTime
        });
      } else {
        throw new Error('文字数制限が機能していない');
      }

      // Test 4: 特殊文字
      updateTestResult('Create: 特殊文字を含む投稿', { status: 'running' });
      const specialRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '😀🎉 <script>alert("test")</script> 改行\nテスト' }),
      });
      const specialData = await specialRes.json();
      const specialPostId = specialData.data?._id;
      
      if (specialRes.status === 201 && specialData.success) {
        updateTestResult('Create: 特殊文字を含む投稿', { 
          status: 'passed', 
          message: '特殊文字が正しく処理された',
          time: Date.now() - startTime
        });
      } else {
        throw new Error('特殊文字の処理に失敗');
      }

      // Test 5: Read一覧
      updateTestResult('Read: 投稿一覧の取得', { status: 'running' });
      const listRes = await fetch('/api/posts');
      const listData = await listRes.json();
      
      if (listRes.status === 200 && Array.isArray(listData.data)) {
        updateTestResult('Read: 投稿一覧の取得', { 
          status: 'passed', 
          message: `${listData.data.length}件の投稿を取得`,
          time: Date.now() - startTime
        });
      } else {
        throw new Error('一覧取得に失敗');
      }

      // Test 6: Read特定の投稿
      updateTestResult('Read: 特定の投稿取得', { status: 'running' });
      if (postId) {
        const getRes = await fetch(`/api/posts/${postId}`);
        const getData = await getRes.json();
        
        if (getRes.status === 200 && getData.success) {
          updateTestResult('Read: 特定の投稿取得', { 
            status: 'passed', 
            message: '投稿を正しく取得',
            time: Date.now() - startTime
          });
        } else {
          throw new Error('特定投稿の取得に失敗');
        }
      }

      // Test 7: Update
      updateTestResult('Update: 投稿の更新', { status: 'running' });
      if (postId) {
        const updateRes = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'テスト投稿：更新されました' }),
        });
        const updateData = await updateRes.json();
        
        if (updateRes.status === 200 && updateData.success) {
          updateTestResult('Update: 投稿の更新', { 
            status: 'passed', 
            message: '投稿を正しく更新',
            time: Date.now() - startTime
          });
        } else {
          throw new Error('更新に失敗');
        }
      }

      // Test 8: Update空の内容
      updateTestResult('Update: 空の内容で更新（エラー期待）', { status: 'running' });
      if (postId) {
        const emptyUpdateRes = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '' }),
        });
        const emptyUpdateData = await emptyUpdateRes.json();
        
        if (emptyUpdateRes.status === 400 && !emptyUpdateData.success) {
          updateTestResult('Update: 空の内容で更新（エラー期待）', { 
            status: 'passed', 
            message: 'エラーを正しく検出',
            time: Date.now() - startTime
          });
        } else {
          throw new Error('空の更新が通ってしまった');
        }
      }

      // Test 9: Delete
      updateTestResult('Delete: 投稿の削除', { status: 'running' });
      if (postId) {
        const deleteRes = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
        });
        const deleteData = await deleteRes.json();
        
        if (deleteRes.status === 200 && deleteData.success) {
          updateTestResult('Delete: 投稿の削除', { 
            status: 'passed', 
            message: '投稿を正しく削除',
            time: Date.now() - startTime
          });
        } else {
          throw new Error('削除に失敗');
        }
      }

      // Test 10: Delete存在しないID
      updateTestResult('Delete: 存在しないID（エラー期待）', { status: 'running' });
      const fakeId = '000000000000000000000000';
      const fakeDeleteRes = await fetch(`/api/posts/${fakeId}`, {
        method: 'DELETE',
      });
      const fakeDeleteData = await fakeDeleteRes.json();
      
      if (fakeDeleteRes.status === 404 && !fakeDeleteData.success) {
        updateTestResult('Delete: 存在しないID（エラー期待）', { 
          status: 'passed', 
          message: 'エラーを正しく検出',
          time: Date.now() - startTime
        });
      } else {
        throw new Error('存在しないIDの削除が通ってしまった');
      }

      // 特殊文字投稿のクリーンアップ
      if (specialPostId) {
        await fetch(`/api/posts/${specialPostId}`, { method: 'DELETE' });
      }

    } catch (error) {
      console.error('Test error:', error);
      // エラーが発生したテストを失敗に
      setTestResults(prev => 
        prev.map(test => 
          test.status === 'running' 
            ? { ...test, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' } 
            : test
        )
      );
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'running':
        return <LinearProgress sx={{ width: 20 }} />;
      default:
        return null;
    }
  };

  const getStatusChip = (status: TestResult['status']) => {
    const colorMap = {
      pending: 'default',
      running: 'info',
      passed: 'success',
      failed: 'error',
    } as const;

    return (
      <Chip 
        label={status.toUpperCase()} 
        color={colorMap[status]} 
        size="small"
      />
    );
  };

  const passedCount = testResults.filter(t => t.status === 'passed').length;
  const failedCount = testResults.filter(t => t.status === 'failed').length;
  const totalCount = testResults.length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        CRUD機能自動テスト
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">テスト実行</Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={runCRUDTests}
            disabled={isRunning}
          >
            {isRunning ? 'テスト実行中...' : 'テストを実行'}
          </Button>
        </Box>

        {testResults.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={4}>
                <Alert severity="info" icon={false}>
                  合計: {totalCount} テスト
                </Alert>
              </Grid>
              <Grid size={4}>
                <Alert severity="success" icon={false}>
                  成功: {passedCount} テスト
                </Alert>
              </Grid>
              <Grid size={4}>
                <Alert severity="error" icon={false}>
                  失敗: {failedCount} テスト
                </Alert>
              </Grid>
            </Grid>
          </Box>
        )}

        {testResults.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>テスト名</TableCell>
                  <TableCell align="center">状態</TableCell>
                  <TableCell>メッセージ</TableCell>
                  <TableCell align="right">実行時間</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {testResults.map((test) => (
                  <TableRow key={test.name}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(test.status)}
                        {test.name}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(test.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {test.message || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {test.time ? `${test.time}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Alert severity="info">
        <Typography variant="body2">
          このページでは掲示板のCRUD機能を自動的にテストします。
          テストには実際のAPIを使用するため、テスト用の投稿が作成・削除されます。
        </Typography>
      </Alert>
    </Container>
  );
}