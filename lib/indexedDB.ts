interface DBConfig {
  name: string;
  version: number;
  stores: {
    [key: string]: string;
  };
}

const dbConfig: DBConfig = {
  name: 'BoardAppDB',
  version: 1,
  stores: {
    drafts: 'id, content, title, createdAt, updatedAt',
    cachedPosts: 'id, data, timestamp',
    pendingPosts: 'id, content, images, createdAt',
    pendingActions: 'id, type, payload, timestamp'
  }
};

class IndexedDBHelper {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbConfig.name, dbConfig.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 各ストアを作成
        Object.entries(dbConfig.stores).forEach(([storeName, keyPath]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const [primaryKey, ...indexes] = keyPath.split(', ');
            const store = db.createObjectStore(storeName, {
              keyPath: primaryKey,
              autoIncrement: primaryKey === 'id'
            });

            // インデックスを作成
            indexes.forEach(index => {
              store.createIndex(index, index, { unique: false });
            });
          }
        });
      };
    });
  }

  // 下書き機能
  async saveDraft(draft: {
    content: string;
    title?: string;
    id?: string;
  }): Promise<string> {
    const db = await this.open();
    const transaction = db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');

    const draftData = {
      ...draft,
      id: draft.id || `draft_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(draftData);
      request.onsuccess = () => resolve(draftData.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getDrafts(): Promise<any[]> {
    const db = await this.open();
    const transaction = db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // オフライン投稿機能
  async queuePost(post: {
    content: string;
    images?: string[];
  }): Promise<string> {
    const db = await this.open();
    const transaction = db.transaction(['pendingPosts'], 'readwrite');
    const store = transaction.objectStore('pendingPosts');

    const postData = {
      ...post,
      id: `pending_${Date.now()}`,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(postData);
      request.onsuccess = () => resolve(postData.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingPosts(): Promise<any[]> {
    const db = await this.open();
    const transaction = db.transaction(['pendingPosts'], 'readonly');
    const store = transaction.objectStore('pendingPosts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingPost(id: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(['pendingPosts'], 'readwrite');
    const store = transaction.objectStore('pendingPosts');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // キャッシュ機能
  async cachePost(post: {
    id: string;
    data: any;
  }): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(['cachedPosts'], 'readwrite');
    const store = transaction.objectStore('cachedPosts');

    const cacheData = {
      ...post,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedPost(id: string): Promise<any | null> {
    const db = await this.open();
    const transaction = db.transaction(['cachedPosts'], 'readonly');
    const store = transaction.objectStore('cachedPosts');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // 24時間以上古いキャッシュは無効
          if (Date.now() - result.timestamp > 24 * 60 * 60 * 1000) {
            this.removeCachedPost(id);
            resolve(null);
          } else {
            resolve(result.data);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeCachedPost(id: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(['cachedPosts'], 'readwrite');
    const store = transaction.objectStore('cachedPosts');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // アクションキュー機能
  async queueAction(action: {
    type: string;
    payload: any;
  }): Promise<string> {
    const db = await this.open();
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const actionData = {
      ...action,
      id: `action_${Date.now()}`,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(actionData);
      request.onsuccess = () => resolve(actionData.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<any[]> {
    const db = await this.open();
    const transaction = db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // データベースクリア
  async clearAll(): Promise<void> {
    const db = await this.open();
    const storeNames = ['drafts', 'cachedPosts', 'pendingPosts', 'pendingActions'];

    await Promise.all(
      storeNames.map(storeName => {
        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }
}

// シングルトンインスタンス
const indexedDBHelper = new IndexedDBHelper();

export default indexedDBHelper;