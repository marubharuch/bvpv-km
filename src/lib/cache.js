// lib/cache.js — localForage wrapper with typed helpers.
import localForage from "localforage";

localForage.config({ name: "OswalApp", storeName: "app_cache" });

export const cache = {
  get:    (key)        => localForage.getItem(key),
  set:    (key, val)   => localForage.setItem(key, val),
  remove: (key)        => localForage.removeItem(key),
  clear:  ()           => localForage.clear(),
};
