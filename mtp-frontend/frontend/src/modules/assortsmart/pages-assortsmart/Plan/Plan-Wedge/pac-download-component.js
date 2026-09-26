import React, { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import { bindActionCreators } from "redux";
import {
  fetchPacDownloadTableData,
  updateArticleDetails,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  displaySnackMessage,
  generateDropDownOptions,
} from "./plan-wedge-functions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";

const PacDownloadComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const classes = useStyles();
  const PacInstance = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      let pacColumns = await getColumnsAg(
        "table_name=assort_pac_download",
        props.columnHeaderJson
      )();
      if (props?.planMetricsData?.[0]?.choice_name?.length > 0) {
        pacColumns.forEach((col) => {
          if (col.column_name === "choice_name") {
            col.options = generateDropDownOptions(
              props?.planMetricsData?.[0]?.choice_name
            );
          }
        });
      }
      setColumns(pacColumns);
    };
    fetchData();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setShowLoader(true);
      let res = await props.fetchPacDownloadTableData(
        {},
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        pageIndex,
        10,
        props.planDetails?.data?.plan_code
      );
      setShowLoader(false);
      res.data.data.map((rowData) => {
        rowData["article_number"] = rowData.attribute_value.article_number;
        rowData["colorway_status"] = rowData.attribute_value.colorway_status;
        rowData["style_status"] = rowData.attribute_value.style_status;
      });
      setTableData(res.data.data);
      return {
        data: res.data?.data,
        totalCount: res?.data?.total,
      };
    } catch (error) {
      //Error handling
      setShowLoader(false);
      displaySnackMessage("Something went wrong", error, props.addSnack);
    }
  };

  const updateTableData = async (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    let newValue = initValue;
    let columnId = column.colDef.accessor;
    let tempData = [];
    PacInstance.current.api.forEachNode((eachRow) => {
      eachRow = eachRow.data;
      if (eachRow.article_number === data.article_number) {
        eachRow[columnId] = newValue;
      }
      tempData.push(eachRow);
    });
    PacInstance.current.api.refreshCells({
      update: tempData,
    });
  };

  const handleUpdateArticleDetails = async () => {
    let isDuplicateChoice = callValidation();
    if (isDuplicateChoice) {
      displaySnackMessage(
        "Choice name cannot be same",
        "error",
        props.addSnack
      );
      return;
    }
    setShowLoader(true);
    let article_details_data = [];
    tableData.map((rowData) => {
      article_details_data.push({
        plan_code: props.planDetails.data?.plan_code,
        article_number: rowData.article_number,
        choice_name: rowData.choice_name,
      });
    });
    let updateResponse = await props.updateArticleDetails(
      { article_details_data },
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    setShowLoader(false);
    if (updateResponse?.data?.data?.status) {
      props.setShowPacDownloadModal(false);
      props.setCallWedge(true);
    }
  };

  const callValidation = () => {
    const checkDuplicateChoiceName = tableData
      .map((obj) => obj.choice_name)
      .filter((obj, index, choiceArr) => choiceArr.indexOf(obj) !== index);
    if (checkDuplicateChoiceName?.length) {
      return true;
    }
    return false;
  };

  const loadTableInstance = (params) => {
    PacInstance.current = params;
  };

  return (
    <React.Fragment>
      <LoadingOverlay loader={showLoader} spinner>
        <div className={`${classes.choiceTable} choiceViewTable`}>
          <AgGridTable
            columns={columns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            loadTableInstance={loadTableInstance}
            uniqueRowId="article_number"
            onBlur={updateTableData}
            pagination={true}
            cacheBlockSize={10}
            sizeColumnsToFitFlag
            adjustTableHeight={true}
            staticColId={true}
          />
        </div>
        <div className={classes.choiceActionDiv}>
          <Button
            variant="contained"
            color="primary"
            title={"Save"}
            id={"save"}
            onClick={() => handleUpdateArticleDetails()}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
            disabled={!columns?.length}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            title={"Cancel"}
            id={"cancel"}
            onClick={() => props.setShowPacDownloadModal(false)}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Cancel
          </Button>
        </div>
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchPacDownloadTableData,
      updateArticleDetails,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PacDownloadComponent));
