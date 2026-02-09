import localforage from "localforage";

export const saveCache = async (key, data) => {
  await localforage.setItem(key, data);
};

export const loadCache = async (key) => {
  return await localforage.getItem(key);
};
