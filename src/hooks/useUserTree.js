// hooks/useUserTree.js
// Checks if a logged-in creator has any trees.
// Used at app entry point to decide what to show.
//
// Returns:
//   loading    — still checking
//   hasTree    — at least one tree exists
//   trees      — { treeId: { role, treeName, createdAt } }
//   firstTreeId — treeId of first/only tree (auto-load shortcut)
//   treeList   — sorted array [{ treeId, role, treeName, createdAt }]

import { useState, useEffect } from "react";
import { getTreesByUid }       from "../db/treeDb";

export function useUserTree(uid) {
  const [trees,   setTrees]   = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getTreesByUid(uid)
      .then(data => {
        setTrees(data || {});
        setLoading(false);
      })
      .catch(e => {
        console.error("useUserTree:", e);
        setError(e.message);
        setLoading(false);
      });
  }, [uid]);

  const treeIds    = Object.keys(trees);
  const hasTree    = treeIds.length > 0;
  const firstTreeId = hasTree ? treeIds[0] : null;

  // Sorted list — newest first
  const treeList = treeIds
    .map(treeId => ({ treeId, ...trees[treeId] }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return {
    trees,
    treeList,
    treeIds,
    hasTree,
    firstTreeId,
    loading,
    error,
  };
}