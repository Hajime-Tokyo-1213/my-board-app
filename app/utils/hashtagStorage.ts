/**
 * ハッシュタグの永続化ストレージ管理
 * IndexedDBを使用してクライアントサイドでハッシュタグ使用頻度を記録
 */

interface HashtagRecord {
  tag: string;
  count: number;
  lastUsed: number;
  posts: string[];
}

class HashtagStorage {
  private dbName = 'hashtagDB';
  private storeName = 'hashtags';
  private db: IDBDatabase | null = null;

  /**
   * IndexedDBを初期化
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'tag' });
          store.createIndex('count', 'count', { unique: false });
          store.createIndex('lastUsed', 'lastUsed', { unique: false });
        }
      };
    });
  }

  /**
   * ハッシュタグを記録
   */
  async recordHashtag(tag: string, postId?: string): Promise<void> {
    if (!this.db) await this.init();
    
    const normalizedTag = tag.normalize('NFC').toLowerCase();
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(normalizedTag);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result as HashtagRecord | undefined;
        
        const record: HashtagRecord = existing ? {
          ...existing,
          count: existing.count + 1,
          lastUsed: Date.now(),
          posts: postId && !existing.posts.includes(postId) 
            ? [...existing.posts, postId]
            : existing.posts
        } : {
          tag: normalizedTag,
          count: 1,
          lastUsed: Date.now(),
          posts: postId ? [postId] : []
        };
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 複数のハッシュタグを記録
   */
  async recordHashtags(tags: string[], postId?: string): Promise<void> {
    for (const tag of tags) {
      await this.recordHashtag(tag, postId);
    }
  }

  /**
   * 人気のハッシュタグを取得
   */
  async getPopularHashtags(limit: number = 10): Promise<HashtagRecord[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('count');
    
    return new Promise((resolve, reject) => {
      const results: HashtagRecord[] = [];
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 最近使用されたハッシュタグを取得
   */
  async getRecentHashtags(limit: number = 10): Promise<HashtagRecord[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('lastUsed');
    
    return new Promise((resolve, reject) => {
      const results: HashtagRecord[] = [];
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * ハッシュタグを検索（前方一致）
   */
  async searchHashtags(query: string, limit: number = 5): Promise<HashtagRecord[]> {
    if (!this.db) await this.init();
    
    const normalizedQuery = query.normalize('NFC').toLowerCase();
    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const results: HashtagRecord[] = [];
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const record = cursor.value as HashtagRecord;
          if (record.tag.startsWith(normalizedQuery) && results.length < limit) {
            results.push(record);
          }
          cursor.continue();
        } else {
          // countで降順ソート
          results.sort((a, b) => b.count - a.count);
          resolve(results.slice(0, limit));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * すべてのハッシュタグをクリア
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// シングルトンインスタンス
let storageInstance: HashtagStorage | null = null;

export function getHashtagStorage(): HashtagStorage {
  if (!storageInstance) {
    storageInstance = new HashtagStorage();
  }
  return storageInstance;
}

/**
 * サーバーサイドでのハッシュタグ統計更新
 */
export async function updateHashtagStats(
  hashtags: string[],
  postId: string
): Promise<void> {
  try {
    await fetch('/api/hashtags/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hashtags, postId }),
    });
  } catch (error) {
    console.error('Failed to update hashtag stats:', error);
  }
}