'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  Divider,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import FollowButton from '@/features/sns/components/follows/FollowButton';
import { useSession } from 'next-auth/react';

// Mock users for demo
const DEMO_USERS = [
  {
    id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    username: 'johndoe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Software Engineer | Tech Enthusiast',
  },
  {
    id: '507f1f77bcf86cd799439012',
    name: 'Jane Smith',
    username: 'janesmith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    bio: 'Designer | Creative Mind',
  },
  {
    id: '507f1f77bcf86cd799439013',
    name: 'Bob Johnson',
    username: 'bobjohnson',
    avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Product Manager | Innovation Driver',
  },
];

export default function FollowButtonDemo() {
  const { data: session } = useSession();
  const [customUserId, setCustomUserId] = useState('');
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize follow counts
    const initialCounts: Record<string, number> = {};
    DEMO_USERS.forEach(user => {
      initialCounts[user.id] = Math.floor(Math.random() * 100);
    });
    setFollowCounts(initialCounts);
  }, []);

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    setFollowCounts(prev => ({
      ...prev,
      [userId]: prev[userId] + (isFollowing ? 1 : -1),
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Follow Button Component Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Test different variations and states of the Follow Button component
        </Typography>
        
        {!session && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Log in to test the follow functionality. Buttons will be disabled when not logged in.
          </Alert>
        )}
      </Paper>

      {/* Button Variations */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Button Variations
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contained (Default)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FollowButton
                    userId={DEMO_USERS[0].id}
                    userName={DEMO_USERS[0].name}
                    variant="contained"
                    size="small"
                  />
                  <FollowButton
                    userId={DEMO_USERS[0].id}
                    userName={DEMO_USERS[0].name}
                    variant="contained"
                    size="medium"
                  />
                  <FollowButton
                    userId={DEMO_USERS[0].id}
                    userName={DEMO_USERS[0].name}
                    variant="contained"
                    size="large"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Outlined
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FollowButton
                    userId={DEMO_USERS[1].id}
                    userName={DEMO_USERS[1].name}
                    variant="outlined"
                    size="small"
                  />
                  <FollowButton
                    userId={DEMO_USERS[1].id}
                    userName={DEMO_USERS[1].name}
                    variant="outlined"
                    size="medium"
                  />
                  <FollowButton
                    userId={DEMO_USERS[1].id}
                    userName={DEMO_USERS[1].name}
                    variant="outlined"
                    size="large"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Icon Only
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FollowButton
                    userId={DEMO_USERS[2].id}
                    userName={DEMO_USERS[2].name}
                    iconOnly
                    size="small"
                  />
                  <FollowButton
                    userId={DEMO_USERS[2].id}
                    userName={DEMO_USERS[2].name}
                    iconOnly
                    size="medium"
                  />
                  <FollowButton
                    userId={DEMO_USERS[2].id}
                    userName={DEMO_USERS[2].name}
                    iconOnly
                    size="large"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* User Cards */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          User Cards with Follow Buttons
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {DEMO_USERS.map(user => (
            <Grid item xs={12} md={4} key={user.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={user.avatar}
                      sx={{ width: 56, height: 56, mr: 2 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{user.username}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {user.bio}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                      label={`${followCounts[user.id] || 0} followers`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <FollowButton
                    userId={user.id}
                    userName={user.name}
                    fullWidth
                    onFollowChange={(isFollowing) =>
                      handleFollowChange(user.id, isFollowing)
                    }
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Custom User ID Test */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Test with Custom User ID
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            label="User ID"
            value={customUserId}
            onChange={(e) => setCustomUserId(e.target.value)}
            placeholder="Enter a MongoDB user ID"
            sx={{ minWidth: 300 }}
            helperText="Enter a valid user ID from your database"
          />
          {customUserId && (
            <FollowButton
              userId={customUserId}
              userName="Custom User"
              variant="contained"
              size="large"
            />
          )}
        </Box>
      </Paper>

      {/* Features */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Component Features
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              ✨ Features
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • Automatic follow status checking on mount
              </Typography>
              <Typography variant="body2">
                • Loading state during API calls
              </Typography>
              <Typography variant="body2">
                • Hover effects (Following → Unfollow)
              </Typography>
              <Typography variant="body2">
                • Error handling with notifications
              </Typography>
              <Typography variant="body2">
                • Success feedback messages
              </Typography>
              <Typography variant="body2">
                • Disabled state when not logged in
              </Typography>
              <Typography variant="body2">
                • Self-follow prevention
              </Typography>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              🎨 Customization Options
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • <strong>variant:</strong> contained | outlined | text
              </Typography>
              <Typography variant="body2">
                • <strong>size:</strong> small | medium | large
              </Typography>
              <Typography variant="body2">
                • <strong>fullWidth:</strong> Expand to container width
              </Typography>
              <Typography variant="body2">
                • <strong>iconOnly:</strong> Show only icon
              </Typography>
              <Typography variant="body2">
                • <strong>showUnfollowConfirm:</strong> Confirm before unfollow
              </Typography>
              <Typography variant="body2">
                • <strong>onFollowChange:</strong> Callback function
              </Typography>
              <Typography variant="body2">
                • <strong>className:</strong> Custom CSS classes
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}