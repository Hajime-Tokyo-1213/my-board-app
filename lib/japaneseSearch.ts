/**
 * 日本語検索用ユーティリティ関数
 * ひらがな・カタカナ変換、正規化処理を提供
 */

/**
 * ひらがなをカタカナに変換
 */
export function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * カタカナをひらがなに変換
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 全角英数字を半角に変換
 */
export function toHalfWidth(str: string): string {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
}

/**
 * 半角カタカナを全角カタカナに変換
 */
export function halfKatakanaToFullKatakana(str: string): string {
  let result = str;
  
  // 濁点・半濁点の処理を先に行う
  result = result.replace(/ｶﾞ/g, 'ガ').replace(/ｷﾞ/g, 'ギ').replace(/ｸﾞ/g, 'グ')
    .replace(/ｹﾞ/g, 'ゲ').replace(/ｺﾞ/g, 'ゴ')
    .replace(/ｻﾞ/g, 'ザ').replace(/ｼﾞ/g, 'ジ').replace(/ｽﾞ/g, 'ズ')
    .replace(/ｾﾞ/g, 'ゼ').replace(/ｿﾞ/g, 'ゾ')
    .replace(/ﾀﾞ/g, 'ダ').replace(/ﾁﾞ/g, 'ヂ').replace(/ﾂﾞ/g, 'ヅ')
    .replace(/ﾃﾞ/g, 'デ').replace(/ﾄﾞ/g, 'ド')
    .replace(/ﾊﾞ/g, 'バ').replace(/ﾋﾞ/g, 'ビ').replace(/ﾌﾞ/g, 'ブ')
    .replace(/ﾍﾞ/g, 'ベ').replace(/ﾎﾞ/g, 'ボ')
    .replace(/ﾊﾟ/g, 'パ').replace(/ﾋﾟ/g, 'ピ').replace(/ﾌﾟ/g, 'プ')
    .replace(/ﾍﾟ/g, 'ペ').replace(/ﾎﾟ/g, 'ポ');
  
  // 通常の半角カタカナ変換
  const halfKatakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯ';
  const fullKatakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッ';
  
  for (let i = 0; i < halfKatakana.length; i++) {
    const regex = new RegExp(halfKatakana[i], 'g');
    result = result.replace(regex, fullKatakana[i]);
  }
  
  return result;
}

/**
 * 検索用にテキストを正規化
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';
  
  let normalized = text;
  
  // 1. 全角英数字を半角に変換
  normalized = toHalfWidth(normalized);
  
  // 2. 半角カタカナを全角に変換
  normalized = halfKatakanaToFullKatakana(normalized);
  
  // 3. 大文字を小文字に変換
  normalized = normalized.toLowerCase();
  
  // 4. 余分な空白を削除
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * 検索クエリを複数のバリエーションに展開
 */
export function expandSearchQuery(query: string): string[] {
  const normalized = normalizeForSearch(query);
  const variations = new Set<string>();
  
  // 元のクエリ（正規化済み）
  variations.add(normalized);
  
  // ひらがなバージョン
  const hiragana = katakanaToHiragana(normalized);
  variations.add(hiragana);
  
  // カタカナバージョン
  const katakana = hiraganaToKatakana(normalized);
  variations.add(katakana);
  
  // スペース区切りの各単語
  const words = normalized.split(' ');
  words.forEach(word => {
    if (word) {
      variations.add(word);
      variations.add(katakanaToHiragana(word));
      variations.add(hiraganaToKatakana(word));
    }
  });
  
  return Array.from(variations);
}

/**
 * 部分一致検索用の正規表現を生成
 */
export function createSearchRegex(query: string, options: {
  partial?: boolean;
  fuzzy?: boolean;
} = {}): RegExp {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  if (options.fuzzy) {
    // あいまい検索: 文字間に任意の文字を許可
    const fuzzyPattern = escaped.split('').join('.*?');
    return new RegExp(fuzzyPattern, 'i');
  }
  
  if (options.partial) {
    // 部分一致
    return new RegExp(escaped, 'i');
  }
  
  // 前方一致（デフォルト）
  return new RegExp(`^${escaped}`, 'i');
}

/**
 * 2つの文字列の類似度を計算（レーベンシュタイン距離）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // 初期化
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 距離を計算
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 置換
          matrix[i][j - 1] + 1,      // 挿入
          matrix[i - 1][j] + 1       // 削除
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * 検索スコアを計算
 */
export interface SearchScoreOptions {
  query: string;
  targetText: string;
  targetName?: string;
  popularity?: number;
  activity?: number;
  isFollowing?: boolean;
}

export function calculateSearchScore(options: SearchScoreOptions): number {
  const {
    query,
    targetText,
    targetName = '',
    popularity = 0,
    activity = 0,
    isFollowing = false,
  } = options;

  let score = 0;
  const normalizedQuery = normalizeForSearch(query);
  const normalizedText = normalizeForSearch(targetText);
  const normalizedName = normalizeForSearch(targetName);

  // 1. 完全一致 (40点)
  if (normalizedName === normalizedQuery || normalizedText === normalizedQuery) {
    score += 40;
  }
  // 2. 前方一致 (30点)
  else if (normalizedName.startsWith(normalizedQuery) || normalizedText.startsWith(normalizedQuery)) {
    score += 30;
  }
  // 3. 部分一致 (20点)
  else if (normalizedName.includes(normalizedQuery) || normalizedText.includes(normalizedQuery)) {
    score += 20;
  }
  // 4. あいまい一致 (10点)
  else {
    const similarity = Math.max(
      calculateSimilarity(normalizedQuery, normalizedName),
      calculateSimilarity(normalizedQuery, normalizedText)
    );
    score += similarity * 10;
  }

  // 5. 人気度ボーナス (最大20点)
  score += Math.min(popularity * 0.2, 20);

  // 6. アクティビティボーナス (最大10点)
  score += Math.min(activity * 0.1, 10);

  // 7. フォロー中ボーナス (10点)
  if (isFollowing) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * 検索結果をスコアでソート
 */
export function sortBySearchScore<T extends { score: number }>(
  results: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return results.sort((a, b) => {
    return order === 'desc' ? b.score - a.score : a.score - b.score;
  });
}