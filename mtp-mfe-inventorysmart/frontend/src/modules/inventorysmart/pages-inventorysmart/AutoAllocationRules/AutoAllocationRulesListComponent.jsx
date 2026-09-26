import React, { useEffect, useState, useRef, cloneElement } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { Grid } from "@mui/material";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import {
  INVENTORY_SUBMODULES_NAMES,
  AUTO_ALLOCATION_RULE_DELETE_VALIDATION_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Prompt, useTranslation } from "impact-ui-v3";

import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { deleteAllocationRule } from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/auto-allocation-rules-service";
import {
  setEditId,
  setDisableEditDetail,
  setEditRuleName,
} from "../../services-inventorysmart/AutoAllocationRules/create-auto-allocation-rules-service";
import { handleErrorMessage } from "../DC-Store-Policy/DC-To-Store-Strategy/dCStoreStrategyTable";
import {
  getColumnDefinationForRules,
  isActionDisabled,
} from "../../utils-inventorysmart/utilityFunctions";
import { common } from "core/Utils/constants/assortSmart-constants";

const AutoAllocationRulesListComponent = (props) => {
  const { t } = useTranslation();
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const [colDef, setColDef] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState(null);
  const { setRenderTableOrGrid } = props;
  const { deleteRule, setEditRule, setEditName, setDisableEditDetail } = props;

  const disableDelete = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_AUTO_ALLOCATION_RULES,
    "delete",
    props?.modulePermissions,
    props?.module
  );
  const disableEdit = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_AUTO_ALLOCATION_RULES,
    "edit",
    props?.modulePermissions,
    props?.module
  );

  useEffect(() => {
    const fetchColumnDefinition = async () => {
      try {
        const colDef = await getColumnDefinationForRules(
          props.table_name,
          disableEdit,
          disableDelete,
          onEditRuleClick,
          onDeleteRuleClick,
          false,
          true,
        );

        if (colDef.length) {
          setColDef(colDef);
        }
      } catch (error) {
        console.error("Error fetching column definition:", error);
      }
    };

    fetchColumnDefinition();
  }, [props.table_name]);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
  }, [props.selectedDependencyValue]);

  const onEditRuleClick = async ({ rule_code, rule_name }, disabled) => {
    setEditRule(rule_code);
    setEditName(rule_name);
    setRenderTableOrGrid("grid-edit");
    setDisableEditDetail({ editName: rule_name, disabled });
  };

  const onDeleteRuleClick = async (table_info) => {
    setDeleteInstance(table_info);
    setShowDeleteDialog(true);
  };

  const confirmDeleteRule = async () => {
    const data = deleteInstance;
    
    try {
      props.setTableLoader(true);
      const payload = { rule_code: data.rule_code };
      const response = await deleteRule(payload);
      displaySnackMessages(
        response?.data?.data?.[0]?.dc_store_policy_rule_delete?.message,
        "success",
        props
      );
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setTableLoader(false);
      setShowDeleteDialog(false);
    }
  };

  const manualCallFetchList = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: [],
    };
    try {
      props.setTableLoader(true);
      let response = await props.getRowData(body);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      props.setTableLoader(false);
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      return {
        data: response?.data?.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setTableLoader(false);
      handleErrorMessage(e, props);
      return;
    }
  };
  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  return (
    <>
      <Grid>
        <AgGridComponent
          tableHeader={t("inventorysmart.autoAllocationRules")}
          topRightOptions={[props?.createRulesButton]}
          hideSelectAllRecords={true}
          uniqueRowId={"rule_code"}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={false}
          columns={colDef}
          cacheBlockSize={props.pageSize || 10}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallFetchList(body, pageIndex)
          }
          paginationPageSize={props.pageSize}
          wrapCellText
          autoCellHeight
          sizeColumnsToFitFlag
          onFirstDataRender={(params) => params.api.sizeColumnsToFit()}
          disablePaginationForSinglePage
        />
      </Grid>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Auto Allocation Rule"
        variant="error"
        primaryButtonLabel = "Yes"
        secondaryButtonLabel = "No"
        onPrimaryButtonClick = {confirmDeleteRule}
        onSecondaryButtonClick = {()=>setShowDeleteDialog(false)}
      >
        {AUTO_ALLOCATION_RULE_DELETE_VALIDATION_MESSAGE}
        </Prompt>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    deleteRule: (payload) => dispatch(deleteAllocationRule(payload)),
    setEditRule: (payload) => dispatch(setEditId(payload)),
    setDisableEditDetail: (payload) => dispatch(setDisableEditDetail(payload)),
    setEditName: (payload) => dispatch(setEditRuleName(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationRulesListComponent);
