import localforage from "localforage";

const KEY = "studentFormDraft";

export const saveStudentDraft = async (data) => {
  await localforage.setItem(KEY, data);
};

export const loadStudentDraft = async () => {
  return (await localforage.getItem(KEY)) || {};
};

export const clearStudentDraft = async () => {
  await localforage.removeItem(KEY);
};
