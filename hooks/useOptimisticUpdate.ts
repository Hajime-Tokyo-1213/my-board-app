'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// 楽観的更新の状態
interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  originalData?: T;
  optimisticData: T;
  confirmed: boolean;
  retryCount: number;
  maxRetries: number;
  retryTimeoutId?: NodeJS.Timeout;
}

// 楽観的更新マネージャー
class OptimisticUpdateManager<T> {
  private updates: Map<string, OptimisticUpdate<T>>;
  private rollbackHandlers: Map<string, (data: T) => void>;
  private confirmHandlers: Map<string, (data: T) => void>;

  constructor() {
    this.updates = new Map();
    this.rollbackHandlers = new Map();
    this.confirmHandlers = new Map();
  }

  // 更新を追加
  addUpdate(
    id: string,
    type: OptimisticUpdate<T>['type'],
    optimisticData: T,
    originalData?: T
  ): void {
    this.updates.set(id, {
      id,
      type,
      timestamp: Date.now(),
      originalData,
      optimisticData,
      confirmed: false,
      retryCount: 0,
      maxRetries: 3,
    });
  }

  // 更新を取得
  getUpdate(id: string): OptimisticUpdate<T> | undefined {
    return this.updates.get(id);
  }

  // 更新を確認
  confirmUpdate(id: string, confirmedData?: T): void {
    const update = this.updates.get(id);
    if (update) {
      update.confirmed = true;
      
      // 確認ハンドラーを実行
      const handler = this.confirmHandlers.get(update.type);
      if (handler && confirmedData) {
        handler(confirmedData);
      }
      
      // タイムアウトをクリア
      if (update.retryTimeoutId) {
        clearTimeout(update.retryTimeoutId);
      }
      
      // 一定時間後に削除
      setTimeout(() => {
        this.updates.delete(id);
      }, 5000);
    }
  }

  // 更新をロールバック
  rollbackUpdate(id: string): void {
    const update = this.updates.get(id);
    if (update) {
      // ロールバックハンドラーを実行
      const handler = this.rollbackHandlers.get(update.type);
      if (handler && update.originalData) {
        handler(update.originalData);
      }
      
      // タイムアウトをクリア
      if (update.retryTimeoutId) {
        clearTimeout(update.retryTimeoutId);
      }
      
      this.updates.delete(id);
    }
  }

  // リトライを設定
  setRetry(id: string, retryFn: () => Promise<void>): void {
    const update = this.updates.get(id);
    if (!update || update.retryCount >= update.maxRetries) {
      this.rollbackUpdate(id);
      return;
    }

    update.retryCount++;
    
    // 指数バックオフでリトライ
    const delay = Math.min(1000 * Math.pow(2, update.retryCount - 1), 10000);
    
    update.retryTimeoutId = setTimeout(async () => {
      try {
        await retryFn();
        this.confirmUpdate(id);
      } catch (error) {
        if (update.retryCount >= update.maxRetries) {
          this.rollbackUpdate(id);
        } else {
          this.setRetry(id, retryFn);
        }
      }
    }, delay);
  }

  // ハンドラーを設定
  setRollbackHandler(type: string, handler: (data: T) => void): void {
    this.rollbackHandlers.set(type, handler);
  }

  setConfirmHandler(type: string, handler: (data: T) => void): void {
    this.confirmHandlers.set(type, handler);
  }

  // 全更新をクリア
  clear(): void {
    this.updates.forEach(update => {
      if (update.retryTimeoutId) {
        clearTimeout(update.retryTimeoutId);
      }
    });
    this.updates.clear();
  }

  // ペンディング中の更新を取得
  getPendingUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values()).filter(u => !u.confirmed);
  }
}

// useOptimisticUpdate フックのオプション
interface UseOptimisticUpdateOptions<T> {
  onRollback?: (data: T, error?: Error) => void;
  onConfirm?: (data: T) => void;
  onError?: (error: Error) => void;
  retryOnError?: boolean;
  debounceMs?: number;
}

// useOptimisticUpdate フックの戻り値
interface UseOptimisticUpdateReturn<T> {
  data: T;
  setData: (data: T | ((prev: T) => T)) => void;
  isUpdating: boolean;
  pendingUpdates: number;
  optimisticUpdate: (
    updateFn: (current: T) => T,
    confirmFn: () => Promise<T>,
    options?: {
      updateId?: string;
      updateType?: 'create' | 'update' | 'delete';
      skipOptimistic?: boolean;
    }
  ) => Promise<void>;
  rollback: (updateId?: string) => void;
  reset: () => void;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: UseOptimisticUpdateOptions<T> = {}
): UseOptimisticUpdateReturn<T> {
  const [data, setDataState] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  
  const managerRef = useRef(new OptimisticUpdateManager<T>());
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  const {
    onRollback,
    onConfirm,
    onError,
    retryOnError = true,
    debounceMs = 0,
  } = options;

  // マネージャーのハンドラーを設定
  useEffect(() => {
    const manager = managerRef.current;
    
    // ロールバックハンドラー
    manager.setRollbackHandler('update', (originalData) => {
      setDataState(originalData);
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onRollback?.(originalData);
    });
    
    manager.setRollbackHandler('create', (originalData) => {
      setDataState(originalData);
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onRollback?.(originalData);
    });
    
    manager.setRollbackHandler('delete', (originalData) => {
      setDataState(originalData);
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onRollback?.(originalData);
    });
    
    // 確認ハンドラー
    manager.setConfirmHandler('update', (confirmedData) => {
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onConfirm?.(confirmedData);
    });
    
    manager.setConfirmHandler('create', (confirmedData) => {
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onConfirm?.(confirmedData);
    });
    
    manager.setConfirmHandler('delete', (confirmedData) => {
      setPendingUpdates(prev => Math.max(0, prev - 1));
      onConfirm?.(confirmedData);
    });
  }, [onRollback, onConfirm]);

  // データを設定
  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setDataState(newData);
  }, []);

  // 楽観的更新を実行
  const optimisticUpdate = useCallback(async (
    updateFn: (current: T) => T,
    confirmFn: () => Promise<T>,
    {
      updateId = Date.now().toString(),
      updateType = 'update',
      skipOptimistic = false,
    } = {}
  ) => {
    const manager = managerRef.current;
    
    // デバウンス処理
    if (debounceMs > 0) {
      return new Promise<void>((resolve, reject) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(async () => {
          try {
            await performUpdate();
            resolve();
          } catch (error) {
            reject(error);
          }
        }, debounceMs);
      });
    }
    
    return performUpdate();
    
    async function performUpdate() {
      setIsUpdating(true);
      setPendingUpdates(prev => prev + 1);
      
      const originalData = data;
      
      // 楽観的にデータを更新（スキップしない場合）
      if (!skipOptimistic) {
        const optimisticData = updateFn(data);
        setDataState(optimisticData);
        
        // 更新を記録
        manager.addUpdate(updateId, updateType, optimisticData, originalData);
      }
      
      try {
        // サーバーに更新を送信
        const confirmedData = await confirmFn();
        
        // 確認されたデータで更新
        setDataState(confirmedData);
        manager.confirmUpdate(updateId, confirmedData);
        
        setIsUpdating(false);
      } catch (error) {
        const err = error as Error;
        console.error('Optimistic update error:', err);
        
        // エラー時の処理
        if (!skipOptimistic) {
          if (retryOnError) {
            // リトライを設定
            manager.setRetry(updateId, confirmFn);
          } else {
            // 即座にロールバック
            manager.rollbackUpdate(updateId);
          }
        }
        
        onError?.(err);
        onRollback?.(originalData, err);
        setIsUpdating(false);
        
        throw error;
      }
    }
  }, [data, debounceMs, retryOnError, onError, onRollback]);

  // 特定の更新をロールバック
  const rollback = useCallback((updateId?: string) => {
    const manager = managerRef.current;
    
    if (updateId) {
      manager.rollbackUpdate(updateId);
    } else {
      // 全ての更新をロールバック
      const pendingUpdates = manager.getPendingUpdates();
      pendingUpdates.forEach(update => {
        manager.rollbackUpdate(update.id);
      });
    }
  }, []);

  // リセット
  const reset = useCallback(() => {
    managerRef.current.clear();
    setDataState(initialData);
    setIsUpdating(false);
    setPendingUpdates(0);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [initialData]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      managerRef.current.clear();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    data,
    setData,
    isUpdating,
    pendingUpdates,
    optimisticUpdate,
    rollback,
    reset,
  };
}

// 複数の楽観的更新を管理するフック
export function useOptimisticUpdates<T extends Record<string, any>>(
  initialData: T,
  options: UseOptimisticUpdateOptions<T> = {}
): UseOptimisticUpdateReturn<T> & {
  updateField: <K extends keyof T>(
    field: K,
    value: T[K],
    confirmFn: () => Promise<T[K]>
  ) => Promise<void>;
} {
  const optimisticUpdateReturn = useOptimisticUpdate(initialData, options);
  
  // 特定のフィールドを更新
  const updateField = useCallback(async <K extends keyof T>(
    field: K,
    value: T[K],
    confirmFn: () => Promise<T[K]>
  ) => {
    await optimisticUpdateReturn.optimisticUpdate(
      (current) => ({
        ...current,
        [field]: value,
      }),
      async () => {
        const confirmedValue = await confirmFn();
        return {
          ...optimisticUpdateReturn.data,
          [field]: confirmedValue,
        };
      },
      {
        updateId: `field-${String(field)}-${Date.now()}`,
        updateType: 'update',
      }
    );
  }, [optimisticUpdateReturn]);
  
  return {
    ...optimisticUpdateReturn,
    updateField,
  };
}

export default useOptimisticUpdate;