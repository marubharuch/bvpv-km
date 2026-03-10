// utils/editHandlers.js
// Translates EditAddSheet's generic onEdit(node, data, spouseData)
// and onAdd(node, type, data, sibType) into the correct useTreeData hook calls.
//
// node shape (built by LineageTable):
// {
//   nodeType:  "self" | "anc" | "desc" | "sib",
//   name, gender, year, rip, spouse,
//   ancIdx:    number   (if nodeType="anc")
//   descIdx:   number   (if nodeType="desc")
//   spouseKey: string   e.g. "self" | "anc_0" | "desc_0"
//   sibKey:    string   e.g. "self" | "anc_0" | "desc_0"
//   sibType:   "elder" | "younger"
//   sibIdx:    number
// }

export function makeEditHandler({
  editMemberSelf,
  editMemberAncestor,
  editMemberDescendant,
  editMemberSpouse,
  editMemberSibling,
  addMemberDescendant,
  addMemberAncestor,
  addMemberSibling,
  addMemberSpouse,
}) {

  // ── onEdit(node, data, spouseData) ──────────────────────────────────────────
  const onEdit = (node, data, spouseData) => {
    const { nodeType, ancIdx, descIdx, sibKey, sibType, sibIdx, spouseKey } = node;

    if      (nodeType === "self") editMemberSelf(data);
    else if (nodeType === "anc")  editMemberAncestor(ancIdx, data);
    else if (nodeType === "desc") editMemberDescendant(descIdx, data);
    else if (nodeType === "sib")  editMemberSibling(sibKey, sibType, sibIdx, data);

    if (spouseKey) {
      editMemberSpouse(spouseKey, spouseData || {});
    }
  };

  // ── onAdd(node, addType, data, sibType) ─────────────────────────────────────
  const onAdd = (node, addType, data, sibType = "younger") => {
    const { nodeType, ancIdx, descIdx, spouseKey } = node;

    if (addType === "child") {
      addMemberDescendant(data);
    }
    else if (addType === "ancestor") {
      addMemberAncestor(data);
    }
    else if (addType === "spouse") {
      if (spouseKey) addMemberSpouse(spouseKey, data);
    }
    else if (addType === "sibling") {
      let sibKey;
      if      (nodeType === "self") sibKey = "self";
      else if (nodeType === "anc")  sibKey = "anc_"  + ancIdx;
      else if (nodeType === "desc") sibKey = "desc_" + descIdx;
      else                          sibKey = "self";

      addMemberSibling(sibKey, sibType, data);
    }
  };

  return { onEdit, onAdd };
}   