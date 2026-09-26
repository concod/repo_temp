
export const getRowWrappers = (root, node) => {
  if (node.id != null) {
    return root.querySelectorAll(
      `[row-id="${node.id}"] .ag-selection-checkbox .ag-checkbox-input-wrapper`
    );
  }
  const rowIndex = node.rowIndex;
  if (rowIndex != null) {
    return root.querySelectorAll(
      `.ag-row[row-index="${rowIndex}"] .ag-selection-checkbox .ag-checkbox-input-wrapper`
    );
  }
  return [];
};

export const isChildSelectable = (childNode) =>
  childNode?.data &&
  !childNode.data._hideSelection &&
  !childNode.data.checkbox_disabled;


export const isSelectableChild = (childNode) =>
  isChildSelectable(childNode) || (childNode?.group && (!childNode.data || !childNode.data._hideSelection));

const forEachDescendant = (api, parentNode, callback) => {
  api.forEachNode((node) => {
    if (node === parentNode) return;
    let current = node.parent;
    let isDescendant = false;
    while (current && current.level >= 0) {
      if (current === parentNode) {
        isDescendant = true;
        break;
      }
      current = current.parent;
    }
    if (isDescendant) callback(node);
  });
};

export const syncParentChildSelection = (
  node,
  api,
  skipIds,
  scheduleIndeterminateRefresh,
  childSelectionCache,
  uniqueRowId,
  persistedSelectionRegistry
) => {
  if (skipIds.has(node)) {
    skipIds.delete(node);
    return;
  }

  const setSelectedSynced = (targetNode, value) => {
    if (targetNode && targetNode.isSelected() !== value) {
      skipIds.set(targetNode, true);
      targetNode.setSelected(value, false, true);
    }
  };

  const isParent = Boolean(node.group);

  if (isParent) {
    childSelectionCache.current.delete(node.id);
  }

  if (isParent && node.selected) {
    forEachDescendant(api, node, (descendant) => {
      if (isChildSelectable(descendant)) {
        setSelectedSynced(descendant, true);
        // Update persisted selection registry
        if (uniqueRowId && descendant.data?.[uniqueRowId] != null) {
          persistedSelectionRegistry.current.set(
            String(descendant.data[uniqueRowId]),
            descendant.data
          );
        }
      }
    });
    childSelectionCache.current.set(node.id ?? node, {
      node: node,
      selectAll: true,
      keys: new Set(),
    });
  }

  if (isParent && !node.selected) {
    forEachDescendant(api, node, (descendant) => {
      if (descendant?.selected) {
        setSelectedSynced(descendant, false);
        // Remove from persisted selection registry
        if (uniqueRowId && descendant.data?.[uniqueRowId] != null) {
          persistedSelectionRegistry.current.delete(
            String(descendant.data[uniqueRowId])
          );
        }
      }
    });
    childSelectionCache.current.delete(node.id ?? node);
  }
  const selectionOverrides = new Map();
  selectionOverrides.set(node, node.selected);

  let currentParent = node.parent;
  while (currentParent && currentParent.level >= 0) {
    let totalSelectable = 0;
    let selectedChildren = 0;
    
    api.forEachNode((siblingNode) => {
      if (siblingNode?.parent === currentParent && isSelectableChild(siblingNode)) {
        totalSelectable += 1;
        let isSelected;
        if (selectionOverrides.has(siblingNode)) {
          isSelected = selectionOverrides.get(siblingNode);
        } else if (siblingNode.group) {
          let allChildrenSel = true;
          let hasChildren = false;
          api.forEachNode((child) => {
            if (child?.parent === siblingNode && isSelectableChild(child)) {
              hasChildren = true;
              const childSel = selectionOverrides.has(child)
                ? selectionOverrides.get(child)
                : child.selected;
              if (!childSel) allChildrenSel = false;
            }
          });
          isSelected = hasChildren ? allChildrenSel : siblingNode.selected;
          selectionOverrides.set(siblingNode, isSelected);
        } else {
          isSelected = siblingNode.selected;
        }
        if (isSelected) selectedChildren += 1;
      }
    });

    const allChildrenSelected =
      totalSelectable > 0 && selectedChildren === totalSelectable;
    
    if (isSelectableChild(currentParent) || !currentParent.data) {
      const newValue = allChildrenSelected;
      selectionOverrides.set(currentParent, newValue);
      setSelectedSynced(currentParent, newValue);
      // Remove auto-selected parents from registry — only directly checked rows should be tracked
      if (uniqueRowId && currentParent.data?.[uniqueRowId] != null) {
        persistedSelectionRegistry.current.delete(
          String(currentParent.data[uniqueRowId])
        );
      }
    }

    currentParent = currentParent.parent;
  }
  scheduleIndeterminateRefresh(api);
};

export const applyIndeterminateState = (api, gridRootRef, childSelectionCache) => {
  const root = gridRootRef.current;
  if (!root || !api) return;
  root
    .querySelectorAll(".ag-selection-checkbox .ag-checkbox-input-wrapper")
    .forEach((wrapper) => {
      wrapper.classList.remove("ag-indeterminate");
      const input = wrapper.querySelector("input");
      if (input) input.indeterminate = false;
    });

  const hasSelectedDescendant = new Map();
  const allNodes = [];
  api.forEachNode((node) => allNodes.push(node));
  
  allNodes.sort((a, b) => b.level - a.level);
  
  for (const node of allNodes) {
    if (!node.group) {
      hasSelectedDescendant.set(node, node.selected);
    } else {
      let anyChildSelected = false;
      let allChildrenSelected = true;
      let selectableChildCount = 0;
      
      api.forEachNode((child) => {
        if (child?.parent === node) {
          const childIsSelectable = 
            !child.data?._hideSelection && 
            !child.data?.checkbox_disabled;
          
          if (childIsSelectable) {
            selectableChildCount++;
            const childHasSelection = hasSelectedDescendant.get(child) || child.selected;
            if (childHasSelection) {
              anyChildSelected = true;
            } else {
              allChildrenSelected = false;
            }
          }
        }
      });
      
      if (selectableChildCount > 0) {
        allChildrenSelected = allChildrenSelected && selectableChildCount > 0;
      } else {
        allChildrenSelected = false;
      }
      
      hasSelectedDescendant.set(node, anyChildSelected || node.selected);
      
      const shouldBeIndeterminate = 
        !node.selected && anyChildSelected;
      
      if (shouldBeIndeterminate) {
        const wrappers = getRowWrappers(root, node);
        wrappers.forEach((wrapper) => {
          const input = wrapper.querySelector("input");
          wrapper.classList.add("ag-indeterminate");
          wrapper.classList.remove("ag-checked");
          if (input) input.indeterminate = true;
        });
      }
    }
  }
  childSelectionCache.current.forEach((entry) => {
    const parentNode = entry?.node;
    if (entry?.selectAll) return;
    if (!entry?.keys?.size || !parentNode) return;
    if (parentNode.expanded || parentNode.isSelected?.()) return;
    const wrappers = getRowWrappers(root, parentNode);
    wrappers.forEach((wrapper) => {
      const input = wrapper.querySelector("input");
      wrapper.classList.add("ag-indeterminate");
      wrapper.classList.remove("ag-checked");
      if (input) input.indeterminate = true;
    });
  });
};

export const updateChildSelectionCache = (node, childSelectionCache, uniqueRowId) => {
  if (!uniqueRowId || !node) return;
  const parent = node.parent;
  if (!parent || parent.level < 0) return;
  if (!isChildSelectable(node)) return;
  const key = node?.data?.[uniqueRowId];
  if (key === undefined || key === null) return;
  if (node.selected) {
    const entry = childSelectionCache.current.get(parent.id) || {
      node: parent,
      keys: new Set(),
    };
    entry.node = parent;
    entry.keys.add(key);
    childSelectionCache.current.set(parent.id, entry);
  } else if (parent.expanded) {
    const entry = childSelectionCache.current.get(parent.id);
    if (entry) {
      entry.keys.delete(key);
      if (entry.keys.size === 0) {
        childSelectionCache.current.delete(parent.id);
      }
    }
  }
};

export const applySelectionOnExpand = (event, childSelectionCache, skipIds) => {
  const { node, api } = event;
  if (!node || !node.expanded) return;

  const cacheKey = node.id ?? node;
  const entry = childSelectionCache.current.get(cacheKey);
  if (!entry || !entry.selectAll) return;
  setTimeout(() => {
    api.forEachNode((childNode) => {
      if (childNode?.parent === node && isChildSelectable(childNode)) {
        if (!childNode.selected) {
          skipIds.set(childNode, true);
          childNode.setSelected(true, false, true);
        }
      }
    });
    childSelectionCache.current.delete(cacheKey);
  }, 0);
};

