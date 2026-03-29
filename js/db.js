// IndexedDB数据库操作
const DB_NAME = 'releaseAppDB';
const DB_VERSION = 1;
let db = null;

// 打开数据库
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject('数据库打开失败');
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 创建用户表
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }
      
      // 创建打卡记录表
      if (!db.objectStoreNames.contains('checks')) {
        const checksStore = db.createObjectStore('checks', { keyPath: 'id', autoIncrement: true });
        checksStore.createIndex('user_column_index', ['username', 'column', 'index'], { unique: true });
        checksStore.createIndex('username_index', 'username');
      }
    };
  });
}

// 初始化数据库
async function initDB() {
  if (!db) {
    await openDB();
  }
  return db;
}

// 保存用户数据
async function saveUser(username, password) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.put({ username, password });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject('保存用户失败');
  });
}

// 获取用户数据
async function getUser(username) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(username);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('获取用户失败');
  });
}

// 保存打卡记录
async function saveCheck(username, column, index, checked) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['checks'], 'readwrite');
    const store = transaction.objectStore('checks');
    const indexValue = store.index('user_column_index');
    
    // 先查找是否已存在记录
    const getRequest = indexValue.get([username, column, index]);
    
    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result;
      if (existingRecord) {
        // 更新现有记录
        existingRecord.checked = checked;
        const putRequest = store.put(existingRecord);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject('更新打卡记录失败');
      } else {
        // 创建新记录
        const putRequest = store.put({ username, column, index, checked, timestamp: new Date().toISOString() });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject('保存打卡记录失败');
      }
    };
    
    getRequest.onerror = () => reject('查找打卡记录失败');
  });
}

// 获取用户的所有打卡记录
async function getChecks(username) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['checks'], 'readonly');
    const store = transaction.objectStore('checks');
    const index = store.index('username_index');
    const request = index.getAll(username);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('获取打卡记录失败');
  });
}

// 删除用户的所有打卡记录
async function deleteUserChecks(username) {
  await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['checks'], 'readwrite');
    const store = transaction.objectStore('checks');
    const index = store.index('username_index');
    const request = index.openCursor(username);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject('删除打卡记录失败');
  });
}

// 导出IndexedDB数据到localStorage（备份）
async function exportToLocalStorage() {
  try {
    const checks = await getChecks(getCurrentUser());
    localStorage.setItem('backup_checks', JSON.stringify(checks));
    return true;
  } catch (error) {
    console.error('导出数据失败:', error);
    return false;
  }
}

// 从localStorage导入数据到IndexedDB（恢复）
async function importFromLocalStorage() {
  try {
    const backup = localStorage.getItem('backup_checks');
    if (backup) {
      const checks = JSON.parse(backup);
      for (const check of checks) {
        await saveCheck(check.username, check.column, check.index, check.checked);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}