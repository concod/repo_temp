import { SELECTION_TYPES } from "../../constants";

/**
 * Handles selection for current page records. with selectionChanged fired only the first time
 */
export const handleCurrentPageRecordsChange = (renderedNodes, isCheckAll) => {
  const count = renderedNodes.length;
  if (!count) return;

  let l_triggered = false;
  renderedNodes.forEach((node) => {
    if (isCheckAll) {
      if (!node.selected && !l_triggered) {
        l_triggered = true;
        node.setSelected(true);
      } else {
        node.setSelected(true, false, true);
      }
    } else {
      if (node.selected && !l_triggered) {
        l_triggered = true;
        node.setSelected(false);
      } else {
        node.setSelected(false, false, true);
      }
    }
  });
};

/**
 * Handles selection for all records. with selectionChanged fired only the first time
 */
export const selectAllRecords = (api, { isRowDisabled } = {}) => {
  const isDisabled = isRowDisabled || (() => false);

  let l_triggered = false;
  api.forEachNode((node) => {
    if (!isDisabled(node)) {
      if (!node.selected && !l_triggered) {
        l_triggered = true;
        node.setSelected(true);
      } else {
        node.setSelected(true, false, true);
      }
    }
  });
};

/**
 * Handles deselection for all records. with selectionChanged fired only the first time
 */
export const clearAllRecords = (api, { isRowDisabled, onlyCurrentPage } = {}) => {
  const isDisabled = isRowDisabled || (() => false);

  let l_triggered = false;
  const clearNode = (node) => {
    if (!isDisabled(node) && node.selected) {
      if (!l_triggered) {
        l_triggered = true;
        node.setSelected(false);
      } else {
        node.setSelected(false, false, true);
      }
    }
  };
  if (onlyCurrentPage){
    api.getRenderedNodes().forEach(clearNode);
  } else {
    api.forEachNode(clearNode);
  }
};

/**
 * Handled modification of the bulkActionbar related props for Impact UI 
 */
export const updateContextIfChanged = (context, showBar, label, enableSelectAll = true, prevState) => {
  if (prevState.showBar === showBar && prevState.label === label) return false;
  context.showBulkActionBar = showBar;
  context.enableSelectAll = enableSelectAll;
  context.actionBarLabel = label;
  prevState.showBar = showBar;
  prevState.label = label;
  context.forceRender?.();
  return true;
};

/**
 * Computes selection state for the current page and updates context/bar accordingly.
 * Returns the new SELECTION_TYPE value ("none" | "partial" | "all").
 */
export const computeSelectionState = (api, selectableNodes, prevState) => {
  const context = api?.gridOptionsWrapper?.gridOptions?.context;
  if (!context) return SELECTION_TYPES.NONE;

  const totalCount = selectableNodes.length;

  if (totalCount === 0) {
    if (!api.isSelectAllRecords) {
      updateContextIfChanged(context, false, "", true, prevState);
    }
    return SELECTION_TYPES.NONE;
  }

  let selectedCount = 0;
  for (let i = 0; i < totalCount; i++) {
    if (selectableNodes[i].selected) selectedCount++;
  }

  if (selectedCount === 0) {
    updateContextIfChanged(context, false, "", true, prevState);
    return SELECTION_TYPES.NONE;
  }

  if (selectedCount === totalCount) {
    const isSinglePage = !context.hideSelectAllRecords && !api?.gridOptionsWrapper?.gridOptions?.pagination;
    if (api.isSelectAllRecords || isSinglePage) {
      if (context.enableSelectAll) {
        const totalRowCount = api.paginationProxy?.masterRowCount || totalCount;
        updateContextIfChanged(
          context, true,
          // `All ${totalRowCount} rows across all pages are selected.`,
           `All rows across all pages are selected.`,
          false, prevState
        );
      }
    } else {
      updateContextIfChanged(
        context, true,
        `All ${totalCount} rows on this page are selected.`,
        true, prevState
      );
    }
    return SELECTION_TYPES.ALL;
  }

  // Partial
  if (api.isSelectAllRecords) {
    updateContextIfChanged(
      context, true,
      `${selectedCount} of ${totalCount} rows on this page are selected.`,
      true, prevState
    );
  } else {
    updateContextIfChanged(context, false, "", true, prevState);
  }
  return SELECTION_TYPES.PARTIAL;
};

/**
 * Handles header checkbox toggle (select all / deselect all on current page).
 */
export const handleHeaderCheckboxChange = (api, selectableNodes) => {
  if (!api || !selectableNodes.length) return null;
  const context = api?.gridOptionsWrapper?.gridOptions?.context;
  if (!context) return null;

  const hasSelected = selectableNodes.some((node) => node.selected);
  const isCheckAll = !hasSelected;


 // check if the table has only one page. 
 // if a table has only one page, then it might be infinite row model, 
 // for some server side and client side tables also when there is only 1 page
  const shouldSelectAll = !context.hideSelectAllRecords && !api?.gridOptionsWrapper?.gridOptions?.pagination;

  if (shouldSelectAll) {
    // For infinite row model, select all records across all pages
    if (isCheckAll) {
      handleSelectAllRows(api);
    } else {
      handleClearSelection(api);
    }
    return isCheckAll;
  }

  handleCurrentPageRecordsChange(selectableNodes, isCheckAll, api);

  if (!isCheckAll) {
    // Clear persisted registry on deselect — suppressEvents prevents onRowSelected cleanup
    api._persistedSelectionRegistry?.clear();
  }

  if (isCheckAll) {
    context.showBulkActionBar = true;
    context.enableSelectAll = true;
    context.actionBarLabel = `All ${selectableNodes.length} rows on this page are selected.`;
  } else {
    context.showBulkActionBar = false;
    context.enableSelectAll = true;
    context.actionBarLabel = "";
  }

  context.checkCurrentPageRows?.(api, isCheckAll);
  return isCheckAll;
};

/**
 * Handler for "Select All Rows" across all pages.
 * Selects all records, updates checkConfig, and sets the bulk action bar context.
 */
export const handleSelectAllRows = (api) => {
  if (!api) return;
  const context = api.gridOptionsWrapper?.gridOptions?.context;
  if (!context) return;
  const totalRowCount = api?.getModel?.()?.isLastRowIndexKnown?.() ? api.paginationProxy?.masterRowCount : "";
  selectAllRecords(api, {
    isRowDisabled: (node) => node.data?.checkbox_disabled || node.data?._hideSelection
  });
  // adding all the selected rows to the registry
  const uniqueRowId = context.uniqueRowId;
  if (uniqueRowId && api._persistedSelectionRegistry) {
    api.forEachNode((node) => {
      if (!node.data?.checkbox_disabled && !node.data?._hideSelection && node.data?.[uniqueRowId] != null) {
        api._persistedSelectionRegistry.set(
          String(node.data[uniqueRowId]),
          node.data
        );
      }
    });
  }
  
  context.checkAll?.(api, true);
  context.showBulkActionBar = true;
  context.enableSelectAll = false;
  // context.actionBarLabel = `All ${totalRowCount} rows across all pages are selected.`;
  context.actionBarLabel = `All rows across all pages are selected.`;
};

/**
 * Handler for "Clear Selection" across all pages.
 * Deselects all records, updates checkConfig, and hides the bulk action bar.
 */
export const handleClearSelection = (api) => {
  if (!api) return;
  const context = api.gridOptionsWrapper?.gridOptions?.context;
  if (!context) return;
  
  const hideSelectAllRecords = context.hideSelectAllRecords;  
  clearAllRecords(api, 
    { isRowDisabled: (node) => node.data?.checkbox_disabled || node.data?._hideSelection,
       onlyCurrentPage: hideSelectAllRecords 
    });
  api._persistedSelectionRegistry?.clear();
  context.checkAll?.(api, false);
  context.showBulkActionBar = false;
  context.enableSelectAll = true;
  context.actionBarLabel = "";
};