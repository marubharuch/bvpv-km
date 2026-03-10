// components/LineageView.jsx
// Orchestrator for the Lineage tab.
// Uses buildLineageRows from the new treeGraph.js logic.
// Enriches rows with spouse names before passing to LineageTable.

import { useState, useMemo } from 'react';
import { buildLineageRows }  from '../../../utils/treeGraph';
import LineageTable           from './LineageTable';
import EditAddSheet           from './EditAddSheet';

export default function LineageView({ members = {}, selfId, onEditMember, onAddMember }) {

  const { rows, spanMap, colGens, minGen, maxGen } = useMemo(
    () => buildLineageRows(members, selfId),
    [members, selfId]
  );

  // Enrich every member in chainMap with _spouse (name+gender) for Cell rendering
  const enrichedRows = useMemo(() => rows.map(row => {
    const enrichedChain = {};
    Object.entries(row.chainMap).forEach(([g, m]) => {
      const spouse = m.spouseId && members[m.spouseId]
        ? { name: members[m.spouseId].name, gender: members[m.spouseId].gender }
        : null;
      enrichedChain[g] = { ...m, _spouse: spouse };
    });
    return { ...row, chainMap: enrichedChain, _members: members };
  }), [rows, members]);

  const [sheetNode, setSheetNode] = useState(null);

  const handleCellClick = node => {
    if (!onEditMember && !onAddMember) return;
    setSheetNode(node);
  };

  const handleEdit = (node, data) => {
    if (!onEditMember) return;
    if (node.id) onEditMember(node.id, data);
    setSheetNode(null);
  };

  const handleAdd = (node, addType, data) => {
    if (!onAddMember) return;
    onAddMember({
      ...data,
      fatherId: addType === 'child' && node?.gender === 'M' ? node.id : null,
      motherId: addType === 'child' && node?.gender === 'F' ? node.id : null,
    });
    setSheetNode(null);
  };

  const ancestorList = useMemo(() => {
    if (!selfId || !members[selfId]) return [];
    const chain = [];
    let curId = members[selfId].ancestorId || members[selfId].fatherId;
    const seen = new Set();
    while (curId && members[curId] && !seen.has(curId)) {
      seen.add(curId);
      chain.push({ name: members[curId].name, gender: members[curId].gender });
      curId = members[curId].ancestorId || members[curId].fatherId;
    }
    return chain;
  }, [members, selfId]);

  return (
    <>
      <LineageTable
        rows={enrichedRows}
        spanMap={spanMap}
        colGens={colGens}
        minGen={minGen}
        maxGen={maxGen}
        onCellClick={(onEditMember || onAddMember) ? handleCellClick : null}
      />

      {sheetNode && (
        <EditAddSheet
          node={sheetNode}
          treeData={{ ancestors: ancestorList, descendants: [], self: members[selfId] || {} }}
          onEdit={handleEdit}
          onAdd={handleAdd}
          onClose={() => setSheetNode(null)}
        />
      )}
    </>
  );
}
