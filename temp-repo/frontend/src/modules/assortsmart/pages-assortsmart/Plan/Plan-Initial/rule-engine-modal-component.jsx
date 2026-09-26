import { useEffect, useRef, useState } from "react";
import { Typography } from "@mui/material";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { getColumnsAg } from "core/actions/tableColumnActions";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import { fetchRuleEngineCarryoverData } from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";

const RuleEngineModal = (props) => {
  const [showLoader, setShowLoader] = useState(false);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);
  const RuleEngineInstance = useRef({});
  useEffect(() => {
    setShowLoader(true);
    const fetchData = async () => {
      let reoptimizeResponse = await props.updateCarryover();
      if (reoptimizeResponse) {
        props.fetchCarryOverTableData(props.selectedTab);
        let cols = await getColumnsAg(
          "table_name=carryover_rule_engine_selection",
          props.columnHeaderJson
        )();
        // Disable checkbox
        cols.map((col) => {
          if (col.type === "bool") {
            col.cellRenderer = (instance) => {
              col.disabled = true;
              let cellData = { ...instance };
              return (
                <CellRenderers cellData={cellData} column={col}></CellRenderers>
              );
            };
          }
        });
        setColumns(cols);
        if (cols?.length) {
          const planDetailsData = props.planDetails?.data;
          let payload = {
            filters: [
              {
                attribute_name: "l0_name",
                value: planDetailsData?.l0_name,
                prefix: "rule_level",
                operator: "in",
              },
              {
                attribute_name: "l1_name",
                value: planDetailsData?.l1_name,
                prefix: "rule_level",
                operator: "in",
              },
              {
                attribute_name: "l2_name",
                value: planDetailsData?.l2_name,
                prefix: "rule_level",
                operator: "in",
              },
              {
                attribute_name: "l3_name",
                value: [props.selectedL3FilterValue?.value],
                prefix: "rule_level",
                operator: "in",
              },
            ],
          };
          const ruleEngineDataResponse = await props.fetchRuleEngineCarryoverData(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          setShowLoader(false);
          if (ruleEngineDataResponse?.data?.status) {
            let selectedRows = [];
            ruleEngineDataResponse?.data?.data.map((data) => {
              selectedRows.push(data.rule_id);
              data.rule_enabled = data.is_active;
              data.condition_value =
                data?.column_value?.operator + data?.column_value?.value;
            });
            setTableData(ruleEngineDataResponse?.data?.data);
            setSelectedRules(selectedRows);
          }
        }
      }
    };
    fetchData();
  }, []);

  const loadTableInstance = (params) => {
    RuleEngineInstance.current = params;
  };

  return (
    <>
      <ConfirmPrompt
        showModal={props.showRuleEnginePopup}
        message=""
        title="Rules"
        aria-labelledby="customized-dialog-title"
        showCloseIcon={true}
        size="lg"
        hideActionFooter={true}
        setConfirm={props.setShowRuleEnginePopup}
      >
        <LoadingOverlay loader={showLoader} spinner>
          <Typography>
            <AgGridTable
              columns={columns}
              rowdata={tableData}
              sideBar={false}
              selectedRows={selectedRules}
              loadTableInstance={loadTableInstance}
              sizeColumnsToFitFlag
            />
          </Typography>
        </LoadingOverlay>
      </ConfirmPrompt>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchRuleEngineCarryoverData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(RuleEngineModal));
