import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import moment from "moment";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { Badge, useTranslation } from "impact-ui-v3";

const AsigneeViewTable = (props) => {
  const [tableData, setTableData] = useState([]);
  const [tableColumnsConfig, setTableColumnsConfig] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [numberOfUsers, setNumberOfUsers] = useState(0);
  const navigate = useNavigate();
  let location = useLocation();
  const sharedClasses = sharedStyles();
  const { t } = useTranslation();
  const tenantDateFormat = localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";

  /**
   * updateTableRows will be used to set the row data
   * which will be passed to Aggrid component to
   * display row data in table
   * @param {object} data
   */
  const updateTableRows = (data) => {
    const userSet = new Set(data?.tickets?.map((item) => item.user_id) || []);
    const rows = Array.from(userSet).map((set) => {
      let userName = "";
      let total = 0;
      let open = 0;
      let closed = 0;
      data.tickets.forEach((item) => {
        if (item.user_id === set) {
          userName = item.user_name;
          total++;
          if (!moment(item.closed_on, `${tenantDateFormat} HH:mm:ss`, true).isValid()) {
            open++;
          } else {
            closed++;
          }
        }
      });
      return {
        user_id: set,
        total: total,
        open: open,
        closed: closed,
        user_name: userName,
      };
    });
    setTableData(rows);
    setNumberOfUsers(rows.length);
  };

  /**
   * onTableCellClick is the function
   * which will be called when we click
   * on the table cell which will be of
   * link type and its function is to
   * navigate to detailed view page
   * with appropriate params
   * @param {object} ins
   */
  const onTableCellClick = (ins) => {
    try {
      let id = ins?.cellData?.data?.user_id;
      if (
        ins?.column.column_name === "user_id" ||
        ins?.column.column_name === "total"
      ) {
        /**
         * if the user clicks any link from user_id or total column
         * then show him total tickets of that user_id(of the same row)
         * in detailed view
         */
        navigate(
          `/ticketing-system/detailed-view/data-id/${id}/data-category/total`,
          {
            state: {
              prevScr: location.pathname,
            },
          }
        );
      } else if (ins?.column.column_name === "open") {
        /**
         * if the user clicks any link from open column
         * then show him open tickets of the user_id(of the same row)
         * in detailed view
         */
        navigate(
          `/ticketing-system/detailed-view/data-id/${id}/data-category/open`,
          {
            state: {
              prevScr: location.pathname,
            },
          }
        );
      } else if (ins?.column.column_name === "closed") {
        /**
         * if the user clicks any link from closed column
         * then show him open tickets of the user_id(of the same row)
         * in detailed view
         */
        navigate(
          `/ticketing-system/detailed-view/data-id/${id}/data-category/closed`,
          {
            state: {
              prevScr: location.pathname,
            },
          }
        );
      }
    } catch (error) {
      console.error("onTableCellClick error:", error);
    }
  };

  /**
   * fetchColumnConfig will be used to set the column data
   * which will be passed to Aggrid component to
   * display columns in table
   */
  const fetchColumnConfig = async () => {
    setIsLoading(true);
    const cols = await props.getColumnsAg(
      "table_name=ticketing_summary_view_table"
    );
    cols.forEach((eachCol) => {
      if (eachCol.type === "link" && eachCol.is_editable) {
        eachCol.onClick = onTableCellClick;
      }
    });
    setTableColumnsConfig(cols);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.reportData)) {
      updateTableRows(props.reportData);
    } else {
      setTableData([]);
    }
  }, [props.reportData]);

  return (
    <LoadingOverlay loader={isLoading} spinner>
      {tableColumnsConfig.length > 0 && (
        <AgGridComponent
          columns={tableColumnsConfig}
          onGridChanged
          rowdata={tableData}
          pagination={true}
          uniqueRowId="user_id"
          sizeColumnsToFitFlag
          adjustTableHeight
          tableHeader={t("ticketing.table.assigneeView")}
          topLeftOptions={
            <Badge
              label={`${numberOfUsers} ${t("ticketing.table.users")}${numberOfUsers > 1 ? "s" : ""}`}
              color="info"
              variant="subtle"
            />
          }
        />
      )}
    </LoadingOverlay>
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

export default connect(mapStateToProps, mapDispatchToProps)(AsigneeViewTable);
