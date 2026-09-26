import PropTypes from "prop-types";
import React, { useEffect, useState, useRef, useMemo } from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import TableSkeletonOverlay from "modules/inventorysmart/pages-inventorysmart/Common/components/TableSkeletonOverlay";
import { connect } from "react-redux";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep } from "lodash";
import { Prompt, useTranslation } from "impact-ui-v3";
import {
  deleteRclRules,
  getRclList,
  setActiveRclStep,
  setRclAddHierarchiesRule,
  setRulesTableLoader,
  setSelectedRulesToDelete,
  setRclList,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  Add_RCL,
  CONSTRAINTS,
  CONFIGURATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Link } from "@mui/material";
import {
  common,
  INVENTORY_SUBMODULES_NAMES,
} from "../../../constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "../../../../../core/Utils/utils";
import { useLocation } from "react-router-dom-v5-compat";
import { useHistory } from "react-router";
import { handleErrorMessage } from "./add-rcl-component";
import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { Button } from "impact-ui-v3";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { OMS_CONSTRAINTS_RCL_TABLE_NAME } from "modules/oms/constants-oms/constraintsAPIConstants";
import {
  getViewportPageSize,
  getGridHeightCap,
} from "modules/oms/utils-oms/agGridPageSize";
import { trackVendorConstraints } from "modules/oms/pages-oms/Constraints/VendorConstraints/utils";

const RCL_PAGE_CHROME_OFFSET = 350;

const EditRulesComponent = (props) => {
  const { t } = useTranslation();
  const pageSize = useMemo(
    () => getViewportPageSize(RCL_PAGE_CHROME_OFFSET),
    []
  );

  const isConstraintsFlow =
    sessionStorage.getItem("isConstraintsFlow") === "true";
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const paths = [
    {
      label: t("inventorysmart.rclHomeLabel"),
      to: "/home",
    },
    {
      label: isConstraintsFlow
        ? t("inventorysmart.rclConstraintsLabel")
        : t("inventorysmart.rclConfigurationsLabel"),
      to: "#",
    },
  ];

  let location = useLocation();
  const history = useHistory();
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const [rclListColumns, setRCLListingColumns] = useState([]);
  const [rclListTableData, setRclTableData] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const agGridInstance = useRef(null);

  const omsButtonActionLabel =
    props?.omsVendorConstraintsConfig?.add_rule_button_label ||
    t("inventorysmart.rclAddRuleButton");

  useEffect(() => {
    const onLoad = async () => {
      props?.setRulesTableLoader(true);
      let tableName = "rcl_list_columns";
      if (isOMSConstraintsFlow) {
        tableName = OMS_CONSTRAINTS_RCL_TABLE_NAME;
      }
      if (!isConstraintsFlow) {
        tableName = "rcl_configuration_list";
      }
      let rulesConstraintColDef = await getColumnsAg(
        `table_name=${tableName}`
      )();
      if (rulesConstraintColDef?.data?.show_message) {
        displaySnackMessages(
          rulesConstraintColDef?.data?.message,
          "success",
          props
        );
      }
      rulesConstraintColDef.map((data) => {
        if (data?.column_name === "action") {
          return (data.cellRenderer = (params, extraProps) => {
            if (!isConstraintsFlow) {
              if (params?.data?.level?.length === 2) {
                if (
                  ["Country", "Channel"].every((element) =>
                    params?.data?.level.includes(element)
                  )
                ) {
                  return null;
                }
              }
            }
            return (
              <div>
                <Link
                  variant="caption"
                  color="primary"
                  onClick={() => {
                    // Track add hierarchies click
                    if (isOMSConstraintsFlow) {
                      trackVendorConstraints({
                        action: "add_rule",
                        operation: "click",
                      });
                    }

                    props?.setRclAddHierarchiesRule({ ...params?.data });
                    props?.setActiveRclStep(1);
                    props?.history?.push({
                      pathname: Add_RCL,
                      state: {
                        redirectedFromNetworkTab: location.state
                          ?.redirectedFromNetworkTab
                          ? location.state?.redirectedFromNetworkTab
                          : false,
                      },
                    });
                  }}
                  className={
                    params?.data.is_default
                      ? customClasses.linkDisabled
                      : customClasses.link
                  }
                >
                  {isOMSConstraintsFlow
                    ? omsButtonActionLabel
                    : t("inventorysmart.rclAddHierarchiesLink")}
                </Link>
              </div>
            );
          });
        }
      });
      setRCLListingColumns(rulesConstraintColDef);
      props?.setRulesTableLoader(false);
      fetchRCLTableData();
    };
    onLoad();
    fetchModulesAccess();
    return () => {
      localStorage.removeItem("rclCreatedTableName");
    };
  }, []);
  useEffect(() => {
    if (location.state?.is_po_strategy_flow !== undefined) {
      sessionStorage.setItem(
        "is_po_strategy_flow",
        JSON.stringify(location.state.is_po_strategy_flow)
      );
    }
  }, [location.state?.is_po_strategy_flow]);

  const fetchRCLTableData = async () => {
    props?.setRulesTableLoader(true);
    setRclTableData([]);

    let isDCNetworkFlow = location.state?.redirectedFromNetworkTab;
    let isPOStrategyFlow =
      JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
    let response = await getRclList(
      isConstraintsFlow,
      isOMSConstraintsFlow,
      isDCNetworkFlow,
      isPOStrategyFlow
    );
    let data = cloneDeep(response.data.data)?.map((item) => {
      if (item.is_default) {
        item.checkbox_disabled = true;
      }
      return item;
    });
    if (data) {
      setRclTableData(data);
      props.setRclList(data);
    }
    props?.setRulesTableLoader(false);
  };

  const fetchModulesAccess = async () => {
    try {
      const module = "inventorysmart_add_rules";
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
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  const onSelectionChanged = () => {
    let selectedRows = [];
    if (agGridInstance?.current)
      agGridInstance?.current?.api?.forEachNode((node) => {
        node.selected &&
          selectedRows.push({
            rule_code: node.data?.rcl_code,
            psa_code: node?.data?.psa_code,
          });
      });
    props?.setSelectedRulesToDelete(selectedRows);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onDeleteRcl = async () => {
    if (isOMSConstraintsFlow) {
      trackVendorConstraints({ action: "delete_rule", operation: "click" });
    }

    props?.setRulesTableLoader(true);
    try {
      let rcl_codes = props?.selectedRclToDelete.map((thisRcl) => {
        return String(thisRcl?.rule_code);
      });
      let isDCNetworkFlow = location.state?.redirectedFromNetworkTab;
      let isPOStrategyFlow =
        JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
      let payload = { rcl_codes };
      let response = await deleteRclRules(
        payload,
        isConstraintsFlow,
        isOMSConstraintsFlow,
        isDCNetworkFlow,
        isPOStrategyFlow
      );

      if (isOMSConstraintsFlow) {
        trackVendorConstraints({ action: "delete_rule", operation: "success" });
      }

      props?.setRulesTableLoader(false);
      displaySnackMessages(response?.data?.message, "success", props);
      fetchRCLTableData();
    } catch (error) {
      if (isOMSConstraintsFlow) {
        trackVendorConstraints({ action: "delete_rule", operation: "error" });
      }

      props?.setRulesTableLoader(false);
      handleErrorMessage(error, props);
    }
  };

  const isRowSelectable = (params) => {
    return params?.data?.is_default ? false : true;
  };

  const handleBack = () => {
    let path = isConstraintsFlow ? CONSTRAINTS : CONFIGURATION;
    if (isOMSConstraintsFlow) {
      sessionStorage.setItem("isRedirectedFromOMSRCLConstraints", "true");
      history.push({
        pathname: path,
        state: {
          filterValues: location.state?.filterHistoryValues ?? [],
        },
      });
    } else {
      props?.history?.push({
        pathname: path,
        state: {
          filterValues: location.state?.filterHistoryValues ?? [],
        },
      });
    }
  };

  const disabledDelete = () => {
    let deletedEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
      "delete"
    );

    if (isOMSConstraintsFlow) {
      if (props?.omsVendorConstraintsConfig?.disable_delete_rcl_button) {
        return true;
      } else {
        deletedEnabled = canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
          "delete"
        );
      }
    }
    return !deletedEnabled;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_add_rules",
      subModuleName,
      action
    );
  };

  const disableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
      "edit"
    );
    if (isOMSConstraintsFlow) {
      if (props?.omsVendorConstraintsConfig?.disable_add_rcl_button) {
        return true;
      } else {
        editEnabled = canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
          "edit"
        );
      }
    }
    return !editEnabled;
  };

  return (
    <>
      <div className={globalClasses.paddingAroundNew}>
        <div
          className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12}`}
        >
          <HeaderBreadCrumbs options={paths}></HeaderBreadCrumbs>
        </div>
        <div className={globalClasses.marginBottom_4}>
          <TableSkeletonOverlay loading={props.rulesTableLoader}>
            {rclListTableData && (
              <AgGridComponent
                rowdata={rclListTableData}
                hideSelectAllRecords={true}
                uniqueRowId={"rcl_code"}
                selectAllHeaderComponent={true}
                columns={rclListColumns}
                onSelectionChanged={onSelectionChanged}
                loadTableInstance={loadTableInstance}
                isRowSelectable={isRowSelectable}
                paginationPageSize={pageSize}
                disablePaginationForSinglePage={true}
                height={getGridHeightCap(RCL_PAGE_CHROME_OFFSET)}
                wrapCellText
                autoHeaderHeight
                wrapHeaderText
                sizeColumnsToFitFlag
                tableHeader={t("inventorysmart.rclManageRulesHeader")}
                topRightOptions={
                  <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
                    <Button
                      className={customClasses.button}
                      style={{ marginRight: "10px" }}
                      id="set-all-exception"
                      variant="primary"
                      disabled={disableEdit()}
                      onClick={() => {
                        if (isOMSConstraintsFlow) {
                          trackVendorConstraints({
                            action: "add_rcl",
                            operation: "click",
                          });
                        }

                        props?.setActiveRclStep(0);
                        props?.history?.push({
                          pathname: Add_RCL,
                          state: {
                            redirectedFromNetworkTab: location.state
                              ?.redirectedFromNetworkTab
                              ? location.state?.redirectedFromNetworkTab
                              : false,
                          },
                        });
                      }}
                    >
                      {t("inventorysmart.rclAddRclButton")}
                    </Button>
                    {props?.selectedRclToDelete?.length > 0 && (
                      <DeleteActionButton
                        className={customClasses.button}
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={disabledDelete()}
                      />
                    )}
                  </div>
                }
              />
            )}
            {/* <Grid
            container
            className={globalClasses.layoutAlignCenter}
            style={{ marginTop: "1rem" }}
          >
            <Button
              className={customClasses.button}
              variant="outlined"
              color="primary"
              size="medium"
              onClick={handleBack}
            >
              Back
            </Button>
          </Grid> */}
          </TableSkeletonOverlay>
        </div>
        <Prompt
          isOpen={showDeleteDialog}
          title={t("inventorysmart.rclConfirmDeleteTitle")}
          children={t("inventorysmart.rclConfirmDeleteMessage")}
          infoList={[]}
          primaryButtonLabel={common.__ConfirmBtnText}
          onPrimaryButtonClick={() => {
            onDeleteRcl();
            setShowDeleteDialog(false);
          }}
          secondaryButtonLabel={common.__RejectBtnText}
          onSecondaryButtonClick={() => setShowDeleteDialog(false)}
          variant="warning"
        />
      </div>
      {(rclListTableData?.length > 0 || isOMSConstraintsFlow) && (
        <div
          className={`${customClasses.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
        >
          <Button
            className={customClasses.button}
            variant="tertiary"
            size="medium"
            onClick={handleBack}
          >
            {t("inventorysmart.rclBackTo", {
              target: isConstraintsFlow
                ? t("inventorysmart.rclConstraintsLabel")
                : t("inventorysmart.rclConfigurationsLabel"),
            })}
          </Button>
        </div>
      )}
    </>
  );
};

EditRulesComponent.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }),
  setSelectedRulesToDelete: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedRclToDelete:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclToDelete,
    rulesTableLoader:
      inventorysmartReducer.rulesConstraintsReducer.rulesTableLoader,
    selectedRclForAddHierarchies:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.selectedRclForAddHierarchies,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    omsVendorConstraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig
        ?.vendor_constraints,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSelectedRulesToDelete: (body) =>
      dispatch(setSelectedRulesToDelete(body)),
    setRulesTableLoader: (body) => dispatch(setRulesTableLoader(body)),
    setRclAddHierarchiesRule: (body) =>
      dispatch(setRclAddHierarchiesRule(body)),
    setActiveRclStep: (body) => dispatch(setActiveRclStep(body)),
    setRclList: (body) => dispatch(setRclList(body)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(EditRulesComponent);
