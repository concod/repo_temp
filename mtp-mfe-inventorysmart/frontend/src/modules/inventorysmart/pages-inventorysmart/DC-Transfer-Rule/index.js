import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AddIcon from "@mui/icons-material/Add";
import { Alert, Button, Prompt, useTranslation } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import ViewActionButton from "modules/inventorysmart/components/ui-actions/ViewActionButton";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import CopyActionButton from "modules/inventorysmart/components/ui-actions/CopyActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import {
  ADD_NEW_DC_TRANSFER_RULE,
  CONFIGURATION,
} from "../../constants-inventorysmart/routesConstants";
import {
  deleteDCTransferRules,
  duplicateDCTransferRule,
  fetchDCTransferRules,
} from "../../services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";
import {
  DC_TRANSFER_RULE_LIST_TABLE_NAME,
  FULFILMENT_TYPE,
  FULFILLMENT_TYPE_UI_MAP,
} from "./constants";
import RuleNameDescription from "./CreateRuleFlow/RuleNameDescription";
import { mapFilterMappedToSelection } from "./CreateRuleFlow/dcSelectionFilterUtils";
import {
  applyDCTransferRuleListColumnRenderers,
  isDefaultDCTransferRule,
} from "./ruleListColumnRenderers";

const RULE_CREATED_ALERT_DURATION_MS = 6000;

const DCTransferRule = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const globalClasses = globalStyles();
  const [columnConfig, setColumnConfig] = useState([]);
  const [dcTransferRuleRowData, setDCTransferRuleRowData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showRuleCreatedAlert, setShowRuleCreatedAlert] = useState(
    Boolean(location.state?.showRuleCreatedSuccess)
  );
  const ruleCreatedAlertTimerRef = useRef(null);
  const tableInstance = useRef(null);
  const [showRuleNameDescription, setShowRuleNameDescription] = useState(
    Boolean(location.state?.openCreateDetails)
  );
  const [ruleDetails, setRuleDetails] = useState({
    ruleName: location.state?.ruleDetails?.ruleName || "",
    description: location.state?.ruleDetails?.description || "",
    fulfilmentType: location.state?.ruleDetails?.fulfilmentType,
    dcSelectionFilters: location.state?.ruleDetails?.dcSelectionFilters,
    mappingTableName: location.state?.ruleDetails?.mappingTableName,
  });

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

  const dismissRuleCreatedAlert = () => {
    clearTimeout(ruleCreatedAlertTimerRef.current);
    setShowRuleCreatedAlert(false);
  };

  useEffect(() => {
    if (!showRuleCreatedAlert) {
      return undefined;
    }

    ruleCreatedAlertTimerRef.current = setTimeout(
      dismissRuleCreatedAlert,
      RULE_CREATED_ALERT_DURATION_MS
    );

    return () => clearTimeout(ruleCreatedAlertTimerRef.current);
  }, [showRuleCreatedAlert]);

  useEffect(() => {
    if (location.state?.openCreateDetails) {
      setIsLoading(false);
      return;
    }

    loadLandingPage();

    const fromPath =
      typeof location.state === "string"
        ? location.state
        : location.state?.from;

    if (
      fromPath === ADD_NEW_DC_TRANSFER_RULE ||
      location.state?.showRuleCreatedSuccess
    ) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: { from: ADD_NEW_DC_TRANSFER_RULE },
      });
    }
  }, []);

  const loadLandingPage = async () => {
    setIsLoading(true);
    try {
      const [rawColumns] = await Promise.all([
        getColumnsAg(`table_name=${DC_TRANSFER_RULE_LIST_TABLE_NAME}`)(),
        getDCTransferRuleData(),
      ]);

      const formattedColumns = agGridColumnFormatter(
        cloneDeep(rawColumns || []),
        null,
        null,
        null,
        null,
        false,
        false,
        false,
        false,
        true
      );

      setColumnConfig(
        applyDCTransferRuleListColumnRenderers(formattedColumns, {
          defaultLabel: t("inventorysmart.default"),
          needBasedLabel: t(
            "inventorysmart.dcTransferRule.fulfilmentType.needBased.label"
          ),
          fixedPushLabel: t(
            "inventorysmart.dcTransferRule.fulfilmentType.fixedPush.label"
          ),
        })
      );
    } catch (e) {
      setColumnConfig([]);
      handleErrorMessage(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getDCTransferRuleData = async () => {
    try {
      const response = await props.fetchDCTransferRules();
      if (response.data?.data) {
        setDCTransferRuleRowData(response.data?.data);
      } else {
        setDCTransferRuleRowData([]);
      }

      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
    } catch (e) {
      handleErrorMessage(e);
      setDCTransferRuleRowData([]);
    }
  };

  const handleAddNewRule = () => {
    setRuleDetails({ ruleName: "", description: "" });
    setShowRuleNameDescription(true);
  };

  const handleCancelCreate = () => {
    setRuleDetails({ ruleName: "", description: "" });
    setShowRuleNameDescription(false);
    if (location.state?.openCreateDetails) {
      navigate(CONFIGURATION, {
        state: ADD_NEW_DC_TRANSFER_RULE,
        replace: true,
      });
    }
  };

  const handleNextFromDetails = (details) => {
    const nextDetails = { ...ruleDetails, ...details };
    setRuleDetails(nextDetails);
    navigate(ADD_NEW_DC_TRANSFER_RULE, { state: nextDetails });
  };

  const handleSelectionChanged = (event) => {
    setSelectedRows(event?.api?.getSelectedRows?.() || []);
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const clearTableSelection = () => {
    setSelectedRows([]);
    tableInstance.current?.api?.deselectAll?.();
  };

  const openRuleInCreateFlow = (rule, mode) => {
    if (!rule?.id && rule?.id !== 0) {
      return;
    }

    navigate(ADD_NEW_DC_TRANSFER_RULE, {
      state: {
        mode,
        ruleId: rule.id,
        isDefault: isDefaultDCTransferRule(rule),
        ruleName: rule.rule_name || "",
        description: rule.rule_description || rule.description || "",
        fulfilmentType:
          FULFILLMENT_TYPE_UI_MAP[rule.fulfillment_type] ||
          FULFILMENT_TYPE.NEED_BASED,
        dcSelectionFilters: mapFilterMappedToSelection(rule.filter_mapped),
        mappingTableName: rule.table_name || "",
      },
    });
  };

  const handleViewClick = () => {
    if (selectedRows.length !== 1) {
      return;
    }
    openRuleInCreateFlow(selectedRows[0], "view");
  };

  const handleEditClick = () => {
    if (selectedRows.length !== 1) {
      return;
    }
    openRuleInCreateFlow(selectedRows[0], "edit");
  };

  const handleCopyClick = async () => {
    if (selectedRows.length !== 1) {
      return;
    }

    const ruleId = selectedRows[0]?.id;
    if (ruleId === undefined || ruleId === null) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await duplicateDCTransferRule(ruleId)();
      if (!response?.data?.status) {
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
        return;
      }

      displaySnackMessages(
        response?.data?.message ||
          t("inventorysmart.dcTransferRule.ruleCopiedSuccessfully"),
        "success"
      );
      clearTableSelection();
      await getDCTransferRuleData();
      clearTableSelection();
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    const ruleIds = selectedRows
      .map((row) => row?.id)
      .filter((id) => id !== undefined && id !== null);

    if (!ruleIds.length) {
      return;
    }

    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    const ruleIds = selectedRows
      .map((row) => row?.id)
      .filter((id) => id !== undefined && id !== null);

    if (!ruleIds.length) {
      setShowDeleteConfirmDialog(false);
      return;
    }

    setShowDeleteConfirmDialog(false);
    setIsLoading(true);
    try {
      const response = await deleteDCTransferRules(ruleIds)();
      if (!response?.data?.status) {
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
        return;
      }

      displaySnackMessages(
        response?.data?.message ||
          t("inventorysmart.rulesDeletedSuccessfully"),
        "success"
      );
      clearTableSelection();
      await getDCTransferRuleData();
      clearTableSelection();
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmDialog(false);
  };

  const getTopRightOptions = () => {
    const selectedCount = selectedRows.length;

    if (selectedCount === 0) {
      return [
        <Button
          key="dc-transfer-rule-create-btn"
          onClick={handleAddNewRule}
          type="default"
          variant="primary"
          id="dc-transfer-rule-create-btn"
        >
          {t("inventorysmart.dcTransferRule.addNewRule")}
        </Button>,
      ];
    }

    const hasDefaultSelected = selectedRows.some(isDefaultDCTransferRule);
    const isSingleSelection = selectedCount === 1;
    const isSingleDefault =
      isSingleSelection && isDefaultDCTransferRule(selectedRows[0]);

    // Multiple rules including a default rule -> no icons
    if (!isSingleSelection && hasDefaultSelected) {
      return [];
    }

    // Only one default rule -> View and Copy
    if (isSingleDefault) {
      return [
        <ViewActionButton
          key="view-rule"
          onClick={handleViewClick}
        />,
        <CopyActionButton
          key="copy-rule"
          onClick={handleCopyClick}
        />,
      ];
    }

    // Multiple non-default rules -> Delete only
    if (!isSingleSelection) {
      return [
        <DeleteActionButton
          key="delete-rule"
          onClick={handleDeleteClick}
        />,
      ];
    }

    // Single non-default rule -> Delete, Copy, Edit, View
    return [
      <DeleteActionButton key="delete-rule" onClick={handleDeleteClick} />,
      <CopyActionButton key="copy-rule" onClick={handleCopyClick} />,
      <EditActionButton key="edit-rule" onClick={handleEditClick} />,
      <ViewActionButton key="view-rule" onClick={handleViewClick} />,
    ];
  };

  const getTopCenterOptions = () => {
    if (!showRuleCreatedAlert) {
      return null;
    }

    return (
      <div
        style={{ display: "flex", justifyContent: "center", width: "100%" }}
      >
        <Alert
          severity="success"
          subtleBackground
          title={t("inventorysmart.dcTransferRule.ruleCreatedSuccessfully")}
          onClose={dismissRuleCreatedAlert}
        />
      </div>
    );
  };

  if (showRuleNameDescription) {
    return (
      <RuleNameDescription
        initialRuleName={ruleDetails.ruleName}
        initialDescription={ruleDetails.description}
        onCancel={handleCancelCreate}
        onNext={handleNextFromDetails}
      />
    );
  }

  return (
    <div className={globalClasses.marginTop_8}>
      <Loader loader={isLoading} minHeight="400px">
        <div style={{ minHeight: "400px" }}>
          {columnConfig.length ? (
            <AgGridComponent
              columns={columnConfig}
              rowdata={dcTransferRuleRowData}
              uniqueRowId="id"
              pagination
              disablePaginationForSinglePage
              paginationPageSize={100}
              sizeColumnsToFitFlag
              tableHeader={t("inventorysmart.dcTransferRule.tableHeader")}
              rowSelection="multiple"
              selectAllHeaderComponent
              loadTableInstance={loadTableInstance}
              onSelectionChanged={handleSelectionChanged}
              topCenterOptions={getTopCenterOptions()}
              topRightOptions={getTopRightOptions()}
            />
          ) : null}
        </div>
      </Loader>

      <Prompt
        isOpen={showDeleteConfirmDialog}
        title={t("inventorysmart.deleteRules")}
        onPrimaryButtonClick={handleDeleteConfirm}
        onSecondaryButtonClick={handleDeleteCancel}
        primaryButtonLabel={t("inventorysmart.deleteRules")}
        secondaryButtonLabel={t("inventorysmart.cancel")}
        variant="warning"
        sx={{
          "& .MuiDialogContent-root": {
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            justifyContent: "flex-start",
            padding: "0 0 12px",
            marginTop: "24px",
          },
        }}
      >
        {t("inventorysmart.dcTransferRule.deleteSelectedRulesConfirm", {
          count: selectedRows.length,
        })}
      </Prompt>
    </div>
  );
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchDCTransferRules: () => dispatch(fetchDCTransferRules()),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DCTransferRule);
