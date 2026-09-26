import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import { chipConfig } from "core/pages/ticketing-system/constants";
import { formatDateForTable } from "core/pages/ticketing-system/utils";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import TransactionHistory from "../transaction-history/transaction-history";
import StyledChip from "core/Utils/chip/StyledChip";
import moment from "moment";

/**
 * DetailedViewTable is the table
 * where all the mojo tickets will
 * be displayed
 * @param {object} props
 * @returns
 */
const DetailedViewTable = (props) => {
  const [tableData, setTableData] = useState([]);
  const [tableColumnsConfig, setTableColumnsConfig] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [ticketId, setTicketId] = useState(0);
  const [updatedOn, setUpdatedOn] = useState("");
  const {
    getColumnsAg,
    tickets,
    setNoOfTickets,
    setGridParams = () => {},
  } = props;
  const globalClasses = globalStyles();
  const tableRef = useRef(null);

  /**
   * onTicketIdClick is the function
   * which will be called when we click
   * on the table cell which will be of
   * link type and its function is to
   * open the Transaction History
   * component
   * @param {object} ins
   */
  const onTicketIdClick = (ins) => {
    try {
      setTicketId(ins.cellData.value);
      let updatedDate = ins.cellData.data?.updated_on;
      const parsedDate = moment(updatedDate, "MM-DD-YYYY, HH:mm:ss");
      const formattedDate = parsedDate.format("YYYY-MM-DD 00:00:00.000");
      setUpdatedOn(formattedDate);
      setShowTransactionHistory(true);
    } catch (error) {
      console.error("onTicketIdClick error:", error);
    }
  };

  /**
   * fetchColumnConfig will be used to set the column data
   * which will be passed to Aggrid component to
   * display columns in table
   */
  const fetchColumnConfig = async () => {
    setIsLoading(true);
    const cols = await getColumnsAg("table_name=ticketing_detailed_view_table");
    cols.forEach((eachCol) => {
      if (eachCol.type === "link" && eachCol.is_editable) {
        eachCol.onClick = onTicketIdClick;
      }
      if (eachCol.type === "chip") {
        eachCol.chipConfig = chipConfig;
        eachCol.cellRenderer = (instance) => {
          let cellData = { ...instance };
          cellData.value = instance.value;
          // cells are rendered as chips
          return (
            <StyledChip
              label={cellData.value}
              color={chipConfig[cellData.value]}
            />
          );
        };
      }
      if (eachCol.accessor === "title") {
        eachCol.wrapText = true;
      }
    });
    setTableColumnsConfig(cols);
    if (props?.setColumnData) {
      props.setColumnData(cols);
    }
    setIsLoading(false);
  };

  /**
   * updateTableRows will be used to set the row data
   * which will be passed to Aggrid component to
   * display row data in table
   * @param {object} data
   */
  const updateTableRows = (data) => {
    const userSet = new Set(data?.map((item) => item.id) || []);
    const rows = Array.from(userSet).map((set) => {
      let dataObject = {};
      data.forEach((item) => {
        if (item.id === set) {
          dataObject.id = item.id;
          dataObject.status = item.status;
          dataObject.title = item.title;
          dataObject.priority = item.priority;
          dataObject.user_name = item.user_name;
          dataObject.module_type = item.module_type;
          dataObject.created_on = formatDateForTable(item.created_on);
          dataObject.updated_on = formatDateForTable(item.updated_on);
        }
      });
      return dataObject;
    });
    setTableData(rows);
    if (setNoOfTickets) {
      setNoOfTickets(rows.length);
    }
  };

  useEffect(() => {
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    if (!isEmpty(tickets)) {
      updateTableRows(tickets);
    } else {
      setTableData([]);
      if (setNoOfTickets) {
        setNoOfTickets(0);
      }
    }
  }, [tickets]);

  useEffect(() => {
    if (tableRef.current) {
      setGridParams(tableRef.current);
    }
  }, [tableRef.current]);

  return (
    <div className={globalClasses.marginTop}>
      <LoadingOverlay loader={isLoading || props.loader} spinner>
        {tableColumnsConfig.length > 0 && (
          <AgGridComponent
            columns={tableColumnsConfig}
            onGridChanged
            rowdata={tableData}
            pagination={true}
            uniqueRowId="id"
            sizeColumnsToFitFlag
            adjustTableHeight
            tableRef={tableRef}
          />
        )}
      </LoadingOverlay>
      {showTransactionHistory && (
        <TransactionHistory
          ticketId={ticketId}
          updatedOn={updatedOn}
          setShowTransactionHistory={setShowTransactionHistory}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    ticketingFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "ticketingFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DetailedViewTable);
