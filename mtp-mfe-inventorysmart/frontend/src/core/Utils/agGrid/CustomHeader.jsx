import SearchIcon from "@mui/icons-material/Search";
import { setColumnSearched } from "core/actions/tableColumnActions";
import { useRef } from "react";
import { useDispatch } from "react-redux";
import "./ag-theme-mtp.scss";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

const CustomHeader = (props) => {
  const { column } = props;
  const refButton = useRef(null);
  const dispatch = useDispatch();

  const handleSearchClick = () => {
    try {
      let coloumnData = column.colDef;
      //column.gridApi.openToolPanel("table-actions");
      if (props && props.api) {
        props.api.showSearch = true;
      }
      dispatch(setColumnSearched(coloumnData.accessor));
    } catch (error) {
      console.error("handleSearchClick error", error);
    }
  };

  const handleMenuClick = () => {
    props.showColumnMenu(refButton.current);
  };

  return (
    <div className={`custom-header-container`}>
      <span
        className={`ag-header-cell-text ${
          props?.column?.colDef?.wrapText && "wrappable-header-cell"
        }`}
      >
        {column.getColDef().headerName}
      </span>

      <div className="icon-div">
        {props.column?.isFilterActive() ? (
          <span
            class="ag-icon ag-icon-filter"
            unselectable="on"
            role="presentation"
          ></span>
        ) : null}
        {column.colDef.is_searchable && (
          <SearchIcon fontSize="small" onClick={handleSearchClick} />
        )}
        {!props.column?.colDef?.suppressMenu && (
          <span
            className="ag-icon ag-icon-menu ag-header-icon"
            onClick={handleMenuClick}
            ref={refButton}
          />
        )}
        {props?.column?.colDef?.extra?.toolTipInfo && <Tooltip title={props?.column?.colDef?.extra?.toolTipInfo} placement="top">
          <InfoIcon
            fontSize="medium"
            sx={{ cursor: "pointer", color: "#0055AF" }}
          />
        </Tooltip>}
      </div>
    </div>
  );
};

export default CustomHeader;
