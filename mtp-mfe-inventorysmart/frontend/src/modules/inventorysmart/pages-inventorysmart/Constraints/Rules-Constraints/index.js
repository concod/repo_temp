import React, { useEffect, useRef, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import RulesConstraintListTable from "./rules-constraint-list-table";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  EDIT_RULES,
  EXCEPTION_SCREEN,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  downloadStoreConstraints,
  getRulesListData,
  saveEditedRules,
  saveRuleName,
  setRulesConstraintsFilterConfig,
  setRulesTableData,
  setRulesTableLoader,
  stateRulesDataOnServer,
  uploadRclConstraints,
  setRulesConstraintsConfigs,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import { updateBackedRules } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "./add-rcl-component";
import ChoiceViewComponent from "./choice-view";
import { Tabs, Button, useTranslation } from "impact-ui-v3";
import UploadHandler from "core/commonComponents/uploadHandler";
import { getColumnsAg } from "actions/tableColumnActions";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  IS_TAB_OVERRIDEN_WIDTH,
  CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "config/constants";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

const RulesConstraintComponent = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [tabValue, setTabValue] = useState(0);
  const [constraintRulesPayload, setConstraintRulesPayload] = useState([]);
  const onFilterDependency = useRef([]);
  const [tabNames, setTabNames] = useState([]);
  const [tabPanels, setTabPanels] = useState([]);
  const [uploadModalStatus, setUploadModalStatus] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [isUploadPending, setIsUploadPending] = useState(false);
  const [downloadTemplateCols, setDownloadTemplateCols] = useState([]);
  const [fileUploadInstructions, setFileUploadInstructions] = useState([]);
  const [
    rulesConstraintColumnsFromParent,
    setRulesConstraintColumnsFromParent,
  ] = useState(null);

  const validationHandler = useRef();

  const downloadStoreConstraints = async () => {
    let payload = cloneDeep(constraintRulesPayload);
    delete payload?.meta?.limit;
    try {
      let response = await props.storeConstraintsDownload(payload);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      const getInitialFilterConfiguration = async () => {
        try {
          let response = await fetchFilterConfig("Rules Constraints");
          props?.setRulesConstraintsFilterConfig(response);
        } catch (e) {
          handleErrorMessage(e, props);
        }
      };
      getInitialFilterConfiguration();
      let payload = {
        module_code: 5002,
      };
      //fetch excel headers
      let download_template_cols = await getColumnsAg(
        "table_name=constraints_template_download"
      )();

      let cols = [];
      download_template_cols.map((item) => {
        cols.push({
          label: item.label,
          key: item.column_name,
        });
      });
      setDownloadTemplateCols(cols);

      try {
        const rules_constraint_cols = await getColumnsAg(
          "table_name=rules_constraint_table"
        )();
        setRulesConstraintColumnsFromParent(rules_constraint_cols);
      } catch (e) {
        handleErrorMessage(e, props);
      }
      //fetch file upload validations
      let uploadInstructions = await props?.tenantConfigApiCache(1, {
        attribute_name: "rcl_upload_instructions",
      });
      uploadInstructions = uploadInstructions?.data?.data[0]?.attribute_value;
      setFileUploadInstructions(uploadInstructions);
    };
    onLoad();
    fetchModuleConfigs();
    return () => {
      // props?.resetProductProfile();
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(props.notificationData)) {
      getRecentNotifications();
    }
  }, [props.notificationData]);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.rulesConstraintsFilterConfig)
    ) {
      // props.setProductProfileDashboardLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.rulesConstraintsFilterConfig),
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
              saved_filter_screen_name: "Rules Constraints",
              update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "rulesConstraintsFilterConfig",
            filterConfigData,
            "Rules Constraints"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err, props);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.rulesConstraintsFilterConfig, props.savedFilterSelection]);

  const getRecentNotifications = () => {
    // Keep only notifications from the last 5 minutes in state (recentNotifications).
    // Rationale: sometimes a "pending" upload notification arrives, but the follow-up
    // "success"/"failed" notification never reaches the client. Limiting to recent
    // notifications prevents stale "pending" entries from disabling edits indefinitely.
    let allNotificationsList = cloneDeep(props.notificationData);
    if (!isEmpty(allNotificationsList)) {
      const currentMs = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;

      const toEpochMs = (value) => {
        if (isNull(value) || isUndefined(value)) return 0;
        if (typeof value === "number") {
          // Handle seconds vs milliseconds
          return value < 1e12 ? value * 1000 : value;
        }
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      const filtered = allNotificationsList.filter((n) => {
        const createdAtMs = toEpochMs(n?.created_at);
        return (
          createdAtMs > 0 &&
          createdAtMs <= currentMs &&
          currentMs - createdAtMs <= fiveMinutesMs
        ); // check if notification creation time is within 5 mins back from current time and return if it is true.
      });
      setRecentNotifications(filtered);
    } else {
      setRecentNotifications([]);
    }
  };

  useEffect(() => {
    getRecentNotifications();
    const intervalId = setInterval(() => {
      getRecentNotifications();
    }, 300000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    checkPendingNotifications();
  }, [recentNotifications]);

  const fetchModuleConfigs = async () => {
    try {
      let reqBody = {
        module_name: "rules_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setRulesConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const checkPendingNotifications = () => {
    let recentNotificationsList = cloneDeep(recentNotifications);
    let pendingNotifications = [];
    let resolvedNotifications = [];
    recentNotificationsList.map((item) => {
      if (item.extra_attributes?.notification_type === "Upload Constraints") {
        if (item.extra_attributes?.status === "pending") {
          pendingNotifications.push(item);
        } else {
          resolvedNotifications.push(item);
        }
      }
    });
    const resolvedIds = new Set(
      resolvedNotifications
        .map((n) => n?.extra_attributes?.notification_id)
        .filter((id) => !!id)
    );
    const pendingOnly = pendingNotifications.filter(
      (n) => !resolvedIds.has(n?.extra_attributes?.notification_id)
    );
    if (pendingOnly?.length > 0) {
      if (!isUploadPending) {
        displaySnackMessages(
          t("inventorysmart.rclUploadInProgressWarning"),
          "info",
          props
        );
      }
      setIsUploadPending(true);
    } else {
      setIsUploadPending(false);
    }
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    // Reset tab value to first tab when filters are applied
    setTabValue(0);
    onFilterDependency.current = dependencyData;
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setRulesTableLoader(true);
    let body = {
      meta: tableConfigurationMetaData.meta,
      filters: !isEmpty(dependency) ? dependency : [],
    };
    setOnFilterReqBody(body);
  };

  const saveDataOnApply = () => {
    updateBackedRules(props);
  };

  const navigateToExceptionScreen = () => {
    props.history.push(EXCEPTION_SCREEN);
  };

  const handleManageRcl = () => {
    sessionStorage.setItem("isOMSConstraintsFlow", "false");
    sessionStorage.setItem("isConstraintsFlow", "true");
    props?.history?.push(EDIT_RULES);
    localStorage.removeItem("rclCreatedTableName");
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    payload,
    agGridInstance
  ) => {
    if (column.colId === "rule_name") {
      saveDataOnApply();
      let payload = {
        rule_name: params?.target?.value,
        rule_code: row?.rule_code,
      };
      props?.setRulesTableLoader(true);
      let response = await saveRuleName(payload);
      if (response?.data?.message)
        displaySnackMessages(response?.data?.message, "success", props);
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
      props?.setRulesTableLoader(false);
    }
  };

  const addExtraButton = () => {
    if (!onFilterDependency?.current?.length || !props.isFilterApplied) {
      return [];
    }
    let extraButtons = [];
    if (
      props.rulesConstraintsConfigs?.headerButtons?.includes(
        "uploadRclConstraints"
      )
    ) {
      extraButtons.push(
        <Button
          id="uploadRclConstraints"
          variant="primary"
          onClick={() => {
            setUploadModalStatus(true);
          }}
          disabled={isUploadPending}
        >
          {t("inventorysmart.rclUploadButton")}
        </Button>
      );
    }

    if (
      props.rulesConstraintsConfigs?.headerButtons?.includes(
        "editRclConstraints"
      )
    ) {
      extraButtons.push(
        <Button
          id="editRclConstraints"
          variant="secondary"
          onClick={handleManageRcl}
          disabled={isUploadPending}
        >
          {t("inventorysmart.rclManageRclButton")}
        </Button>
      );
    }
    if (
      props.rulesConstraintsConfigs?.headerButtons?.includes("ManageException")
    ) {
      extraButtons.push(
        <Button
          id="create-product-profile"
          onClick={() => navigateToExceptionScreen()}
          variant="secondary"
        >
          {t("inventorysmart.rclManageExceptionButton")}
        </Button>
      );
    }
    return extraButtons;
  };

  const renderActionButtonsRow = () => {
    const actionButtons = addExtraButton();
    if (!actionButtons.length || !onFilterDependency?.current?.length || !props.isFilterApplied) {
      return null;
    }

    return (
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd}`}
        style={{ gap: "12px", marginBottom: "12px" }}
      >
        {actionButtons}
      </div>
    );
  };

  const getEmptyStateButtons = () => {
    if (onFilterDependency?.current?.length) {
      return null;
    }

    let emptyStateButtons = [];

    if (
      props.rulesConstraintsConfigs?.headerButtons?.includes(
        "editRclConstraints"
      )
    ) {
      emptyStateButtons.push(
        <Button
          key="manage-rcl-empty"
          id="editRclConstraints-empty"
          variant="tertiary"
          onClick={handleManageRcl}
          disabled={isUploadPending}
          size="large"
        >
          {t("inventorysmart.rclManageRclButton")}
        </Button>
      );
    }

    if (
      props.rulesConstraintsConfigs?.headerButtons?.includes("ManageException")
    ) {
      emptyStateButtons.push(
        <Button
          key="manage-exception-empty"
          id="create-product-profile-empty"
          onClick={() => navigateToExceptionScreen()}
          variant="tertiary"
          size="large"
        >
          {t("inventorysmart.rclManageExceptionButton")}
        </Button>
      );
    }

    if (emptyStateButtons.length === 0) {
      return null;
    }

    return (
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {emptyStateButtons}
      </div>
    );
  };

  useEffect(() => {
    const tabNames = [
      { label: props?.dynamicLabels?.store_allocation, value: 0 },
    ];
    const tabPanels = [
      <RulesConstraintListTable
        selectedDependencyValue={onFilterReqBody}
        history={props?.history}
        module={props?.module}
        screenName={props.screenName}
        callRulesSaveOnBlur={(params, row, column, payload, agGridInstance) =>
          saveRuleNameOnBlur(params, row, column, payload, agGridInstance)
        }
        setConstraintRulesPayload={setConstraintRulesPayload}
        constraintRulesPayload={constraintRulesPayload}
        downloadStoreConstraints={downloadStoreConstraints}
        applyButton={
          props?.getSavedEditedRules?.length > 0 ? (
            <Button
              id="applyStore-id"
              onClick={() => saveDataOnApply()}
              variant="primary"
              size="large"
            >
              Apply
            </Button>
          ) : null
        }
        isUploadPending={isUploadPending}
        rulesConstraintColumnsFromParent={rulesConstraintColumnsFromParent}
      />,
    ];
    if (props.showChoiceView) {
      tabNames.push({ label: props?.dynamicLabels?.choice_view, value: 1 });
      tabPanels.push(
        <ChoiceViewComponent
          parentFilterConfig={onFilterDependency.current}
          {...props}
          displaySnackMessages={displaySnackMessages}
        />
      );
    }
    setTabNames(tabNames);
    setTabPanels(tabPanels);
  }, [
    onFilterReqBody,
    props.getSavedEditedRules,
    constraintRulesPayload,
    isUploadPending,
    rulesConstraintColumnsFromParent,
  ]);

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file?.[0]?.file);

      const res = await props.uploadRclConstraints(formData);
      props.addSnack({
        message:
          res.message || t("inventorysmart.rclUploadNotificationPending"),
        options: {
          variant: "success",
        },
      });
      setIsUploadPending(true);
      setUploadModalStatus(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message:
            error?.data?.message || t("inventorysmart.rclSomethingWentWrong"),
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  return (
    <>
      {!isEmpty(downloadTemplateCols) && (
        <UploadHandler
          handleUpload={handleUpload}
          isModalOpen={uploadModalStatus}
          setIsModalOpen={(val) => {
            setUploadModalStatus(val);
          }}
          attachCallBacks={attachCallBacks}
          jsonUpload={false}
          templateConfig={[...downloadTemplateCols]}
          uploadInstructions={fileUploadInstructions || []}
          tenantUploadConfig={{}}
          templateName={t("inventorysmart.rclConstraintsTemplateName")}
          attachValidationsInTemplate={true}
        />
      )}
      <div style={{ marginTop: CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          showFilterDashboard={true}
          filterConfigKey={"rulesConstraintsFilterConfig"}
          onApplyFilter={(dependencyData, filterData) =>
            onFilterDashboardClick(dependencyData, filterData)
          }
          renderAboveFilterDashboard={renderActionButtonsRow()}
          renderCustomComponent={true}
          returnCustomComponent={getEmptyStateButtons}
          autoHideFilterButton={true}
        >
          {onFilterDependency?.current?.length > 0 && (
            <Loader loader={props.rulesTableLoader}>
              <div className={globalClasses.marginVertical1rem}>
                {tabNames.length > 1 ? (
                  <CustomAccordion
                    label={props?.dynamicLabels?.store_allocation}
                    defaultExpanded={true}
                  >
                    <Tabs
                      sx={
                        tabValue === 1 ? { width: IS_TAB_OVERRIDEN_WIDTH } : {}
                      }
                      value={tabValue}
                      onChange={handleChangeTabValue}
                      aria-label="constraint-rules-tabs"
                      tabNames={tabNames}
                      tabPanels={tabPanels}
                    ></Tabs>
                  </CustomAccordion>
                ) : (
                  tabPanels[0]
                )}
              </div>
            </Loader>
          )}
        </CoreComponentScreen>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    rulesTableLoader:
      inventorysmartReducer.rulesConstraintsReducer.rulesTableLoader,
    rulesConstraintsFilterConfig:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.rulesConstraintsFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "rulesConstraintsFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    rulesConstraintsConfigs:
      inventorysmartReducer.rulesConstraintsReducer.rulesConstraintsConfigs,
    getSavedEditedRules:
      inventorysmartReducer?.rulesConstraintsReducer.editedRules,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_product_supersession_v3,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    showChoiceView:
      store.inventorysmartReducer.rulesConstraintsReducer
        .rulesConstraintsConfigs?.showChoiceView,
    notificationData: store.notificationReducer.notificationData,
    isFilterApplied: filterReducer.isFilterApplied,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setRulesConstraintsFilterConfig: (body) =>
      dispatch(setRulesConstraintsFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setRulesTableLoader: (body) => dispatch(setRulesTableLoader(body)),
    getRulesListData: (body) => dispatch(getRulesListData(body)),
    setRulesTableData: (body) => dispatch(setRulesTableData(body)),
    saveEditedRules: (body) => dispatch(saveEditedRules(body)),
    stateRulesDataOnServer: (body) => dispatch(stateRulesDataOnServer(body)),
    storeConstraintsDownload: (body) =>
      dispatch(downloadStoreConstraints(body)),
    uploadRclConstraints: (body) => dispatch(uploadRclConstraints(body)),
    tenantConfigApiCache: (application, queryParam) =>
      dispatch(tenantConfigApiCache(application, queryParam)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setRulesConstraintsConfigs: (body) =>
      dispatch(setRulesConstraintsConfigs(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RulesConstraintComponent);
