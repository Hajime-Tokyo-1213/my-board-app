'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  Card,
  CardContent,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

export default function DiagnosticPage() {
  const theme = useTheme();
  const [diagnostics, setDiagnostics] = useState({
    screenWidth: 0,
    screenHeight: 0,
    devicePixelRatio: 1,
    userAgent: '',
    performance: {
      memory: null as unknown,
      timing: null as PerformanceTiming | null,
    },
  });

  // Responsive breakpoints
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  useEffect(() => {
    const updateDiagnostics = () => {
      setDiagnostics({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent,
        performance: {
          memory: 'memory' in performance ? (performance as { memory: unknown } & Performance).memory : null,
          timing: performance.timing || null,
        },
      });
    };

    updateDiagnostics();
    window.addEventListener('resize', updateDiagnostics);
    return () => window.removeEventListener('resize', updateDiagnostics);
  }, []);

  const getBreakpointLabel = () => {
    if (isXs) return 'XS (< 600px)';
    if (isSm) return 'SM (600px - 900px)';
    if (isMd) return 'MD (900px - 1200px)';
    if (isLg) return 'LG (1200px - 1536px)';
    if (isXl) return 'XL (≥ 1536px)';
    return 'Unknown';
  };

  const checkStatus = (condition: boolean) => {
    return condition ? (
      <CheckCircleIcon color="success" />
    ) : (
      <ErrorIcon color="error" />
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        画面診断ツール
      </Typography>

      <Grid container spacing={3}>
        {/* スクリーン情報 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                スクリーン情報
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography>画面幅: {diagnostics.screenWidth}px</Typography>
                <Typography>画面高さ: {diagnostics.screenHeight}px</Typography>
                <Typography>デバイスピクセル比: {diagnostics.devicePixelRatio}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>現在のブレークポイント:</Typography>
                  <Chip
                    label={getBreakpointLabel()}
                    color="primary"
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Material UI 状態 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Material UI 状態
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {checkStatus(!!theme)}
                  <Typography>テーマプロバイダー</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {checkStatus(theme.palette.mode === 'light')}
                  <Typography>ライトモード</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {checkStatus(!!theme.palette.primary)}
                  <Typography>プライマリーカラー: {theme.palette.primary.main}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* レスポンシブテスト */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                レスポンシブデザインテスト
              </Typography>
              <Grid container spacing={2}>
                {[1, 2, 3, 4, 6, 12].map((cols) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={cols}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        backgroundColor: theme.palette.grey[100],
                      }}
                    >
                      <Typography variant="body2">
                        Grid {12 / cols} cols
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* コンポーネントテスト */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                コンポーネントテスト
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <Button variant="contained">Primary Button</Button>
                <Button variant="outlined">Outlined Button</Button>
                <Button variant="text">Text Button</Button>
                <Button variant="contained" disabled>
                  Disabled
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="success">Success Alert</Alert>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">Warning Alert</Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* パフォーマンス */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                パフォーマンス情報
              </Typography>
              {diagnostics.performance.memory ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    使用メモリ: {Math.round(((diagnostics.performance.memory as { usedJSHeapSize?: number })?.usedJSHeapSize || 0) / 1048576)}MB
                  </Typography>
                  <Typography variant="body2">
                    総メモリ: {Math.round(((diagnostics.performance.memory as { jsHeapSizeLimit?: number })?.jsHeapSizeLimit || 0) / 1048576)}MB
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  パフォーマンス情報は Chrome でのみ利用可能です
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 推奨事項 */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                検出された問題と推奨事項
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {diagnostics.screenWidth < 768 && (
                  <Alert severity="info" icon={<WarningIcon />}>
                    モバイルデバイスが検出されました。レスポンシブデザインを確認してください。
                  </Alert>
                )}
                {diagnostics.devicePixelRatio > 1 && (
                  <Alert severity="info">
                    高解像度ディスプレイが検出されました（{diagnostics.devicePixelRatio}x）。
                    画像の最適化を検討してください。
                  </Alert>
                )}
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Material UI テーマが正しく適用されています。
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}