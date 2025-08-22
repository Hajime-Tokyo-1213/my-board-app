import {
  hiraganaToKatakana,
  katakanaToHiragana,
  toHalfWidth,
  halfKatakanaToFullKatakana,
  normalizeForSearch,
  expandSearchQuery,
  createSearchRegex,
  calculateSimilarity,
  calculateSearchScore,
  sortBySearchScore,
} from '@/lib/japaneseSearch';

describe('Japanese Search Utilities', () => {
  describe('hiraganaToKatakana', () => {
    it('should convert hiragana to katakana', () => {
      expect(hiraganaToKatakana('あいうえお')).toBe('アイウエオ');
      expect(hiraganaToKatakana('さとう')).toBe('サトウ');
      expect(hiraganaToKatakana('こんにちは')).toBe('コンニチハ');
    });

    it('should not affect non-hiragana characters', () => {
      expect(hiraganaToKatakana('ABC123')).toBe('ABC123');
      expect(hiraganaToKatakana('アイウエオ')).toBe('アイウエオ');
      expect(hiraganaToKatakana('漢字')).toBe('漢字');
    });

    it('should handle mixed text', () => {
      expect(hiraganaToKatakana('あいうABC')).toBe('アイウABC');
      expect(hiraganaToKatakana('山田たろう')).toBe('山田タロウ');
    });
  });

  describe('katakanaToHiragana', () => {
    it('should convert katakana to hiragana', () => {
      expect(katakanaToHiragana('アイウエオ')).toBe('あいうえお');
      expect(katakanaToHiragana('サトウ')).toBe('さとう');
      expect(katakanaToHiragana('コンニチハ')).toBe('こんにちは');
    });

    it('should not affect non-katakana characters', () => {
      expect(katakanaToHiragana('ABC123')).toBe('ABC123');
      expect(katakanaToHiragana('あいうえお')).toBe('あいうえお');
      expect(katakanaToHiragana('漢字')).toBe('漢字');
    });
  });

  describe('toHalfWidth', () => {
    it('should convert full-width alphanumeric to half-width', () => {
      expect(toHalfWidth('ＡＢＣ１２３')).toBe('ABC123');
      expect(toHalfWidth('ａｂｃ')).toBe('abc');
      expect(toHalfWidth('０９８７６５４３２１')).toBe('0987654321');
    });

    it('should not affect already half-width characters', () => {
      expect(toHalfWidth('ABC123')).toBe('ABC123');
      expect(toHalfWidth('あいうえお')).toBe('あいうえお');
    });
  });

  describe('halfKatakanaToFullKatakana', () => {
    it('should convert half-width katakana to full-width', () => {
      expect(halfKatakanaToFullKatakana('ｱｲｳｴｵ')).toBe('アイウエオ');
      expect(halfKatakanaToFullKatakana('ｻﾄｳ')).toBe('サトウ');
      expect(halfKatakanaToFullKatakana('ｶﾞｷﾞｸﾞｹﾞｺﾞ')).toBe('ガギグゲゴ');
      expect(halfKatakanaToFullKatakana('ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ')).toBe('パピプペポ');
    });

    it('should not affect full-width katakana', () => {
      expect(halfKatakanaToFullKatakana('アイウエオ')).toBe('アイウエオ');
    });
  });

  describe('normalizeForSearch', () => {
    it('should normalize Japanese text for search', () => {
      expect(normalizeForSearch('ＡＢＣ１２３')).toBe('abc123');
      expect(normalizeForSearch('ｱｲｳｴｵ')).toBe('アイウエオ');
      expect(normalizeForSearch('  空白　　テスト  ')).toBe('空白 テスト');
      expect(normalizeForSearch('HELLO')).toBe('hello');
    });

    it('should handle empty or null input', () => {
      expect(normalizeForSearch('')).toBe('');
      expect(normalizeForSearch(null as any)).toBe('');
      expect(normalizeForSearch(undefined as any)).toBe('');
    });

    it('should normalize complex Japanese text', () => {
      expect(normalizeForSearch('ﾀﾅｶ　ＴＡＲＯう')).toBe('タナカ taroう');
      expect(normalizeForSearch('１２３ｱｲｳ　ＡＢＣ')).toBe('123アイウ abc');
    });
  });

  describe('expandSearchQuery', () => {
    it('should expand search query to variations', () => {
      const variations = expandSearchQuery('たなか');
      expect(variations).toContain('たなか');
      expect(variations).toContain('タナカ');
    });

    it('should handle space-separated words', () => {
      const variations = expandSearchQuery('田中 太郎');
      expect(variations).toContain('田中 太郎');
      expect(variations).toContain('田中');
      expect(variations).toContain('太郎');
    });

    it('should normalize and expand', () => {
      const variations = expandSearchQuery('ＡＢＣ');
      expect(variations).toContain('abc');
    });
  });

  describe('createSearchRegex', () => {
    it('should create regex for partial match', () => {
      const regex = createSearchRegex('test', { partial: true });
      expect('testing').toMatch(regex);
      expect('pretest').toMatch(regex);
      expect('Test').toMatch(regex);
    });

    it('should create regex for fuzzy match', () => {
      const regex = createSearchRegex('abc', { fuzzy: true });
      expect('aXbXc').toMatch(regex);
      expect('abc').toMatch(regex);
      expect('aaaaabbbbbccccc').toMatch(regex);
    });

    it('should create regex for prefix match by default', () => {
      const regex = createSearchRegex('test');
      expect('testing').toMatch(regex);
      expect('pretest').not.toMatch(regex);
      expect('Test').toMatch(regex);
    });

    it('should escape special regex characters', () => {
      const regex = createSearchRegex('test.com', { partial: true });
      expect('test.com').toMatch(regex);
      expect('testXcom').not.toMatch(regex);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between strings', () => {
      expect(calculateSimilarity('test', 'test')).toBe(1);
      expect(calculateSimilarity('test', 'text')).toBeCloseTo(0.75, 2);
      expect(calculateSimilarity('abc', 'xyz')).toBe(0);
      expect(calculateSimilarity('', '')).toBe(1);
    });

    it('should handle different length strings', () => {
      expect(calculateSimilarity('a', 'ab')).toBe(0.5);
      expect(calculateSimilarity('test', 't')).toBe(0.25);
    });

    it('should handle Japanese text', () => {
      expect(calculateSimilarity('田中', '田中')).toBe(1);
      expect(calculateSimilarity('田中', '田村')).toBe(0.5);
      expect(calculateSimilarity('あいう', 'あいえ')).toBeCloseTo(0.67, 2);
    });
  });

  describe('calculateSearchScore', () => {
    it('should calculate score for exact match', () => {
      const score = calculateSearchScore({
        query: 'test',
        targetText: 'test user',
        targetName: 'test',
      });
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('should calculate score for prefix match', () => {
      const score = calculateSearchScore({
        query: 'tes',
        targetText: 'test user',
        targetName: 'testing',
      });
      expect(score).toBeGreaterThanOrEqual(30);
      expect(score).toBeLessThan(40);
    });

    it('should calculate score for partial match', () => {
      const score = calculateSearchScore({
        query: 'est',
        targetText: 'test user',
        targetName: 'testing',
      });
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThan(30);
    });

    it('should include popularity bonus', () => {
      const scoreWithoutPopularity = calculateSearchScore({
        query: 'test',
        targetText: 'test',
        popularity: 0,
      });

      const scoreWithPopularity = calculateSearchScore({
        query: 'test',
        targetText: 'test',
        popularity: 50,
      });

      expect(scoreWithPopularity).toBeGreaterThan(scoreWithoutPopularity);
    });

    it('should include following bonus', () => {
      const scoreWithoutFollowing = calculateSearchScore({
        query: 'test',
        targetText: 'test',
        isFollowing: false,
      });

      const scoreWithFollowing = calculateSearchScore({
        query: 'test',
        targetText: 'test',
        isFollowing: true,
      });

      expect(scoreWithFollowing).toBe(scoreWithoutFollowing + 10);
    });

    it('should cap score at 100', () => {
      const score = calculateSearchScore({
        query: 'test',
        targetText: 'test',
        targetName: 'test',
        popularity: 1000,
        activity: 1000,
        isFollowing: true,
      });
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('sortBySearchScore', () => {
    const results = [
      { score: 10, name: 'low' },
      { score: 50, name: 'medium' },
      { score: 90, name: 'high' },
    ];

    it('should sort by score in descending order by default', () => {
      const sorted = sortBySearchScore([...results]);
      expect(sorted[0].name).toBe('high');
      expect(sorted[1].name).toBe('medium');
      expect(sorted[2].name).toBe('low');
    });

    it('should sort by score in ascending order', () => {
      const sorted = sortBySearchScore([...results], 'asc');
      expect(sorted[0].name).toBe('low');
      expect(sorted[1].name).toBe('medium');
      expect(sorted[2].name).toBe('high');
    });

    it('should handle empty array', () => {
      const sorted = sortBySearchScore([]);
      expect(sorted).toEqual([]);
    });
  });
});