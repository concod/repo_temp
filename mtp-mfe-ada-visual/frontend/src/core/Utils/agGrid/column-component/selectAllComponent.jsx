import React, { useEffect, useState } from "react";
import { Checkbox } from "impact-ui-v3";
import { isFunction } from "lodash";


const SelectAllComponent = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tenRecordsSelected, setTenRecordsSelected] = useState(true);
  const [allRecordsSelected, setAllRecordsSelected] = useState(true);
  const [disableSelectAll, setDisableSelectAll] = useState(false);
  const [disableCurrentPage, setDisableCurrentPage] = useState(false);
  const open = Boolean(anchorEl);

  // Check if the redux's tableReducer->keyboardShortcut has a property 'performShortcutAction' and it contains 'allRecords'
  //onChange of all records select/deselect all records
  // useEffect(() => {
  //   if (
  //     props.keyboardShortcut?.perfromShortcutAction?.hasOwnProperty(
  //       "allRecords"
  //     ) &&
  //     props.api.gridOptionsWrapper.domDataKey ===
  //       props?.keyboardShortcut?.tableKey
  //   ) {
  //     checkSelectableRecords();
  //     if (
  //       tenRecordsSelected &&
  //       !disableSelectAll &&
  //       !props.hideSelectAllRecords
  //     ) {
  //       selectAll();
  //     }
  //   }
  // }, [props.keyboardShortcut?.perfromShortcutAction?.allRecords]);

  // Check if the redux's tableReducer->keyboardShortcut has a property 'performShortcutAction' and it contains 'tenRecords'
  //onChange of tenRecords select/deselect current page records
  // useEffect(() => {
  //   if (
  //     props.keyboardShortcut?.perfromShortcutAction?.hasOwnProperty(
  //       "tenRecords"
  //     ) &&
  //     props.api.gridOptionsWrapper.domDataKey ===
  //       props?.keyboardShortcut?.tableKey
  //   ) {
  //     checkSelectableRecords();
  //     if (
  //       allRecordsSelected &&
  //       !disableCurrentPage &&
  //       !props.hideSelectCurrentPageRecords
  //     ) {
  //       selectTenRecords();
  //     }
  //   }
  // }, [props.keyboardShortcut?.perfromShortcutAction?.tenRecords]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    checkSelectableRecords();
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const updateState = (value, params) => {
    setTenRecordsSelected(true);
    setAllRecordsSelected(true);
  };
  useEffect(() => {
    props?.refreshState?.(updateState);
    checkSelectableRecords();
  }, []);


  /**
   * @function
   * @description Enable & disable checkboxes for client side tables when the row checkboxes are disabled.
   */
  const checkSelectableRecords = () => {
    if (!props.api.gridOptionsWrapper.gridOptions.context?.manualCallBack) {
      const isCurrentPageSelectable = props.api
        .getRenderedNodes()
        .filter((node) => !isRowDisabled(node));
      let isAnyRowSelectable;
      if (!isCurrentPageSelectable.length) {
        isAnyRowSelectable = props.api?.rowModel?.rowsToDisplay?.filter(
          (node) => !isRowDisabled(node)
        );
      }
      setDisableCurrentPage(!Boolean(isCurrentPageSelectable.length));
      setDisableSelectAll(
        !Boolean(isCurrentPageSelectable.length || isAnyRowSelectable.length)
      );
    }
  };

  const selectTenRecords = () => {
    let isCheckAll;
    let selectedCheckBox = props.api
      .getRenderedNodes()
      .filter((rowNode) => rowNode.selected || !isRowDisabled(rowNode)); //selectedcheckbox array where we have selected checkbox data
    if (
      props.api.getRenderedNodes().every((rowNode) => rowNode.selected) ||
      selectedCheckBox?.every((rowNode) => rowNode.selected)
    ) {
      isCheckAll = false;
      setTenRecordsSelected(true);
    }
    //if few rows are selected or deselected when user selects this options, select all 10 records
    else {
      isCheckAll = true;
      setTenRecordsSelected(false);
    }
    //current page rowNodes - use suppressFinishActions so onSelectionChanged runs only once (same pattern as selectAll)
    let l_triggered = false;
    props.api.getRenderedNodes().forEach((rowNode) => {
      if (!isRowDisabled(rowNode)) {
        if (isCheckAll) {
          if (!rowNode.selected && !l_triggered) {
            l_triggered = true;
            rowNode.setSelected(isCheckAll);
          } else {
            rowNode.setSelected(isCheckAll, false, true);
          }
        } else {
          if (rowNode.selected && !l_triggered) {
            l_triggered = true;
            rowNode.setSelected(isCheckAll);
          } else {
            rowNode.setSelected(isCheckAll, false, true);
          }
        }
      }
    });
    setAnchorEl(null);
    return props;
  };
  const selectAll = () => {
    // BE pagination
    if (props.api.gridOptionsWrapper.gridOptions.context?.manualCallBack) {
      let allRows = props.api
        .getRenderedNodes()
        .filter((node) => !isRowDisabled(node));
      let isCheckAll;
      // forEachNode returns - All row nodes present in the table
      // Apply conditions if oly few rows are selected and the user clicks on select all again, using rowNodes select all rows
      if (allRows.every((rowNode) => rowNode.selected)) {
        isCheckAll = false;
        setAllRecordsSelected(true);
      } else {
        isCheckAll = true;
        setAllRecordsSelected(false);
      }
      // // all rowNodes rendered
      props.checkAllCallback(props, isCheckAll);
      let l_triggered = false;

      props.api.forEachNode((node, i) => {
        if (!isRowDisabled(node)) {
          if (isCheckAll) {
            if (!node.selected && !l_triggered) {
              l_triggered = true;
              node.setSelected(isCheckAll);
            } else {
              node.setSelected(isCheckAll, false, true);
            }
          } else {
            if (node.selected && !l_triggered) {
              l_triggered = true;
              node.setSelected(isCheckAll);
            } else {
              node.setSelected(isCheckAll, false, true);
            }
          }
        }
      });
      setAnchorEl(null);
      return props;
    }
    // FE pagination
    else {
      let allRows = props.api
        .getModel()
        .rowsToDisplay.filter((node) => !isRowDisabled(node));
      let isCheckAll;
      if (allRows.every((rowNode) => rowNode.selected)) {
        isCheckAll = false;
        setAllRecordsSelected(true);
      }
      //if few rows are selected or deselected when user selects this options, select all records
      else {
        isCheckAll = true;
        setAllRecordsSelected(false);
      }
      /*
          condition used here is to account the issue related to delay in selection when there are multiple records that are selected at once.
          setSelected(newValue, clearSelection, suppressFinishActions)
          when multiple rows/records are to be selected at once, we set the 3rd param in the above function to true,
          so that all the event dispatches are suppressed except that of the last selection, for which we perform the usual selection method 
          that triggers/dispatches events for onRowSelected, onSelectionChanged, etc.
      */

      // The issue is a performance concern. When the table has 1000 rows, selecting all rows triggers the rowNode.setSelected(true) method 1000 times, which, in turn, invokes the onSelectionChanged callback in the parent component. This causes re-renders when setting state values in the onSelectionChanged callback, leading to UI freezing.

      // The existing solution addresses the UI freezing issue by triggering rowNode.setSelected(true) only for the last row, ensuring the onSelectionChanged callback is triggered once for the entire 1000 rows (as explained in the above comment).

      // However, a problem arises with the existing solution if the 1000th row is already selected when the "Select All" is clicked. In this case, re-triggering rowNode.setSelected(true) for the 1000th row wouldn't call the onSelectionChanged callback since the row's selected property is already true. Consequently, technically, only one row would be considered as selected, which is an issue.

      // The proposed solution aims to maintain the performance improvement while addressing the selection issue. It retains the technique of triggering rowNode.setSelected(true) only once. However, the trigger now focuses on the first unselected row rather than the last row. This ensures both the performance issue and the selection issue are resolved.

      // This solves the other way issue as well meaning when user unselect all we trigger rowNode.setSelected(false) for the first selected row.
      
      props.checkAllCallback(props, isCheckAll);
      let l_triggered = false;
      allRows.forEach((rowNode, i) => {
        if (!isRowDisabled(rowNode)) {
          if (isCheckAll) {
            if (!rowNode.selected && !l_triggered) {
              l_triggered = true;
              rowNode.setSelected(isCheckAll);
            } else {
              rowNode.setSelected(isCheckAll, false, true);
            }
          } else {
            if (rowNode.selected && !l_triggered) {
              l_triggered = true;
              rowNode.setSelected(isCheckAll);
            } else {
              rowNode.setSelected(isCheckAll, false, true);
            }
          }
        }
      });
      setAnchorEl(null);
      return props;
    }
  };

  const getDropdownOptions = React.useMemo(() => {
    const options = [];

    if (!props.hideSelectCurrentPageRecords) {
      options.push({
        label: "Select current page records",
        onClick: selectTenRecords,
        value: "Select current page records",
        disabled: !allRecordsSelected || disableCurrentPage,
      });
    }

    if (!props.hideSelectAllRecords) {
      options.push({
        label: "Select all records",
        value: "Select all records",
        onClick: selectAll,
        disabled: !tenRecordsSelected || disableSelectAll,
      });
    }

    return options;
  }, [
    props.hideSelectCurrentPageRecords,
    props.hideSelectAllRecords,
    allRecordsSelected,
    disableCurrentPage,
    tenRecordsSelected,
    disableSelectAll,
    selectTenRecords,
    selectAll,
  ]);

  const isRowDisabled = (rowNode) => {
    const isRowSelectable = isFunction(props.isRowSelectable) ? props.isRowSelectable(rowNode) : true;
    return !isRowSelectable || rowNode.data?.checkbox_disabled;
  };

  return (
    <>
      <Checkbox
        onDropDownCheckBoxClick={checkSelectableRecords}
        dropDownData={getDropdownOptions}
        variant="default"
        withDropDown
        checked={!tenRecordsSelected || !allRecordsSelected}
      />
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    keyboardShortcut: store.tableReducer.keyboardShortcut,
  };
};
export default SelectAllComponent;
