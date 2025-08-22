'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  Snackbar,
  CircularProgress,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Lock as LockIcon,
  Public as PublicIcon,
  Group as GroupIcon,
  SwapHoriz as SwapHorizIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  NotificationsActive as NotificationsIcon,
  Message as MessageIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { IPrivacySettings } from '@/models/PrivacySettings';
import { usePrivacy } from '@/hooks/usePrivacy';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`privacy-tabpanel-${index}`}
      aria-labelledby={`privacy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PrivacySettings: React.FC = () => {
  const { settings, loading, updateSettings, resetSettings } = usePrivacy();
  const [localSettings, setLocalSettings] = useState<IPrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = (field: keyof IPrivacySettings, value: boolean) => {
    if (!localSettings) return;
    
    const updatedSettings = { ...localSettings, [field]: value };
    
    // 非公開アカウントの場合、自動的にフォロー承認を必須にする
    if (field === 'isPrivate' && value) {
      updatedSettings.requireFollowApproval = true;
    }
    
    setLocalSettings(updatedSettings);
  };

  const handleSelect = (field: keyof IPrivacySettings, value: string) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [field]: value });
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      notifications: {
        ...localSettings.notifications,
        [key]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!localSettings) return;
    
    setSaving(true);
    try {
      await updateSettings(localSettings);
      setNotification({
        open: true,
        message: 'プライバシー設定を保存しました',
        severity: 'success',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: 'プライバシー設定の保存に失敗しました',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('プライバシー設定をデフォルトに戻しますか？')) {
      setSaving(true);
      try {
        const defaultSettings = await resetSettings();
        setLocalSettings(defaultSettings);
        setNotification({
          open: true,
          message: 'プライバシー設定をリセットしました',
          severity: 'success',
        });
      } catch (error) {
        setNotification({
          open: true,
          message: 'リセットに失敗しました',
          severity: 'error',
        });
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading || !localSettings) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const notificationLabels: Record<string, string> = {
    likes: 'いいね',
    comments: 'コメント',
    follows: 'フォロー',
    mentions: 'メンション',
    shares: 'シェア',
    messages: 'メッセージ',
    followRequests: 'フォローリクエスト',
  };

  const notificationDescriptions: Record<string, string> = {
    likes: '投稿にいいねされたときに通知',
    comments: '投稿にコメントされたときに通知',
    follows: '新しいフォロワーの通知',
    mentions: '@メンションされたときに通知',
    shares: '投稿がシェアされたときに通知',
    messages: '新しいメッセージの通知',
    followRequests: 'フォローリクエストの通知',
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        プライバシー設定
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="アカウント" icon={<LockIcon />} iconPosition="start" />
          <Tab label="投稿" icon={<VisibilityIcon />} iconPosition="start" />
          <Tab label="通知" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="プロフィール" icon={<PersonIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* アカウントのプライバシー */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              アカウントのプライバシー
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.isPrivate}
                  onChange={(e) => handleToggle('isPrivate', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography>非公開アカウント（鍵垢）</Typography>
                  <Typography variant="caption" color="text.secondary">
                    承認したフォロワーのみがあなたの投稿を見ることができます
                  </Typography>
                </Box>
              }
            />
            
            <Divider sx={{ my: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.allowSearchIndexing}
                  onChange={(e) => handleToggle('allowSearchIndexing', e.target.checked)}
                />
              }
              label="検索エンジンでの表示を許可"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showOnlineStatus}
                  onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                />
              }
              label="オンライン状態を表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showLastSeen}
                  onChange={(e) => handleToggle('showLastSeen', e.target.checked)}
                />
              }
              label="最終アクセス時刻を表示"
            />
          </CardContent>
        </Card>

        {/* フォロー設定 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              フォロー設定
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.requireFollowApproval}
                  onChange={(e) => handleToggle('requireFollowApproval', e.target.checked)}
                  disabled={localSettings.isPrivate} // 非公開アカウントの場合は常にON
                />
              }
              label="フォロー承認制"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.allowFollowRequests}
                  onChange={(e) => handleToggle('allowFollowRequests', e.target.checked)}
                />
              }
              label="フォローリクエストを受け付ける"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* 投稿の公開範囲 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              投稿のデフォルト設定
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>デフォルトの公開範囲</InputLabel>
              <Select
                value={localSettings.defaultPostVisibility}
                onChange={(e: SelectChangeEvent) => 
                  handleSelect('defaultPostVisibility', e.target.value)
                }
              >
                <MenuItem value="public">
                  <Box display="flex" alignItems="center">
                    <PublicIcon sx={{ mr: 1 }} /> 全員に公開
                  </Box>
                </MenuItem>
                <MenuItem value="followers">
                  <Box display="flex" alignItems="center">
                    <GroupIcon sx={{ mr: 1 }} /> フォロワーのみ
                  </Box>
                </MenuItem>
                <MenuItem value="mutual">
                  <Box display="flex" alignItems="center">
                    <SwapHorizIcon sx={{ mr: 1 }} /> 相互フォローのみ
                  </Box>
                </MenuItem>
                <MenuItem value="private">
                  <Box display="flex" alignItems="center">
                    <LockIcon sx={{ mr: 1 }} /> 自分のみ
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              インタラクションの許可
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>コメント</InputLabel>
                  <Select
                    value={localSettings.allowComments}
                    onChange={(e: SelectChangeEvent) => 
                      handleSelect('allowComments', e.target.value)
                    }
                  >
                    <MenuItem value="everyone">全員</MenuItem>
                    <MenuItem value="followers">フォロワー</MenuItem>
                    <MenuItem value="mutual">相互フォロー</MenuItem>
                    <MenuItem value="none">許可しない</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>いいね</InputLabel>
                  <Select
                    value={localSettings.allowLikes}
                    onChange={(e: SelectChangeEvent) => 
                      handleSelect('allowLikes', e.target.value)
                    }
                  >
                    <MenuItem value="everyone">全員</MenuItem>
                    <MenuItem value="followers">フォロワー</MenuItem>
                    <MenuItem value="mutual">相互フォロー</MenuItem>
                    <MenuItem value="none">許可しない</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>シェア</InputLabel>
                  <Select
                    value={localSettings.allowShares}
                    onChange={(e: SelectChangeEvent) => 
                      handleSelect('allowShares', e.target.value)
                    }
                  >
                    <MenuItem value="everyone">全員</MenuItem>
                    <MenuItem value="followers">フォロワー</MenuItem>
                    <MenuItem value="mutual">相互フォロー</MenuItem>
                    <MenuItem value="none">許可しない</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* 通知設定 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              通知設定
            </Typography>
            
            <List>
              {Object.entries(localSettings.notifications).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={notificationLabels[key]}
                    secondary={notificationDescriptions[key]}
                  />
                  <Switch
                    checked={value}
                    onChange={(e) => handleNotificationToggle(key, e.target.checked)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* プロフィール表示設定 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              プロフィール表示設定
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showFollowerCount}
                  onChange={(e) => handleToggle('showFollowerCount', e.target.checked)}
                />
              }
              label="フォロワー数を表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showFollowingCount}
                  onChange={(e) => handleToggle('showFollowingCount', e.target.checked)}
                />
              }
              label="フォロー数を表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showPostCount}
                  onChange={(e) => handleToggle('showPostCount', e.target.checked)}
                />
              }
              label="投稿数を表示"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.showJoinDate}
                  onChange={(e) => handleToggle('showJoinDate', e.target.checked)}
                />
              }
              label="登録日を表示"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <CircularProgress size={24} /> : '設定を保存'}
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleReset}
          disabled={saving}
        >
          リセット
        </Button>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PrivacySettings;