import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep } from "lodash";
import Loader from "core/Utils/Loader/loader";
import ExceptionStoresListTable from "../../Exceptions-stores/excpetion_constraints_list_component";
import { KPICardComponent } from "./KPICardComponent";
import { useKpiCardStyles } from "./kpiCardStyles";
import {
  EXCEPTION_SUMMARY_DUMMY_DATA,
  EXCEPTION_SUMMARY_CARD_IDS,
  CARD_ID_TO_STATUS,
  mapExceptionSummaryResponse,
} from "./exceptionCardConstants";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  tableConfigurationMetaData,
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  saveEditedExceptions,
  saveSetAllModalData,
  saveStateAfterExceptionUpdate,
  setExceptionTableLoader,
  setSelectedExceptionList,
  setExceptionConfigs,
  getExceptionSummary,
  setExceptionSummaryData,
  setExceptionSummaryLoader,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { addSnack } from "core/actions/snackbarActions";
import { validateConstraintFields } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { SUMMARY_FETCH_LIMIT } from "./kpiCardConstants";
import globalStyles from "core/Styles/globalStyles";

const ExceptionComponent = (props) => {
  const globalClasses = globalStyles();
  const kpiClasses = useKpiCardStyles();
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const onFilterDependency = useRef([]);
  const [selectedExceptionCardId, setSelectedExceptionCardId] = useState(
    EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES
  );

  useEffect(() => {
    fetchExceptionConfigs();
    fetchConstraintConfigs();
  }, []);

  useEffect(() => {
    const filterDependency = props.filterDependency || [];
    if (filterDependency.length > 0) {
      onFilterDependency.current = filterDependency;
      props.setExceptionTableLoader(true);
      props.setExceptionSummaryLoader(true);
      setSelectedExceptionCardId(EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES);
      const body = {
        meta: tableConfigurationMetaData.meta,
        filters: [...filterDependency],
        status: CARD_ID_TO_STATUS[EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES],
      };
      setOnFilterReqBody(body);
      fetchExceptionSummary(filterDependency);
    }
  }, [props.filterDependency]);

  const fetchExceptionConfigs = async () => {
    try {
      const reqBody = {
        module_name: "exception_configs",
        screen_name: props.screenName,
      };
      const response = await props.getModuleBasedTenantConfig(reqBody);
      props.setExceptionConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const fetchConstraintConfigs = async () => {
    try {
      const reqBody = {
        module_name: "inventorysmart_constraints_configs",
        screen_name: props.screenName,
      };
      const response = await props.getModuleBasedTenantConfig(reqBody);
      props.setConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const onExceptionCardSelect = (cardId) => {
    if (cardId === selectedExceptionCardId) return;
    setSelectedExceptionCardId(cardId);
    props.setExceptionTableLoader(true);
    const status = CARD_ID_TO_STATUS[cardId] || "all";
    setOnFilterReqBody((prev) => ({
      ...prev,
      status,
    }));
  };

  const fetchExceptionSummary = async (filters) => {
    try {
      props.setExceptionSummaryLoader(true);
      const payload = {
        meta: {
          search: [],
          range: [],
          sort: [],
          limit: { limit: SUMMARY_FETCH_LIMIT, page: 1 },
        },
        filters: filters,
        selection: {
          data: [{ checkedRows: [] }],
          unique_columns: ["key"],
        },
      };
      const response = await getExceptionSummary(payload);
      if (response?.data?.data) {
        props.setExceptionSummaryData(response.data.data);
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setExceptionSummaryLoader(false);
    }
  };

  const saveDataOnApply = () => {
    const updateBackedRules = async () => {
      const constraintValidationChecks = validateConstraintFields(
        cloneDeep(props.savedEditedExceptions)
      );

      if (constraintValidationChecks?.inValidDate?.length > 0) {
        displaySnackMessages(
          `Invalid Date found in ${constraintValidationChecks.inValidDate}`,
          "error",
          props
        );
        return;
      }
      if (constraintValidationChecks?.nullValues?.length > 0) {
        displaySnackMessages(
          `Null values found in ${constraintValidationChecks.nullValues}`,
          "error",
          props
        );
        return;
      } else {
        const promises = props?.savedEditedExceptions.map(
          async (editedRos) => await saveSetAllModalData(editedRos)
        );
        props?.setExceptionTableLoader(true);
        props?.saveStateAfterExceptionUpdate(false);
        Promise.all(promises)
          .then((results) => {
            let tempResult = results.map((result) => {
              return result.data.status;
            });
            if (tempResult.includes(false)) {
              displaySnackMessages(ERROR_MESSAGE, "error", props);
            } else {
              props?.saveStateAfterExceptionUpdate(true);
              displaySnackMessages(UPDATED_MESSAGE, "success", props);
            }
            props?.setExceptionTableLoader(false);
            props?.saveEditedExceptions([]);
            props?.setSelectedExceptionList([]);
          })
          .catch((error) => {
            props?.setExceptionTableLoader(false);
            handleErrorMessage(error, props);
            props?.saveEditedExceptions([]);
          });
      }
    };
    updateBackedRules();
  };
  
  const filtersApplied = (props.filterDependency || []).length > 0;

  return (
    <>
      {filtersApplied && (
        <div className={globalClasses.marginTop_8}>
          <Loader loader={props.exceptionSummaryLoader}>
            <KPICardComponent
              summaryData={
                Object.keys(props.exceptionSummaryData || {}).length
                  ? mapExceptionSummaryResponse(props.exceptionSummaryData)
                  : EXCEPTION_SUMMARY_DUMMY_DATA
              }
              title="All Rules"
              selectedCardId={selectedExceptionCardId}
              onCardSelect={onExceptionCardSelect}
            />
          </Loader>
          <div className={kpiClasses.detailsSection}>
            <Loader loader={props.exceptionTableLoader}>
              {Object.keys(props.exceptionConfigs || {}).length > 0 &&
                Object.keys(props.constraintsConfigs || {}).length > 0 && (
                  <ExceptionStoresListTable
                    history={props?.history}
                    selectedDependencyValue={onFilterReqBody}
                    module={props?.module}
                    isNewConstraintsFlow={props.isNewConstraintsFlow}
                    onApply={saveDataOnApply}
                  />
                )}
            </Loader>
          </div>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    exceptionTableLoader:
      inventorysmartReducer.exceptionConstraintsReducer.exceptionLoader,
    exceptionSummaryData:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionSummaryData,
    exceptionSummaryLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionSummaryLoader,
    savedEditedExceptions:
      inventorysmartReducer?.exceptionConstraintsReducer?.savedEditedExceptions,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    constraintsConfigs:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
  saveEditedExceptions: (data) => dispatch(saveEditedExceptions(data)),
  setSelectedExceptionList: (data) => dispatch(setSelectedExceptionList(data)),
  saveStateAfterExceptionUpdate: (data) =>
    dispatch(saveStateAfterExceptionUpdate(data)),
  setExceptionConfigs: (body) => dispatch(setExceptionConfigs(body)),
  setConstraintsConfigs: (payload) => dispatch(setConstraintsConfigs(payload)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setExceptionSummaryData: (data) => dispatch(setExceptionSummaryData(data)),
  setExceptionSummaryLoader: (loading) => dispatch(setExceptionSummaryLoader(loading)),
});

const ConnectedExceptionComponent = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExceptionComponent);

export { ConnectedExceptionComponent as ExceptionComponent };
