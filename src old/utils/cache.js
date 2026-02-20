import localForage from 'localforage';

// Configure once
localForage.config({
  name: 'YourAppName',
  storeName: 'auth_data',
  description: 'User authentication and profile cache'
});

export const saveCache = async (key, data) => {
  try {
    if (data === null) {
      await localForage.removeItem(key);
    } else {
      await localForage.setItem(key, data);
    }
  } catch (error) {
    console.error(`Error saving to cache [${key}]:`, error);
  }
};

export const loadCache = async (key) => {
  try {
    return await localForage.getItem(key);
  } catch (error) {
    console.error(`Error loading from cache [${key}]:`, error);
    return null;
  }
};

export const clearCache = async () => {
  try {
    await localForage.clear();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};