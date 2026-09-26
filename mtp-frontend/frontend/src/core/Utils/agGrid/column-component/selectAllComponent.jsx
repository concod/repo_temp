import React, { useEffect, useState } from "react";
import { CheckBoxOutlineBlank, CheckBoxTwoTone } from "@mui/icons-material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Check from "@mui/icons-material/Check";
import ListItemIcon from "@mui/material/ListItemIcon";

import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  selectIcon: {
    color: theme.palette.primary.main,
    cursor: "pointer",
  },
}));

const SelectAllComponent = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tenRecordsSelected, setTenRecordsSelected] = useState(true);
  const [allRecordsSelected, setAllRecordsSelected] = useState(true);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const updateState = (value, params) => {
    setTenRecordsSelected(true);
    setAllRecordsSelected(true);
  };
  useEffect(() => {
    props.refreshState(updateState);
  }, []);

  useEffect(() => {
    setAllRecordsSelected(!props.api.isSelectAllRecords);
  }, [props.api.isSelectAllRecords]);

  const classes = useStyles();
  const selectTenRecords = () => {
    let isCheckAll;
    let selectedCheckBox = props.api
      .getRenderedNodes()
      .filter(
        (rowNode) => rowNode.selected || !rowNode.data?.checkbox_disabled
      ); //selectedcheckbox array where we have selected checkbox data
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
    //current page rowNodes
    props.api.getRenderedNodes().forEach((rowNode) => {
      if (!rowNode.data?.checkbox_disabled)
        // In Oms we are not selected the rows in which we are having this key is true and these rows are disabled in FE so we can use it as generic also if we want to select few rows after clicking select current records with this key
        rowNode.setSelected(isCheckAll);
    });
    setAnchorEl(null);
    return props;
  };
  const selectAll = () => {
    // BE pagination
    if (props.api.gridOptionsWrapper.gridOptions.manualCallBack) {
      let allRows = props.api
        .getRenderedNodes()
        .filter((node) => !node?.data?.checkbox_disabled);
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
        if (!node?.data?.checkbox_disabled) {
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
        .rowsToDisplay.filter((node) => !node?.data?.checkbox_disabled);
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

      let l_triggered = false;
      allRows.forEach((rowNode, i) => {
        if (!rowNode?.data?.checkbox_disabled) {
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
  return (
    <>
      <div onClick={handleClick}>
        {!tenRecordsSelected || !allRecordsSelected ? (
          <CheckBoxTwoTone className={classes.selectIcon} fontSize="small" />
        ) : (
          <CheckBoxOutlineBlank
            className={classes.selectIcon}
            fontSize="small"
          />
        )}
      </div>
      <Menu
        id="ag-grid-row-selection-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        {!props.hideSelectCurrentPageRecords && (
          <MenuItem onClick={selectTenRecords} disabled={!allRecordsSelected}>
            {!tenRecordsSelected && (
              <ListItemIcon>
                <Check />
              </ListItemIcon>
            )}
            Select current page records
          </MenuItem>
        )}

        {!props.hideSelectAllRecords && (
          <MenuItem onClick={selectAll} disabled={!tenRecordsSelected}>
            {!allRecordsSelected && (
              <ListItemIcon>
                <Check />
              </ListItemIcon>
            )}
            Select all records
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
export default SelectAllComponent;
