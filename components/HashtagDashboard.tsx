'use client';

import React from 'react';
import { Grid, Box } from '@mui/material';
import TagCloud from './TagCloud';
import TrendingTags from './TrendingTags';
import HashtagSearchBox from './HashtagSearchBox';

interface HashtagDashboardProps {
  showSearch?: boolean;
  showCloud?: boolean;
  showTrending?: boolean;
  compact?: boolean;
  onHashtagClick?: (hashtag: string) => void;
  selectedHashtag?: string | null;
}

const HashtagDashboard: React.FC<HashtagDashboardProps> = ({
  showSearch = true,
  showCloud = true,
  showTrending = true,
  compact = false,
  onHashtagClick,
  selectedHashtag,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {showSearch && (
        <Box sx={{ mb: 3 }}>
          <HashtagSearchBox 
            onHashtagSelect={onHashtagClick}
            selectedHashtag={selectedHashtag}
          />
        </Box>
      )}
      
      <Grid container spacing={3}>
        {showTrending && (
          <Grid item xs={12} md={compact ? 12 : 6}>
            <TrendingTags 
              compact={compact} 
              onHashtagClick={onHashtagClick}
            />
          </Grid>
        )}
        
        {showCloud && !compact && (
          <Grid item xs={12} md={6}>
            <TagCloud 
              limit={20} 
              onHashtagClick={onHashtagClick}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default HashtagDashboard;