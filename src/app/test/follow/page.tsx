'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Box,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Card,
  CardContent
} from '@mui/material';

export default function FollowTestPage() {
  const { data: session } = useSession();
  const [userId, setUserId] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const clearMessages = () => {
    setResponse(null);
    setError(null);
  };

  const makeRequest = async (
    url: string,
    method: string = 'GET',
    body?: any
  ) => {
    clearMessages();
    setLoading(true);
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const data = await res.json();
      
      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error || 'Request failed'}`);
      } else {
        setResponse(data);
      }
      
      return data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get follow stats
  const getFollowStats = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    await makeRequest(`/api/sns/follow/${userId}`);
  };

  // Follow user
  const followUser = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    await makeRequest(`/api/sns/follow/${userId}`, 'POST');
  };

  // Unfollow user
  const unfollowUser = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    await makeRequest(`/api/sns/follow/${userId}`, 'DELETE');
  };

  // Get followers
  const getFollowers = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    await makeRequest(`/api/sns/followers/${userId}?page=1&limit=10`);
  };

  // Get following
  const getFollowing = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    await makeRequest(`/api/sns/following/${userId}?page=1&limit=10`);
  };

  // Test error cases
  const testSelfFollow = async () => {
    if (!session?.user?.id) {
      setError('You must be logged in');
      return;
    }
    await makeRequest(`/api/sns/follow/${session.user.id}`, 'POST');
  };

  const testInvalidUser = async () => {
    await makeRequest('/api/sns/follow/invalid-user-id', 'POST');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Follow API Test Page
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            {session ? (
              <>Logged in as: {session.user?.email} (ID: {session.user?.id})</>
            ) : (
              'Not logged in - Some tests require authentication'
            )}
          </Alert>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Target User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter a user ID to test with"
            helperText="Get this from MongoDB or the user profile"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Basic Operations
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Button 
            variant="outlined" 
            onClick={getFollowStats}
            disabled={loading}
          >
            Get Stats
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={followUser}
            disabled={loading || !session}
          >
            Follow User
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={unfollowUser}
            disabled={loading || !session}
          >
            Unfollow User
          </Button>
          <Button 
            variant="outlined"
            onClick={getFollowers}
            disabled={loading}
          >
            Get Followers
          </Button>
          <Button 
            variant="outlined"
            onClick={getFollowing}
            disabled={loading}
          >
            Get Following
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Error Case Testing
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={testSelfFollow}
            disabled={loading || !session}
          >
            Test Self-Follow
          </Button>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={testInvalidUser}
            disabled={loading || !session}
          >
            Test Invalid User
          </Button>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={() => followUser().then(() => followUser())}
            disabled={loading || !session}
          >
            Test Duplicate Follow
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {response && (
          <Card sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response:
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={response.success ? 'Success' : 'Response'} 
                  color={response.success ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Box 
                component="pre" 
                sx={{ 
                  overflow: 'auto',
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontSize: '0.875rem'
                }}
              >
                {JSON.stringify(response, null, 2)}
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>

      <Paper sx={{ p: 4, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          cURL Command Examples
        </Typography>
        
        <Box component="pre" sx={{ 
          bgcolor: 'grey.900', 
          color: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
{`# Get follow stats (no auth required)
curl -X GET "http://localhost:3000/api/sns/follow/USER_ID"

# Follow a user (requires auth)
curl -X POST "http://localhost:3000/api/sns/follow/USER_ID" \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json"

# Unfollow a user
curl -X DELETE "http://localhost:3000/api/sns/follow/USER_ID" \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Get followers with pagination
curl -X GET "http://localhost:3000/api/sns/followers/USER_ID?page=1&limit=20"

# Get following with pagination  
curl -X GET "http://localhost:3000/api/sns/following/USER_ID?page=1&limit=20"`}
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Get Session Cookie
        </Typography>
        
        <ol>
          <li>Open Chrome DevTools (F12)</li>
          <li>Go to Application → Cookies</li>
          <li>Find "next-auth.session-token" cookie</li>
          <li>Copy the value for use in cURL commands</li>
        </ol>
      </Paper>
    </Container>
  );
}