import SearchIcon from "@mui/icons-material/Search";
import { setColumnSearched } from "core/actions/tableColumnActions";
import { useRef } from "react";
import { useDispatch } from "react-redux";
import "./ag-theme-mtp.scss";

const CustomHeader = (props) => {
  const { column } = props;
  const refButton = useRef(null);
  const dispatch = useDispatch();

  const handleSearchClick = () => {
    try {
      let coloumnData = column.colDef;
      column.gridApi.openToolPanel("table-actions");
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
      <span className="ag-header-cell-text">
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
      </div>
    </div>
  );
};

export default CustomHeader;
