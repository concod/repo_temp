export const transformToTreeData = (
  tableData,
  childColumnName,
  uniqueRowId,
  startIndex = 0
) => {
  const treeData = [];
  let index = startIndex;

  const flatten = (rows, parentPath, isChildLevel, parentKey) => {
    rows.forEach((row, rowIdx) => {
      const children = row[childColumnName];
      const hasChildren = Array.isArray(children) && children.length > 0;
      const rowKey = row[uniqueRowId] || `parent_${rowIdx}`;
      const currentPath = isChildLevel
        ? [...parentPath, `${parentKey}_${rowIdx}`]
        : [rowKey];

      const flatRow = {
        ...row,
        index: index++,
        path: currentPath,
        _isParent: hasChildren,
        _isChild: isChildLevel,
      };
      treeData.push(flatRow);

      if (hasChildren) {
        flatten(children, currentPath, true, rowKey);
      }
    });
  };

  flatten(tableData, [], false, null);
  return treeData;
};

export const getTreeDataPath = (data) => data.path;

export const getRowStyleForGrandTotal = (params) => {
  if (params.node.rowPinned === "top") {
    return {
      backgroundColor: "#F4F1F9",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: "21px",
      color: "#0D152C",
    };
  }
  return {};
};
