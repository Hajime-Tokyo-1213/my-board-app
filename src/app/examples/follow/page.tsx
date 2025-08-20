'use client';

import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Tabs,
  Tab,
  Stack,
  Chip,
  Divider,
  Alert,
  Button,
} from '@mui/material';
import FollowButton from '@/components/FollowButton';
import FollowList from '@/components/FollowList';
import { FollowProvider } from '@/contexts/FollowContext';
import { useSession } from 'next-auth/react';
import {
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

// Demo user data
const DEMO_USER = {
  id: '507f1f77bcf86cd799439011',
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  bio: 'Full Stack Developer | Open Source Enthusiast | Coffee Lover ☕',
  avatar: 'https://i.pravatar.cc/150?img=1',
  followersCount: 1234,
  followingCount: 567,
  postsCount: 89,
  isVerified: true,
};

function TabPanel({ children, value, index }: any) {
  return (
    <div hidden={value !== index} style={{ paddingTop: '20px' }}>
      {value === index && children}
    </div>
  );
}

export default function FollowExamplePage() {
  const { data: session } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(DEMO_USER);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <FollowProvider>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: 4, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Typography variant="h3" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
            Follow System Components
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Beautiful follow buttons and lists with Material UI
          </Typography>
        </Paper>

        {!session && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Please log in to test the full functionality of the follow system.
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* User Profile Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <Box
                sx={{
                  height: 120,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              />
              <CardContent sx={{ textAlign: 'center', mt: -6 }}>
                <Avatar
                  src={selectedUser.avatar}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    border: '4px solid white',
                    mb: 2,
                  }}
                />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  {selectedUser.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  @{selectedUser.username}
                </Typography>
                <Typography variant="body2" sx={{ my: 2 }}>
                  {selectedUser.bio}
                </Typography>
                
                <Stack direction="row" spacing={3} justifyContent="center" sx={{ my: 3 }}>
                  <Box textAlign="center">
                    <Typography variant="h6" fontWeight={600}>
                      {selectedUser.followersCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Followers
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" fontWeight={600}>
                      {selectedUser.followingCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Following
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" fontWeight={600}>
                      {selectedUser.postsCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Posts
                    </Typography>
                  </Box>
                </Stack>

                <FollowButton
                  userId={selectedUser.id}
                  userName={selectedUser.name}
                  fullWidth
                  size="large"
                  showFollowerCount
                  followerCount={selectedUser.followersCount}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Button Variants */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Button Variants
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Contained Buttons
                  </Typography>
                  <Stack spacing={2}>
                    <FollowButton
                      userId="user1"
                      userName="User 1"
                      variant="contained"
                      size="small"
                    />
                    <FollowButton
                      userId="user2"
                      userName="User 2"
                      variant="contained"
                      size="medium"
                    />
                    <FollowButton
                      userId="user3"
                      userName="User 3"
                      variant="contained"
                      size="large"
                      showFollowerCount
                      followerCount={42}
                    />
                  </Stack>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Other Variants
                  </Typography>
                  <Stack spacing={2}>
                    <FollowButton
                      userId="user4"
                      userName="User 4"
                      variant="outlined"
                      size="medium"
                    />
                    <FollowButton
                      userId="user5"
                      userName="User 5"
                      variant="text"
                      size="medium"
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FollowButton
                        userId="user6"
                        userName="User 6"
                        variant="icon"
                        size="small"
                      />
                      <FollowButton
                        userId="user7"
                        userName="User 7"
                        variant="icon"
                        size="medium"
                      />
                      <FollowButton
                        userId="user8"
                        userName="User 8"
                        variant="icon"
                        size="large"
                      />
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Follow Lists */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Follow Lists
              </Typography>
              <Divider />
              
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mt: 2 }}>
                <Tab 
                  icon={<GroupIcon />} 
                  label="Followers" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<PersonAddIcon />} 
                  label="Following" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<TrendingUpIcon />} 
                  label="Suggestions" 
                  iconPosition="start"
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <FollowList
                  userId={selectedUser.id}
                  type="followers"
                  limit={5}
                  showFollowButton
                  onUserClick={(user) => console.log('User clicked:', user)}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <FollowList
                  userId={selectedUser.id}
                  type="following"
                  limit={5}
                  showFollowButton
                  onUserClick={(user) => console.log('User clicked:', user)}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <FollowList
                  type="suggestions"
                  limit={5}
                  showFollowButton
                  onUserClick={(user) => console.log('User clicked:', user)}
                />
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>

        {/* Features Section */}
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Component Features
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  🎨 Beautiful Design
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clean and modern UI with smooth animations, hover effects, and responsive design that looks great on all devices.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  ⚡ Optimized Performance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Efficient state management with Context API, debounced API calls, and optimistic UI updates for instant feedback.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  🛡️ Error Handling
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive error handling with user-friendly notifications, loading states, and graceful fallbacks.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Code Example */}
        <Paper sx={{ p: 4, mt: 4, bgcolor: 'grey.900' }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
            Quick Start
          </Typography>
          <Box
            component="pre"
            sx={{
              color: 'grey.100',
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          >
{`import FollowButton from '@/components/FollowButton';
import FollowList from '@/components/FollowList';
import { FollowProvider } from '@/contexts/FollowContext';

// Simple follow button
<FollowButton 
  userId="user-id" 
  userName="John Doe" 
/>

// With follower count
<FollowButton 
  userId="user-id"
  showFollowerCount
  followerCount={1234}
/>

// Icon only variant
<FollowButton 
  userId="user-id"
  variant="icon"
  size="small"
/>

// Follow list
<FollowList
  userId="user-id"
  type="followers"
  showFollowButton
/>`}
          </Box>
        </Paper>
      </Container>
    </FollowProvider>
  );
}