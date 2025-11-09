// Local IndexedDB storage for settings
interface LocalSettings {
  id: string;
  user_id: string;
  api_key: string;
  base_url: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface LocalMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: string; // JSON stringified FileAttachment[]
  created_at: string;
}

class LocalDatabase {
  private dbName = 'GrokChatDB';
  private version = 2;
  private storeName = 'settings';
  private messagesStoreName = 'messages';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create settings store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: true });
          console.log('Created IndexedDB store:', this.storeName);
        }

        // Create messages store if it doesn't exist
        if (!db.objectStoreNames.contains(this.messagesStoreName)) {
          const messagesStore = db.createObjectStore(this.messagesStoreName, { keyPath: 'id' });
          messagesStore.createIndex('user_id', 'user_id', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('user_timestamp', ['user_id', 'timestamp'], { unique: false });
          console.log('Created IndexedDB store:', this.messagesStoreName);
        }
      };
    });
  }

  // Messages methods
  async saveMessage(userId: string, message: { role: 'user' | 'assistant'; content: string; timestamp: number; attachments?: any[] }): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.messagesStoreName], 'readwrite');
      const store = transaction.objectStore(this.messagesStoreName);

      const messageData: LocalMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        attachments: message.attachments ? JSON.stringify(message.attachments) : undefined,
        created_at: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const request = store.add(messageData);
        
        request.onsuccess = () => {
          console.log('Message saved to IndexedDB:', message.role, message.content.substring(0, 50) + '...');
          resolve();
        };
        
        request.onerror = () => {
          console.error('Failed to save message to IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error saving message to IndexedDB:', error);
      throw error;
    }
  }

  async loadMessages(userId: string, limit?: number): Promise<LocalMessage[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.messagesStoreName], 'readonly');
      const store = transaction.objectStore(this.messagesStoreName);
      const index = store.index('user_timestamp');

      return new Promise((resolve, reject) => {
        const messages: LocalMessage[] = [];
        const range = IDBKeyRange.bound([userId, 0], [userId, Date.now()]);
        const request = index.openCursor(range, 'next');
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            messages.push(cursor.value);
            if (!limit || messages.length < limit) {
              cursor.continue();
            } else {
              resolve(messages);
            }
          } else {
            console.log(`Loaded ${messages.length} messages from IndexedDB for user:`, userId);
            resolve(messages);
          }
        };
        
        request.onerror = () => {
          console.error('Failed to load messages from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error loading messages from IndexedDB:', error);
      throw error;
    }
  }

  async deleteMessages(userId: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.messagesStoreName], 'readwrite');
      const store = transaction.objectStore(this.messagesStoreName);
      const index = store.index('user_id');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(userId));
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            console.log('Messages deleted from IndexedDB for user:', userId);
            resolve();
          }
        };
        
        request.onerror = () => {
          console.error('Failed to delete messages from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error deleting messages from IndexedDB:', error);
      throw error;
    }
  }

  async getMessageCount(userId: string): Promise<number> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.messagesStoreName], 'readonly');
      const store = transaction.objectStore(this.messagesStoreName);
      const index = store.index('user_id');

      return new Promise((resolve, reject) => {
        const request = index.count(IDBKeyRange.only(userId));
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Failed to count messages in IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error counting messages in IndexedDB:', error);
      throw error;
    }
  }

  async saveSettings(userId: string, settings: { api_key: string; base_url: string; model: string }): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const now = new Date().toISOString();
      const settingsData: LocalSettings = {
        id: crypto.randomUUID(),
        user_id: userId,
        api_key: settings.api_key,
        base_url: settings.base_url,
        model: settings.model,
        created_at: now,
        updated_at: now,
      };

      // Check if settings already exist for this user
      const existingRequest = store.index('user_id').get(userId);
      
      return new Promise((resolve, reject) => {
        existingRequest.onsuccess = () => {
          const existing = existingRequest.result;
          
          if (existing) {
            // Update existing settings
            settingsData.id = existing.id;
            settingsData.created_at = existing.created_at;
            settingsData.updated_at = now;
          }

          const saveRequest = store.put(settingsData);
          
          saveRequest.onsuccess = () => {
            console.log('Settings saved to IndexedDB for user:', userId);
            resolve();
          };
          
          saveRequest.onerror = () => {
            console.error('Failed to save settings to IndexedDB:', saveRequest.error);
            reject(saveRequest.error);
          };
        };

        existingRequest.onerror = () => {
          console.error('Failed to check existing settings:', existingRequest.error);
          reject(existingRequest.error);
        };
      });
    } catch (error) {
      console.error('Error saving settings to IndexedDB:', error);
      throw error;
    }
  }

  async loadSettings(userId: string): Promise<LocalSettings | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('user_id');

      return new Promise((resolve, reject) => {
        const request = index.get(userId);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log('Settings loaded from IndexedDB for user:', userId);
          } else {
            console.log('No settings found in IndexedDB for user:', userId);
          }
          resolve(result || null);
        };
        
        request.onerror = () => {
          console.error('Failed to load settings from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error loading settings from IndexedDB:', error);
      throw error;
    }
  }

  async deleteSettings(userId: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('user_id');

      return new Promise((resolve, reject) => {
        const getRequest = index.get(userId);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result) {
            const deleteRequest = store.delete(result.id);
            
            deleteRequest.onsuccess = () => {
              console.log('Settings deleted from IndexedDB for user:', userId);
              resolve();
            };
            
            deleteRequest.onerror = () => {
              console.error('Failed to delete settings from IndexedDB:', deleteRequest.error);
              reject(deleteRequest.error);
            };
          } else {
            resolve(); // Nothing to delete
          }
        };
        
        getRequest.onerror = () => {
          console.error('Failed to find settings to delete:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('Error deleting settings from IndexedDB:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName, this.messagesStoreName], 'readwrite');
      const settingsStore = transaction.objectStore(this.storeName);
      const messagesStore = transaction.objectStore(this.messagesStoreName);

      return new Promise((resolve, reject) => {
        let completed = 0;
        const total = 2;
        
        const checkComplete = () => {
          completed++;
          if (completed === total) {
            console.log('All data cleared from IndexedDB');
            resolve();
          }
        };
        
        const settingsRequest = settingsStore.clear();
        const messagesRequest = messagesStore.clear();
        
        settingsRequest.onsuccess = () => {
          console.log('Settings cleared from IndexedDB');
          checkComplete();
        };
        
        messagesRequest.onsuccess = () => {
          console.log('Messages cleared from IndexedDB');
          checkComplete();
        };
        
        settingsRequest.onerror = () => {
          console.error('Failed to clear settings from IndexedDB:', settingsRequest.error);
          reject(settingsRequest.error);
        };
        
        messagesRequest.onerror = () => {
          console.error('Failed to clear messages from IndexedDB:', messagesRequest.error);
          reject(messagesRequest.error);
        };
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  // Check if IndexedDB is supported
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

export const localDb = new LocalDatabase();
export { LocalDatabase };
export type { LocalSettings, LocalMessage };