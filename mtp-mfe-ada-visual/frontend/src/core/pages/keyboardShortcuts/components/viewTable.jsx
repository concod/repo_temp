import { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import colours from "core/Styles/colours";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import InfoTooltip from "core/Utils/agGrid/cellsToBeRendered/infoTooltip";

const Table = (props) => {
  const [columnData, setColumnData] = useState([]);
  const [filteredRowData, setFilteredRowData] = useState([]);
  const [renderKey, setRenderKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        let columnInfo = await props.getColumnsAg(
          "table_name=keyboard_shortcuts"
        );
        columnInfo = columnInfo.map((col) => {
          if (col.accessor === "actions") {
            col.cellRenderer = (params, extraProps) => {
              return <InfoTooltip props={params} />;
            };
          }
          return col;
        });
        setColumnData(columnInfo);
      } catch (error) {
        props.addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        });
      }
      setIsLoading(false);
    };
    fetchData();
  }, [props.rowItem]);

  useEffect(() => {
    const filteredItems = props.rowItem?.filter((item) => {
      return (
        item.components
          ?.toLowerCase()
          .includes(props.searchQuery.toLowerCase()) ||
        item.actions?.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
        (item.windows_keys + item.mac_keys)
          ?.split(",")
          .join("+")
          .replace(/\s+/g, "")
          ?.toLowerCase()
          .includes(props.searchQuery.replace(/\s+/g, "").toLowerCase())
      );
    });
    setFilteredRowData(filteredItems);
    setRenderKey(renderKey + 1);
  }, [props.rowItem, props.searchQuery]);

  const getRowStyle = () => {
    return {
      border: "5px 1px",
      borderStyle: "solid",
      margin: "10px 0",
      borderColor: colours.whiteSmoke,
      boxShadow: `0px 0px 8px 0px ${colours.boxShadowCard}`,
      paddingBlock: "0.5rem",
      borderRadius: "0.25rem",
    };
  };

  return (
    <LoadingOverlay loader={isLoading} spinner>
      <div key={renderKey}>
        <AgGridComponent
          columns={columnData}
          rowdata={filteredRowData}
          pagination={true}
          sizeColumnsToFitFlag
          adjustTableHeight
          showSaveTableConfig={false}
          showSearchModalBtn={false}
          showColumnPanel={false}
          setIsTableViewPanelOpen={false}
          rowHeight={60}
          getRowStyle={getRowStyle}
          customClass={"keyboard-shortcut-table"}
          agGridPagination={false}
        />
      </div>
    </LoadingOverlay>
  );
};

const mapActionsToProps = {
  getColumnsAg,
};

export default connect("", mapActionsToProps)(Table);
