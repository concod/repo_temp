import { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Button, Badge, Prompt, useTranslation } from "impact-ui-v3";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import CopyActionButton from "modules/inventorysmart/components/ui-actions/CopyActionButton";
import ViewActionButton from "modules/inventorysmart/components/ui-actions/ViewActionButton";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { wrapColumnsWithEmptyCell, renderEmptyCell } from "../Constraints/landing-screen/constraintsCommonUtils";
import { INVENTORY_SUBMODULES_NAMES, ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import { STORE_TRANSFER_RULE_NEW_FLOW } from "../../constants-inventorysmart/routesConstants";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import {
  fetchStoreTransferRules,
  fetchStoreTransferRuleById,
  deleteStoreTransferRules,
  copyStoreTransferRule,
  setStoreTransferRuleLoader,
  setNewRuleDetails,
} from "../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import CreateRuleGroup from "../Constraints/Rule-Group-Constraints/CreateRuleGroup";

const RULE_NAME_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "100%",
  width: "100%",
  boxSizing: "border-box",
  overflow: "visible",
};

const isDefaultStoreTransferRule = (row) => {
  if (!row) {
    return false;
  }

  const flag =
    row.is_default ??
    row.isDefault ??
    row.is_default_rule ??
    row.default;

  if (
    flag === true ||
    flag === 1 ||
    flag === "1" ||
    flag === "true" ||
    flag === "True"
  ) {
    return true;
  }

  // Fallback when list API omits is_default but uses the system default name.
  const ruleName = String(row.rule_name ?? "").trim().toLowerCase();
  return (
    ruleName === "default_rule" ||
    ruleName === "default rule" ||
    ruleName === "default"
  );
};

const RuleNameCellRenderer = (params) => {
  const data = params?.data || {};
  const ruleName = params?.value ?? data?.rule_name ?? "";
  const t = params?.t;
  const showDefaultBadge = isDefaultStoreTransferRule(data);

  return (
    <div style={RULE_NAME_CELL_STYLE}>
      <div>
        {ruleName}
      </div>
      {showDefaultBadge ? (
        <Badge
          color="default"
          label={t ? t("inventorysmart.default") : "Default"}
          size="small"
          variant="filled"
          sx={{
            "&.MuiChip-root": {
              backgroundColor: "#F2F3F4 !important",
            },
            "& .MuiChip-label": {
              color: "#5F6673 !important",
            },
          }}
        />
      ) : null}
    </div>
  );
};

const StoreTransferRule = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [storeTransferRuleColumnConfig, setStoreTransferRuleColumnConfig] = useState([]);
  const [storeTransferRuleRowData, setStoreTransferRuleRowData] = useState([]);
  const [storeTransferRuleLoader, setStoreTransferRuleLoader] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [pendingRuleAction, setPendingRuleAction] = useState(null);
  const storeTransferRuleTableInstance = useRef({});
  const globalClasses = globalStyles();
  const classes = useInventorySmartStyles();

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(defaultError, "error");
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        onClose: onClose,
      },
    });
  };

  const openRuleInCreateFlow = useCallback(
    async (ruleId, mode = "view", ruleRow = null) => {
      if (!ruleId) {
        return;
      }

      setStoreTransferRuleLoader(true);
      try {
        const response = await props.fetchStoreTransferRuleById(ruleId);
        const responseData = response?.data;
        const ruleDetail = responseData?.data ?? responseData;

        if (responseData?.status === false) {
          displaySnackMessages(
            responseData?.message || ERROR_MESSAGE,
            "error"
          );
          return;
        }

        if (!ruleDetail) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return;
        }

        const isDefault =
          isDefaultStoreTransferRule(ruleRow) ||
          isDefaultStoreTransferRule(ruleDetail) ||
          isDefaultStoreTransferRule(ruleDetail?.rule);

        navigate(STORE_TRANSFER_RULE_NEW_FLOW, {
          state: {
            ruleId,
            ruleDetail,
            mode: isDefault ? "view" : mode,
            isDefault,
          },
        });
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        setStoreTransferRuleLoader(false);
      }
    },
    [navigate, props.fetchStoreTransferRuleById]
  );

  const handleRuleNameClick = useCallback(
    async (data) => {
      await openRuleInCreateFlow(data?.rule_id, "view", data);
    },
    [openRuleInCreateFlow]
  );

  useEffect(() => {
    getStoreTransferRuleData();
  }, []);

  const getStoreTransferRuleData = async () => {
    setStoreTransferRuleLoader(true);
    try {
      let cols = await getColumnsAg("table_name=Store_Transfer_all_dashboard")();
      // 10th arg (noEditableCustomCellRender) prevents OverflowTooltip from owning cellRenderer.
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        {},
        null,
        null,
        false,
        false,
        false,
        false,
        true
      ).map((item) => {
        if (
          item.column_name === "rule_name" ||
          item.field === "rule_name"
        ) {
          item.type = "str";
          item.is_aggregated = false;
          item.is_editable = false;
          item.editable = false;
          item.minWidth = 220;
          item.flex = item.flex || 1;
          item.cellStyle = {
            ...(typeof item.cellStyle === "object" ? item.cellStyle : {}),
            display: "flex",
            alignItems: "center",
            overflow: "visible",
          };
          // Assign AFTER formatting so OverflowTooltip / link renderers cannot overwrite it.
          item.cellRenderer = (cellProps) => (
            <RuleNameCellRenderer
              {...cellProps}
              t={t}
            />
          );
        }
        return item;
      });
      // Ensure every column has a function renderer so empty cells can show "-".
      colActions.forEach((col) => {
        if (typeof col.cellRenderer !== "function") {
          col.cellRenderer = (params) => {
            const placeholder = renderEmptyCell(params, col);
            if (placeholder) return placeholder;
            return params?.value ?? "";
          };
        }
      });
      wrapColumnsWithEmptyCell(colActions);
      setStoreTransferRuleColumnConfig(colActions);

      let response = await props.fetchStoreTransferRules();
      if (response.data?.data) {
        setStoreTransferRuleRowData(response.data?.data);
      } else {
        setStoreTransferRuleRowData([]);
      }

      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }

      setStoreTransferRuleLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      setStoreTransferRuleLoader(false);
    }
  };

  const loadStoreTransferRuleTableInstance = (params) => {
    storeTransferRuleTableInstance.current = params;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  const handleSelectionChanged = (params) => {
    const selectedNodes = params.api.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    setSelectedRows(selectedData);
  };

  const canDeleteRules = () => {
    const hasDefaultOrInUseRule = selectedRows.some(
      (rule) => isDefaultStoreTransferRule(rule) || rule.in_use
    );
    return selectedRows.length > 0 && !hasDefaultOrInUseRule;
  };

  const canEditSelectedRule = () => {
    if (selectedRows.length !== 1) {
      return false;
    }
    const rule = selectedRows[0];
    return !(isDefaultStoreTransferRule(rule) || rule?.in_use);
  };

  const canCopySelectedRule = () => {
    // Default rules can be copied (view-only otherwise); edit/delete stay blocked.
    return selectedRows.length === 1 && Boolean(selectedRows[0]?.rule_id);
  };

  const clearTableSelection = () => {
    setSelectedRows([]);
    const gridApi = storeTransferRuleTableInstance.current?.api;
    if (gridApi) {
      gridApi.deselectAll();
    }
  };

  const handleEditClick = () => {
    if (!canEditSelectedRule()) {
      displaySnackMessages(
        t("inventorysmart.defaultRulesOrRulesInUseCannotBeEdited"),
        "error"
      );
      return;
    }
    setPendingRuleAction({ rule: selectedRows[0], mode: "edit" });
    setShowAddRule(true);
  };

  const handleCopyClick = async () => {
    if (!canCopySelectedRule()) {
      displaySnackMessages(
        t("inventorysmart.pleaseSelectOneRuleToCopy"),
        "warning"
      );
      return;
    }

    const ruleId = selectedRows[0]?.rule_id;
    if (!ruleId) {
      return;
    }

    setStoreTransferRuleLoader(true);
    try {
      const response = await props.copyStoreTransferRule(ruleId);
      const responseData = response?.data;

      if (responseData?.status === false) {
        displaySnackMessages(
          responseData?.message || ERROR_MESSAGE,
          "error"
        );
        return;
      }

      displaySnackMessages(
        responseData?.message || t("inventorysmart.ruleCopiedSuccessfully"),
        "success"
      );
      clearTableSelection();
      await getStoreTransferRuleData();
      clearTableSelection();
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setStoreTransferRuleLoader(false);
    }
  };

  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(
        t("inventorysmart.noRulesSelectedForDeletion"),
        "warning"
      );
      return;
    }

    if (!canDeleteRules()) {
      displaySnackMessages(
        t("inventorysmart.defaultRulesOrRulesInUseCannotBeDeleted"),
        "error"
      );
      return;
    }

    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedRows.length === 0 || !canDeleteRules()) return;

    const ruleIds = selectedRows.map((rule) => rule.rule_id.toString());

    setStoreTransferRuleLoader(true);
    setShowDeleteConfirmDialog(false);

    try {
      setStoreTransferRuleRowData([]);

      await props.deleteStoreTransferRules(ruleIds);
      displaySnackMessages(
        t("inventorysmart.rulesDeletedSuccessfully"),
        "success"
      );

      clearTableSelection();
      await getStoreTransferRuleData();
      clearTableSelection();
    } catch (e) {
      handleErrorMessage(e);

      await getStoreTransferRuleData();
    } finally {
      setStoreTransferRuleLoader(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmDialog(false);
  };

  const navigateToAddNewRule = () => {
    navigate(STORE_TRANSFER_RULE_NEW_FLOW);
  };

  const handleAddRuleSave = (ruleDetails) => {
    props.setNewRuleDetails({
      rule_name: ruleDetails?.rule_name ?? "",
      description: ruleDetails?.description ?? "",
    });

    if (pendingRuleAction?.rule) {
      const { rule, mode } = pendingRuleAction;
      setShowAddRule(false);
      setPendingRuleAction(null);
      openRuleInCreateFlow(rule?.rule_id, mode, rule);
      return;
    }

    navigateToAddNewRule();
  };

  const handleAddRuleCancel = () => {
    setShowAddRule(false);
    setPendingRuleAction(null);
    storeTransferRuleTableInstance.current?.api?.deselectAll?.();
    setSelectedRows([]);
  };

  const renderTopRightButtons = () => {
    const hasCreatePermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "create"
    );

    const hasEditPermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "edit"
    );

    const hasDeletePermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "delete"
    );
    let options = [];

    if (selectedRows.length > 0) {
      const showDelete = hasDeletePermission && canDeleteRules();
      const showCopy = hasCreatePermission && canCopySelectedRule();
      const showView = selectedRows.length === 1;
      const showEdit =
        selectedRows.length === 1 &&
        hasEditPermission &&
        canEditSelectedRule();

      if (showDelete) {
        options.push(
          <DeleteActionButton
            key="delete-rule"
            onClick={handleDeleteClick}
          />
        );
      }

      if (showCopy) {
        options.push(
          <CopyActionButton
            key="copy-rule"
            onClick={handleCopyClick}
          />
        );
      }

      if (showEdit) {
        options.push(
          <EditActionButton
            key="edit-rule"
            onClick={handleEditClick}
            className={globalClasses.marginRight}
          />
        );
      }

      if (showView) {
        options.push(
          <ViewActionButton
            key="view-rule"
            onClick={() => {
              setPendingRuleAction({ rule: selectedRows[0], mode: "view" });
              setShowAddRule(true);
            }}
            className={globalClasses.marginRight}
          />
        );
      }

      return options;
    }

    if (hasCreatePermission) {
      options.push(
        <Button
          variant="primary"
          onClick={() => {
            setPendingRuleAction(null);
            setShowAddRule(true);
          }}
          className={globalClasses.marginRight}
        >
          {t("inventorysmart.addNewRule")}
        </Button>
      );
    }
    return options;
  };

  return (
    <div className={globalClasses.marginTop_8}>
      {showAddRule ? (
        <CreateRuleGroup
          onCancel={handleAddRuleCancel}
          onSave={handleAddRuleSave}
          selectedRules={[]}
          addSnack={props.addSnack}
          skipSaveApi={true}
          isDisabledField={pendingRuleAction?.mode === "view"}
          initialGroupName={pendingRuleAction?.rule?.rule_name ?? ""}
          initialDescription={
            pendingRuleAction?.rule?.description ??
            pendingRuleAction?.rule?.rule_description ??
            ""
          }
          descriptionMaxCharLimit={250}
          inputMaxChatLimit={100}
          onBlur={() => {}}
          showInfoBanner={false}
          title="inventorysmart.createRule"
          inputLableName="inventorysmart.storeTransferRuleName"
          saveButtonLabel="inventorysmart.storeTransferNext"
          description="inventorysmart.storeTransferCreateInfoRule"
          />
      ) : (
        <Loader loader={props.storeTransferRuleLoader || storeTransferRuleLoader}>
          <div style={{ minHeight: "351px" }}>
            {storeTransferRuleColumnConfig.length > 0 && (
              <AgGridComponent
                columns={storeTransferRuleColumnConfig}
                rowdata={storeTransferRuleRowData}
                uniqueRowId={"rule_id"}
                loadTableInstance={loadStoreTransferRuleTableInstance}
                pagination={true}
                paginationPageSize={100}
                tableHeader={t("inventorysmart.storeTransferRules")}
                rowSelection={"multiple"}
                onSelectionChanged={handleSelectionChanged}
                topRightOptions={renderTopRightButtons()}
                selectAllHeaderComponent={true}
              />
            )}
          </div>

          <Prompt
            isOpen={showDeleteConfirmDialog}
            title={t("inventorysmart.deleteRules")}
            onPrimaryButtonClick={handleDeleteConfirm}
            onSecondaryButtonClick={handleDeleteCancel}
            primaryButtonLabel={t("inventorysmart.deleteRules")}
            secondaryButtonLabel={t("inventorysmart.cancel")}
            variant="warning"
          >
            {t("inventorysmart.selectedRulesAreMappedToMultipleMaterials")}
          </Prompt>
        </Loader>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    storeTransferRuleLoader:
      store.inventorysmartReducer.storeTransferRuleService
        .storeTransferRuleLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setStoreTransferRuleLoader: (payload) =>
      dispatch(setStoreTransferRuleLoader(payload)),
    fetchStoreTransferRules: () => dispatch(fetchStoreTransferRules()),
    fetchStoreTransferRuleById: (ruleId) =>
      dispatch(fetchStoreTransferRuleById(ruleId)),
    deleteStoreTransferRules: (ruleIds) =>
      dispatch(deleteStoreTransferRules(ruleIds)),
    copyStoreTransferRule: (ruleId) => dispatch(copyStoreTransferRule(ruleId)),
    setNewRuleDetails: (payload) => dispatch(setNewRuleDetails(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoreTransferRule);
