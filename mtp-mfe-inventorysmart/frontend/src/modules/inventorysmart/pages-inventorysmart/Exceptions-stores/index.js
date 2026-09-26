import React, { useEffect, useState, useRef } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import PropTypes from "prop-types";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import ExceptionStoresListTable from "./excpetion_constraints_list_component";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { Grid, Paper } from "@mui/material";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import {
  getExceptionListData,
  saveEditedExceptions,
  saveSetAllModalData,
  saveStateAfterExceptionUpdate,
  setExceptionFilterConfig,
  setExceptionTableData,
  setExceptionTableLoader,
  setSelectedExceptionList,
  setExceptionConfigs
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  APP_NAME,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  ROLES_ACCESS_MODULES_MAPPING,
  UPDATED_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { EDIT_CREATE_EXCEPTION_SCREEN } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useExceptionStyles } from "./exceptionStyles";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setFilterConfiguration } from "core/actions/filterAction";
import globalStyles from "core/Styles/globalStyles";
import moment from "moment";
import { validateConstraintFields } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import { CONSTRAINTS } from "../../constants-inventorysmart/routesConstants";
import { Button, useTranslation} from "impact-ui-v3";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";

const ExceptionsStore = (props) => {
  const { t } = useTranslation();
  const exceptionClassName = useExceptionStyles();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const onFilterDependency = useRef([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Exception Constraints");
        props?.setExceptionFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    getInitialFilterConfiguration();
    fetchExceptionConfigs();
    fetchConstraintConfigs();
    return () => {};
  }, []);

  useEffect(() => {
    fetchModulesAccess();
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.exceptionFiltersConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.exceptionFiltersConfig),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "exceptionFiltersConfig",
            filterConfigData,
            "Exception Constraints Dashboard"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err, props);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.exceptionFiltersConfig, props.savedFilterSelection]);

  const fetchExceptionConfigs = async () => {
    try {
      let reqBody = {
        module_name: "exception_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setExceptionConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const fetchConstraintConfigs = async () => {
    try {
      let reqBody = {
        module_name: "inventorysmart_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const fetchModulesAccess = async () => {
    try {
      const module = props.module;
      const subModules = ROLES_ACCESS_MODULES_MAPPING[module];
      let rolesBasedModulesPermission = {};

      props.setInventorySmartPermissionLoader(true);

      if (props.inventorysmartScreenConfig?.roleBasedAccess) {
        const accessDataResponse = await getModuleLevelAccessUtility({
          app: APP_NAME,
          module: subModules,
        })();

        rolesBasedModulesPermission = Object.fromEntries(
          Object.entries(accessDataResponse).map(([module, actions]) => [
            module,
            Object.keys(actions),
          ])
        );
      } else {
        subModules.map(async (subModule) => {
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
        });
      }

      props.setInventorySmartModulesPermissions({
        [module]: rolesBasedModulesPermission,
      });
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setExceptionTableLoader(true);
    let body = {
      meta: tableConfigurationMetaData.meta,
      filters: [...dependency],
    };
    setOnFilterReqBody(body);
    props.setExceptionTableLoader(false);
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
            let tempResult = results.map((result, index) => {
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

  const navigateToExceptionScreen = () => {
    props.history.push(EDIT_CREATE_EXCEPTION_SCREEN);
  };

  const breadcrumbOptions = [
    {
      label: t("inventorysmart.exceptionsHome"),
      to: "/home",
    },
    {
      label: t("inventorysmart.exceptionsConstraints"),
      id: 1,
      action: () => {
        props.history.push(CONSTRAINTS);
      },
    },
    {
      label: t("inventorysmart.exceptionsManageExceptions"),
      id: 2,
    },
  ];
  return (
    <>
      <div className={`${globalClasses.paddingAround}`}>
        <CoreComponentScreen
          pageLabel={t("inventorysmart.exceptionsManageExceptions")}
          showPageHeader={true}
          showFilterDashboard={true}
          filterConfigKey={"exceptionFiltersConfig"}
          onApplyFilter={onFilterDashboardClick}
          headerBreadCrumb={<HeaderBreadCrumbs options={breadcrumbOptions} />}
          extraButtons={
            onFilterDependency?.current?.length > 0
              ? [
                  <Button
                    id="create-product-profile"
                    onClick={() => navigateToExceptionScreen()}
                    variant="primary"
                  >
                    {t("inventorysmart.exceptionsAddExceptions")}
                  </Button>,
                ]
              : []
          }
          autoHideFilterButton={true}
          emptyStateProps={{
            onSecondaryButtonClick: () => {
              navigateToExceptionScreen();
            },
            secondaryButtonLabel: t("inventorysmart.exceptionsAddExceptions"),
          }}
        />

        {onFilterDependency?.current?.length > 0 && (
          <div>
            {/* <CustomAccordion
              label="Exception"
              defaultExpanded={true}
              className={classes.rules_accordion}
            > */}
            {/* <Tabs
                value={tabValue}
                aria-label="exception-stores-table"
                style={{ borderTop: 0 }}
                onChange={handleChangeTabValue}
              >
                <Tab label="Exception" />
              </Tabs> */}
            <Loader loader={props.exceptionTableLoader}>
              <ExceptionStoresListTable
                history={props?.history}
                selectedDependencyValue={onFilterReqBody}
                module={props?.module}
                applyButton={
                  props?.savedEditedExceptions?.length > 0 ? (
                    <Button
                      id="create-product-profile"
                      onClick={() => saveDataOnApply()}
                      variant="primary"
                      size="large"
                    >
                      {t("inventorysmart.exceptionsApply")}
                    </Button>
                  ) : null
                }
              />
            </Loader>
            {/* </CustomAccordion> */}
          </div>
        )}
      </div>
      <div
        className={`${customClasses.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
      >
        <Button
          variant="tertiary"
          onClick={() => {
            props?.history?.push({
              pathname: CONSTRAINTS,
            });
          }}
        >
          {t("inventorysmart.exceptionsBack")}
        </Button>
      </div>
    </>
  );
};

ExceptionsStore.propTypes = {
  exceptionFiltersConfig: PropTypes.any,
  filterDashboardConfiguration: PropTypes.any,
  history: PropTypes.any,
  inventorysmartScreenConfig: PropTypes.shape({
    roleBasedAccess: PropTypes.any,
  }),
  savedFilterSelection: PropTypes.any,
  screenName: PropTypes.any,
  setExceptionFilterConfig: PropTypes.func,
  setExceptionTableLoader: PropTypes.func,
  setFilterConfiguration: PropTypes.func,
  tenantFilterUamConfig: PropTypes.any,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    exceptionTableLoader:
      inventorysmartReducer.exceptionConstraintsReducer.exceptionLoader,
    exceptionFiltersConfig:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.exceptionFiltersConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["exceptionFiltersConfig"],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    savedEditedExceptions:
      inventorysmartReducer?.exceptionConstraintsReducer?.savedEditedExceptions,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setExceptionFilterConfig: (filterConfiguration) =>
      dispatch(setExceptionFilterConfig(filterConfiguration)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    getExceptionListData: (body) => dispatch(getExceptionListData(body)),
    setExceptionTableData: (body) => dispatch(setExceptionTableData(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    saveEditedExceptions: (data) => dispatch(saveEditedExceptions(data)),
    setSelectedExceptionList: (data) =>
      dispatch(setSelectedExceptionList(data)),
    saveStateAfterExceptionUpdate: (data) =>
      dispatch(saveStateAfterExceptionUpdate(data)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setExceptionConfigs: (body) => dispatch(setExceptionConfigs(body)),
    setConstraintsConfigs: (payload) =>
      dispatch(setConstraintsConfigs(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ExceptionsStore);
