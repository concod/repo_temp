import React, { useState, useEffect, useRef } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Box, Button, Paper } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import withStyles from "@mui/styles/withStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep } from "lodash";
import { getHeaderForExcel, csvFormatter } from "../plansmart-utility";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  fetchReportKpiColumnConf,
  fetchReportKpiTableData,
  setReportFilterLoader,
  setReportColDefLoader,
  setReportTableDataLoader
} from "../../services-plansmart/Report/report-services";
import { addSnack } from "../../../../core/actions/snackbarActions";
import colours from "core/Styles/colours";
import ColumnDefs_kpi from './columnsDefsMock_kpi.json'
import TableData_kpi from './tableDataMock_kpi.json'
import TableData_timeline from './tableDataMock_timeline.json'
import ColumnDefs_timeline from './columnsDefsMock_timeline.json'
import AddHideMetrics from "../plansmart-budget-table/ShowHideMetrics";


const CustomButton = withStyles({
  root: {
    backgroundColor: colours.linkWaterLight,
    color: colours.black,
    margin: "10px",
    "&:hover": {
      backgroundColor: colours.linkWaterLight,
    },
  },
})(Button);
const ReportTableComponent = (props) => {
  const [showTable, setShowTable] = useState(false)
  const [reportTableColumns, setReportTableColumns] = useState([]);
  const [reportTableData, setReportTableData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [plan_period, setPlan_period] = useState({});
  const downloadLink = useRef(null);
  const agTableRef = useRef();
  const [hiddenMetrics, setHiddenMetrics] = useState({});

  useEffect(() => {
    fetchReportTableData(props.reportFilterPayload)
    fetchReportTableColumn()
  }, [props.reportFilterPayload, props.viewType])


  const fetchReportTableData = async (postData) => {
    setShowTable(true)
    props.setReportTableDataLoader(true);

    let postBody = {
      filters: [...props.reportFilterPayload],
      "view_type": props.viewType === "timeline" ? "Timeline" : "KPI"
    }

    let details = props.fetchReportKpiTableData(postBody);
    details
      .then(({ data }) => {
        const tableData = data.data
        if (Object.keys(tableData).length > 0 || tableData.length > 0) {
          setReportTableData(data.data);
        } else {
          setReportTableData([]);
          showSnackMessage("No data to show", "error");
        }
        props.setReportTableDataLoader(false);
      })
      .catch((error) => {
        showSnackMessage(
          error?.response?.data?.detail || "Error in fetching report details. ",
          "error"
        );
        props.setReportTableDataLoader(false);
      });
  };
  const fetchReportTableColumn = async () => {
    let postBody = {
      filters: [...props.reportFilterPayload],
      "view_type": props.viewType === "timeline" ? "Timeline" : "KPI"
    }

    try {
      props.setReportColDefLoader(true)
      let columns = [];
      if (props.viewType === "timeline") {
        const details = await props.fetchReportKpiColumnConf(postBody);
        columns = agGridColumnFormatter(details.data.data);
      } else {
        const details = await props.fetchReportKpiColumnConf(postBody);
        columns = agGridColumnFormatter(details.data.data);
      }
      setReportTableColumns(columns);
      props.setReportColDefLoader(false)
    } catch (error) {
      showSnackMessage(
        error?.response?.data?.detail || "Error in fetching report details. ",
        "error"
      );
      props.setReportColDefLoader(false)
    }
  };

  const showSnackMessage = (text, variance) => {
    props.addSnack({
      message: text,
      options: {
        variant: variance,
      },
    });
  };

  const getDownloadData = async () => {
    setCsvHeaders(getHeaderForExcel(cloneDeep(reportTableColumns)));
    setCsvData(csvFormatter(cloneDeep(reportTableData), csvHeaders));
  };


  function doesExternalFilterPass(node) {
    return node.data.hide || node.data.hideReference ? false : true;
  }

  function isExternalFilterPresent() {
    return true;
  }

  return (
    <LoadingOverlay loader={props.reportTableDataLoader || props.reportFilterLoader || props.reportFilterLoader}>
      {showTable && <Box component={Paper} mt={3}>
        <Box mt={3} display="flex" justifyContent="flex-end">
          <CustomButton
            onClick={async () => {
              await getDownloadData();
              downloadLink.current.link.click();
            }}
          >
            <DownloadIcon />
          </CustomButton>
          {downloadExcelLink(
            csvData,
            `${props.viewType}_${plan_period[0]}-${plan_period[1]}`,
            downloadLink,
            csvHeaders,
            "",
            ""
          )}
        </Box>

        {<AgGridComponent
          // columns={colDefs}
          // rowdata={rowData}
          tableRef={agTableRef}
          columns={reportTableColumns}
          rowdata={reportTableData}
          groupDisplayType={"groupRows"}
          minWidth={200}
          uniqueRowId="uniqueId"
          showSaveTableConfig={false}
          enablePivot={false}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          customSideBar={[
            {
              id: "show_hide_metrics",
              labelDefault: props.viewType === 'kpi' ? 'Show/Hide Categories' : 'Show/Hide Timeline',
              labelKey: props.viewType === 'kpi' ? 'Show/Hide Categories' : 'Show/Hide Timeline',
              iconKey: "menu",
              toolPanel: AddHideMetrics,
              height: 600,
              minHeight: 600,
              maxHeight: 600,
              toolPanelParams: {
                onChange: true,
                tableRef: agTableRef,
                showSnackMessage,
                setHiddenMetrics,
                hiddenMetrics,
                groupKeys: ["level", "department", "class"]
              },
            },
          ]}
        />}
      </Box>}
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    reportFilterLoader: store.plansmartReducer.masterPlanReducer.masterPlanFilterLoader,
    reportColDefLoader: store.plansmartReducer.reportReducer.reportColDefLoader,
    reportTableDataLoader: store.plansmartReducer.reportReducer.reportTableDataLoader,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  fetchReportKpiColumnConf: (payload) =>
    dispatch(fetchReportKpiColumnConf(payload)),
  fetchReportKpiTableData: (payload) =>
    dispatch(fetchReportKpiTableData(payload)),
  setReportFilterLoader: (payload) =>
    dispatch(setReportFilterLoader(payload)),
  setReportColDefLoader: (payload) =>
    dispatch(setReportColDefLoader(payload)),
  setReportTableDataLoader: (payload) =>
    dispatch(setReportTableDataLoader(payload)),

});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ReportTableComponent));
