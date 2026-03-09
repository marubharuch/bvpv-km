// db/vanshTreeDb.js — Firestore read/write for vansh tree.
// Stores the entire tree as a single document: vanshTrees/{uid}

import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore }           from "../lib/firebase";

const treeRef = (uid) => doc(firestore, "vanshTrees", uid);

/**
 * Save full tree as a single Firestore document.
 * Called on Step 8 "Tree સાચવો".
 */
export async function saveVanshTree(uid, familyId, treeState) {
  if (!uid) throw new Error("uid required");

  const data = {
    self:        treeState.self        || {},
    ancestors:   treeState.ancestors   || [],
    descendants: treeState.descendants || [],
    spouses:     treeState.spouses     || {},
    siblings:    treeState.siblings    || {},
    cousins:     treeState.cousins     || [],
    familyId:    familyId              || null,
    updatedAt:   Date.now(),
  };

  await setDoc(treeRef(uid), data);
  return data;
}

/**
 * Load existing tree document.
 * Returns null if not saved yet.
 */
export async function getVanshTree(uid) {
  if (!uid) return null;
  const snap = await getDoc(treeRef(uid));
  return snap.exists() ? snap.data() : null;
}
