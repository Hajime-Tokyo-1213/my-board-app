'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  Paper,
  Box,
  Chip,
  Typography,
  Popper,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Tag as TagIcon } from '@mui/icons-material';
import { getCurrentHashtag } from '@/lib/hashtag';
import debounce from 'lodash/debounce';

interface HashtagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}

interface HashtagSuggestion {
  name: string;
  count: number;
}

const HashtagInput: React.FC<HashtagInputProps> = ({
  value,
  onChange,
  placeholder = '投稿内容を入力... #タグも使えます',
  label,
  multiline = false,
  rows = 4,
  maxLength,
}) => {
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTag, setCurrentTag] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // ハッシュタグ候補を取得
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 1) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/hashtags?type=search&q=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.hashtags || []);
        }
      } catch (error) {
        console.error('Error fetching hashtag suggestions:', error);
      }
    }, 300),
    []
  );

  // テキスト変更時の処理
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const newCursorPosition = event.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(newCursorPosition);
    
    // 現在入力中のハッシュタグを検出
    const tag = getCurrentHashtag(newValue, newCursorPosition);
    setCurrentTag(tag);
    
    if (tag) {
      setShowSuggestions(true);
      setAnchorEl(event.target as HTMLElement);
      fetchSuggestions(tag);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // ハッシュタグを選択
  const selectHashtag = (hashtag: string) => {
    if (!currentTag || !inputRef.current) return;
    
    const input = inputRef.current;
    const text = value;
    
    // 現在のハッシュタグの開始位置を見つける
    let hashStart = cursorPosition - currentTag.length - 1;
    while (hashStart > 0 && text[hashStart] !== '#') {
      hashStart--;
    }
    
    // 新しいテキストを作成
    const before = text.slice(0, hashStart);
    const after = text.slice(cursorPosition);
    const newText = `${before}#${hashtag} ${after}`;
    
    onChange(newText);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // カーソル位置を調整
    setTimeout(() => {
      const newCursorPos = hashStart + hashtag.length + 2; // #tag + space
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  };

  // キーボードショートカット
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (event.key === 'Tab' || (event.key === 'Enter' && event.shiftKey)) {
        event.preventDefault();
        selectHashtag(suggestions[0].name);
      } else if (event.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  return (
    <Box position="relative">
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        label={label}
        multiline={multiline}
        rows={rows}
        fullWidth
        variant="outlined"
        inputProps={{ maxLength }}
        helperText={
          maxLength && (
            <Typography variant="caption" color={value.length > maxLength * 0.9 ? 'error' : 'text.secondary'}>
              {value.length} / {maxLength}
            </Typography>
          )
        }
      />
      
      <Popper
        open={showSuggestions && suggestions.length > 0}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          elevation={4}
          sx={{
            mt: 1,
            maxWidth: 300,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 1, backgroundColor: 'primary.main', color: 'white' }}>
            <Typography variant="caption" fontWeight="bold">
              ハッシュタグ候補
            </Typography>
          </Box>
          {suggestions.map((suggestion, index) => (
            <ListItem
              key={suggestion.name}
              component="div"
              onClick={() => selectHashtag(suggestion.name)}
              sx={{
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                cursor: 'pointer',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <TagIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={index === 0 ? 'bold' : 'normal'}>
                    #{suggestion.name}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {suggestion.count}件の投稿
                  </Typography>
                }
              />
            </ListItem>
          ))}
          <Box sx={{ p: 1, backgroundColor: 'grey.100' }}>
            <Typography variant="caption" color="text.secondary">
              Tab または Shift+Enter で選択
            </Typography>
          </Box>
        </Paper>
      </Popper>
    </Box>
  );
};

export default HashtagInput;