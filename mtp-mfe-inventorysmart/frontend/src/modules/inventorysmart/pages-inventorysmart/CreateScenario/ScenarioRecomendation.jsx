import ComparisionKPICards from "./ComparisionKPICards";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { AllocationSummaryContainer } from "./AllocationSummaryContainer";
import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { displaySnackMessages } from "../inventorysmart-utility";
import {
  checkScenarioStatus,
  getAllocationSummary,
} from "../../services-inventorysmart/Create-Scenario/store-view-services";
import agGridColumnFormatter from "../../../../core/Utils/agGrid/column-formatter";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { EmptyState } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";
import globalStyles from "../../../../core/Styles/globalStyles";
import { ALLOCATION_COMPARE_EMPTY_HEADING } from "../../constants-inventorysmart/stringConstants";
import {
  buildScenarioSimBody,
  shouldFetchScenarioRecommendation,
} from "./scenarioCompareUtils";
function ScenarioRecomendation(props) {
  const [tableColumnConfig, setTableColumnConfig] = useState(null);
  const [allocationSummaryData, setAllocationSummaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Derive from config on first render so we do not mount the old tree then
  // remount the new one (that double-fires KPI tiles + product-view).
  // Allocation-compare URL always uses the old recommendation screen.
  const scenarioRecommendationNewFlow =
    !props.isReadOnlyCompare &&
    !!props.finalizeAllocationConfig?.scenarioRecommendationNewFlow;
  const agGridInstance = useRef(null);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const navigate = useNavigate();

  useEffect(() => {
    if (
      shouldFetchScenarioRecommendation({
        scenarioId: props.scenarioId,
        compareCodes: props.compareCodes,
      })
    ) {
      const getAllocationSummaryData = async () => {
        setAllocationSummaryData([]);
        props.setSaveDisabled(true);
        setIsLoading(true);
        const body = buildScenarioSimBody({
          scenarioId: props.scenarioId,
          compareCodes: props.compareCodes,
        });
        try {
          const checkScenarioStatusResponse = await props.checkScenarioStatus(
            body
          );
          if (!checkScenarioStatusResponse?.data?.data?.status) {
            props.setIsScenarioInvalid(true);
            displaySnackMessages(
              checkScenarioStatusResponse?.data?.data?.message,
              "error",
              props
            );
            setIsLoading(false);
            return;
          }
          props.setIsScenarioInvalid(false);

          // New flow: skip Allocation Summary table fetch.
          // Allocation-compare URL always uses the old screen.
          if (
            !props.isReadOnlyCompare &&
            props.finalizeAllocationConfig?.scenarioRecommendationNewFlow
          ) {
            return;
          }

          const allocationSummaryResponse = await props.getAllocationSummary(
            body
          );
          const allocationSummaryTableData =
            allocationSummaryResponse?.data?.data?.data?.table_data;
          const tempAllocationSummaryColumnConfig =
            allocationSummaryResponse?.data?.data?.data?.table_config;
          const allocationSummaryColumnConfig =
            agGridColumnFormatter(tempAllocationSummaryColumnConfig) || [];
          setAllocationSummaryData(allocationSummaryTableData);
          setTableColumnConfig(allocationSummaryColumnConfig);
        } catch (error) {
          console.error("Error fetching allocation summary:", error);
        } finally {
          props.setSaveDisabled(false);
          setIsLoading(false);
        }
      };
      getAllocationSummaryData();
    }
  }, []);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return (
    <>
      {props.isScenarioInvalid ? (
        <Loader loader={isLoading} minHeight={130}>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
          >
            <EmptyState
              description={
                props.isReadOnlyCompare
                  ? "Unable to load this allocation comparison. Please verify the allocation codes and try again."
                  : "The scenario is already deleted / finalized. Please complete the scenario creation process and try again."
              }
              heading={
                props.isReadOnlyCompare
                  ? ALLOCATION_COMPARE_EMPTY_HEADING
                  : "The scenario is not valid."
              }
              primaryButtonLabel={"Go to Dashboard"}
              onPrimaryButtonClick={() => {
                navigate("/inventory-smart/decision-dashboard");
              }}
            />
          </div>
        </Loader>
      ) : (
        <>
          {scenarioRecommendationNewFlow ? (
            <AllocationSummaryContainer
              inventorysmartScreenConfig={props.inventorysmartScreenConfig}
              {...props}
              middleContent={
                <ComparisionKPICards
                  {...props}
                  scenarioRecommendationNewFlow={
                    scenarioRecommendationNewFlow
                  }
                />
              }
            />
          ) : (
            <>
              <ComparisionKPICards
                {...props}
                scenarioRecommendationNewFlow={scenarioRecommendationNewFlow}
              />
              <Loader loader={isLoading} minHeight={130}>
                <div className={classes.marginTop24}>
                  <AgGridComponent
                    selectAllHeaderComponent={false}
                    pagination={false}
                    columns={tableColumnConfig}
                    loadTableInstance={loadTableInstance}
                    rowdata={allocationSummaryData}
                    tableHeader="Allocation Summary"
                    hideSelectCurrentPageRecords={true}
                    nestedTable={true}
                    sizeColumnsToFitFlag={true}
                    suppressFieldDotNotation
                    nestedTableComponent={
                      <AllocationSummaryContainer
                        inventorysmartScreenConfig={
                          props.inventorysmartScreenConfig
                        }
                        {...props}
                      />
                    }
                  />
                </div>
              </Loader>
            </>
          )}
        </>
      )}
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
    store.inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfig,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getAllocationSummary: (payload) => dispatch(getAllocationSummary(payload)),
    checkScenarioStatus: (payload) => dispatch(checkScenarioStatus(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ScenarioRecomendation);
