// src/services/indexedDB.js

class IndexedDBService {
  constructor() {
    this.dbName = 'HealthReminderDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }

        if (!db.objectStoreNames.contains('reminders')) {
          const reminderStore = db.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
          reminderStore.createIndex('userId', 'userId', { unique: false });
          reminderStore.createIndex('date', 'date', { unique: false });
          reminderStore.createIndex('completed', 'completed', { unique: false });
        }

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'key' });
        }

        console.log('✅ Database setup complete');
      };
    });
  }

  // ============= USER METHODS =============

  async registerUser(username, email, password) {
    try {
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');

      // Check if user exists
      const usernameIndex = store.index('username');
      const existingUser = await this.getByIndex(usernameIndex, username);
      
      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      // Hash password (simple base64 encoding - in production use proper hashing)
      const hashedPassword = btoa(password);

      const user = {
        username,
        email,
        password: hashedPassword,
        settings: {
          theme: 'ocean',
          fontSize: 'medium',
          highContrast: false,
          notificationSound: 'default',
          notificationVolume: 50,
          emailNotifications: false,
          smsNotifications: false,
          waterReminderEnabled: false,
          waterReminderInterval: 60
        },
        stats: {
          points: 0,
          level: 1,
          streak: 0,
          totalCompleted: 0,
          waterIntake: 0,
          waterGoal: 8
        },
        achievements: [],
        savedFilters: [],
        createdAt: new Date().toISOString()
      };

      const request = store.add(user);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = async () => {
          const userId = request.result;
          await this.setCurrentUser(userId);
          resolve({ success: true, userId });
        };
        request.onerror = () => reject({ success: false, error: request.error });
      });
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  }

  async loginUser(username, password) {
    try {
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const usernameIndex = store.index('username');
      
      const user = await this.getByIndex(usernameIndex, username);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify password
      const hashedPassword = btoa(password);
      if (user.password !== hashedPassword) {
        return { success: false, error: 'Invalid password' };
      }

      await this.setCurrentUser(user.id);
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async logoutUser() {
    try {
      await this.clearSession();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUserId() {
    const transaction = this.db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const request = store.get('currentUser');

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result?.userId || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async setCurrentUser(userId) {
    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key: 'currentUser', userId });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSession() {
    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    return new Promise((resolve) => {
      const request = store.delete('currentUser');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async getUserData(userId) {
    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(userId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  // ============= REMINDER METHODS =============

  async getAllReminders() {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const transaction = this.db.transaction(['reminders'], 'readonly');
    const store = transaction.objectStore('reminders');
    const index = store.index('userId');
    const request = index.getAll(userId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async createReminder(reminderData) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not logged in' };
    }

    const transaction = this.db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');

    const reminder = {
      ...reminderData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const request = store.add(reminder);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve({ success: true, id: request.result });
      };
      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async updateReminder(id, updateData) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not logged in' };
    }

    const transaction = this.db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const reminder = request.result;
        
        if (!reminder || reminder.userId !== userId) {
          resolve({ success: false, error: 'Reminder not found' });
          return;
        }

        const updatedReminder = {
          ...reminder,
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        const updateRequest = store.put(updatedReminder);
        
        updateRequest.onsuccess = () => {
          resolve({ success: true });
        };
        updateRequest.onerror = () => {
          reject({ success: false, error: updateRequest.error });
        };
      };
      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async deleteReminder(id) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not logged in' };
    }

    const transaction = this.db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    
    // Verify ownership first
    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const reminder = getRequest.result;
        
        if (!reminder || reminder.userId !== userId) {
          resolve({ success: false, error: 'Reminder not found' });
          return;
        }

        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve({ success: true });
        };
        deleteRequest.onerror = () => {
          reject({ success: false, error: deleteRequest.error });
        };
      };
      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async deleteAllReminders() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not logged in' };
    }

    const reminders = await this.getAllReminders();
    const transaction = this.db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');

    const deletePromises = reminders.map(reminder => {
      return new Promise((resolve) => {
        const request = store.delete(reminder.id);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    await Promise.all(deletePromises);
    return { success: true, deleted: reminders.length };
  }

  // ============= USER STATS METHODS =============

  async updateSettings(settings) {
    const userId = await this.getCurrentUserId();
    if (!userId) return { success: false };

    const userData = await this.getUserData(userId);
    userData.settings = { ...userData.settings, ...settings };
    
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(userData);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false });
    });
  }

  async updateStats(stats) {
    const userId = await this.getCurrentUserId();
    if (!userId) return { success: false };

    const userData = await this.getUserData(userId);
    userData.stats = { ...userData.stats, ...stats };
    
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(userData);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false });
    });
  }

  async addAchievement(achievement) {
    const userId = await this.getCurrentUserId();
    if (!userId) return { success: false };

    const userData = await this.getUserData(userId);
    
    // Check if achievement already exists
    const exists = userData.achievements.some(a => a.id === achievement.id);
    if (exists) {
      return { success: false, error: 'Achievement already unlocked' };
    }

    userData.achievements.push(achievement);
    
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(userData);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false });
    });
  }

  async saveFilter(filter) {
    const userId = await this.getCurrentUserId();
    if (!userId) return { success: false };

    const userData = await this.getUserData(userId);
    userData.savedFilters.push(filter);
    
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put(userData);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false });
    });
  }

  // ============= ANALYTICS =============

  async getAnalytics() {
    const reminders = await this.getAllReminders();
    const userId = await this.getCurrentUserId();
    const userData = await this.getUserData(userId);

    return {
      totalReminders: reminders.length,
      completedReminders: reminders.filter(r => r.completed).length,
      pendingReminders: reminders.filter(r => !r.completed).length,
      byType: {
        medicine: reminders.filter(r => r.type === 'medicine').length,
        task: reminders.filter(r => r.type === 'task').length,
        exercise: reminders.filter(r => r.type === 'exercise').length
      },
      byPriority: {
        high: reminders.filter(r => r.priority === 'high').length,
        medium: reminders.filter(r => r.priority === 'medium').length,
        low: reminders.filter(r => r.priority === 'low').length
      },
      completionRate: reminders.length > 0 
        ? ((reminders.filter(r => r.completed).length / reminders.length) * 100).toFixed(1)
        : 0,
      stats: userData?.stats || {},
      achievements: userData?.achievements || []
    };
  }

  // ============= HELPER METHODS =============

  getByIndex(index, value) {
    const request = index.get(value);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
}

// Create singleton instance
const dbService = new IndexedDBService();

export default dbService;