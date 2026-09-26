import { useState } from "react";

import Sort from "@mui/icons-material/Sort";
import makeStyles from "@mui/styles/makeStyles";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { ascendingOrderLabel, descendingOrderLabel } from "../constants";
import { useTranslation } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  TableHeaderWithSort: {
    display: "flex",
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
}));

const SortComponent = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { t } = useTranslation();
  const { api, column } = props;
  const { gridOptionsWrapper } = api;
  const open = Boolean(anchorEl);
  const classes = useStyles();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const sortFunc = (columnData, sortBy) => {
    // applyColumnState - to manually set the sort order for a particular column
    gridOptionsWrapper.gridOptions.columnApi.applyColumnState({
      state: [{ colId: columnData.colId, sort: sortBy }],
      defaultState: { sort: null },
    });
    setAnchorEl(null);
  };

  return (
    <>
      <div className={classes.TableHeaderWithSort}>
        <p>{props.displayName}</p> <Sort onClick={handleClick} />
      </div>
      <Menu
        id="ag-grid-sort-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem onClick={() => sortFunc(column, "asc")}>
          {t(ascendingOrderLabel[column.colDef.type])}
        </MenuItem>
        <MenuItem onClick={() => sortFunc(column, "desc")}>
          {t(descendingOrderLabel[column.colDef.type])}
        </MenuItem>
        <MenuItem onClick={() => sortFunc(column)}>{t("agGrid.reset")}</MenuItem>
      </Menu>
    </>
  );
};

export default SortComponent;