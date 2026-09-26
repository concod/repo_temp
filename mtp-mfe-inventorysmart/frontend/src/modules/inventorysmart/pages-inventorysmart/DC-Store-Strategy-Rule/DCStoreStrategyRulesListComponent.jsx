import React, { useEffect, useState, useRef, cloneElement } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { Grid } from "@mui/material";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import {
  DIALOG_CANCEL_BTN_TEXT,
  INVENTORY_SUBMODULES_NAMES,
  DC_STORE_STRATEGY_RULES_DELETE_WARNING,
  DIALOG_PROCEED_BTN_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { deleteDCStoreStrategyRule } from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/dc-store-strategy-rules-service";
import {
  setEditId,
  setDisableEditDetail,
  setEditRuleName,
} from "../../services-inventorysmart/DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import { Prompt, useTranslation } from "impact-ui-v3";
import { handleErrorMessage } from "../DC-Store-Policy/DC-To-Store-Strategy/dCStoreStrategyTable";
import {
  getColumnDefinationForRules,
  isActionDisabled,
} from "../../utils-inventorysmart/utilityFunctions";

const DCStoreStratergyRulesListComponent = (props) => {
  const { t } = useTranslation();
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const [colDef, setColDef] = useState([]);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteRowInfo, setDeleteRowInfo] = useState(null);
  const { setRenderTableOrGrid } = props;
  const { deleteRule, setEditRule, setEditName, setDisableEditDetail } = props;
  const pageSize =
    props?.inventorysmartScreenConfig?.inventorysmart_page_count || 10;

  const disableDelete = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY_RULES,
    "delete",
    props?.modulePermissions,
    props?.module
  );
  const disableEdit = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY_RULES,
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
          onDeleteClick,
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
    setDisableEditDetail({ editName: rule_name, disabled });
    setRenderTableOrGrid("grid-edit");
  };
  const onDeleteClick = (table_info) => {
    setShowDeletePopup(true);
    setDeleteRowInfo(table_info);
  };
  const onDeleteRuleClick = async (table_info) => {
    const data = table_info;

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
      setDeleteRowInfo(null);
    }
  };

  const manualCallFetchList = async (manualbody, pageIndex) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: pageSize, page: pageIndex + 1 },
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
          tableHeader={t("inventorysmart.dcStoreStrategyTableHeader")}
          hideSelectAllRecords={true}
          uniqueRowId={"rule_code"}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={false}
          columns={colDef}
          sizeColumnsToFitFlag={true}
          cacheBlockSize={pageSize}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallFetchList(body, pageIndex)
          }
          topRightOptions={props.topRightOptions}
          paginationPageSize={pageSize}
          wrapCellText
          autoCellHeight
          disablePaginationForSinglePage
        />
        <Prompt
          isOpen={showDeletePopup}
          title={t("inventorysmart.dcStoreStrategyWarningTitle")}
          variant="warning"
          primaryButtonLabel={DIALOG_PROCEED_BTN_TEXT}
          secondaryButtonLabel={DIALOG_CANCEL_BTN_TEXT}
          onPrimaryButtonClick={() => {
            onDeleteRuleClick(deleteRowInfo);
            setShowDeletePopup(false);
          }}
          onSecondaryButtonClick={() => {
            setDeleteRowInfo(null);
            setShowDeletePopup(false);
          }}
        >
          {DC_STORE_STRATEGY_RULES_DELETE_WARNING}
        </Prompt>
      </Grid>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    deleteRule: (payload) => dispatch(deleteDCStoreStrategyRule(payload)),
    setEditRule: (payload) => dispatch(setEditId(payload)),
    setDisableEditDetail: (payload) => dispatch(setDisableEditDetail(payload)),
    setEditName: (payload) => dispatch(setEditRuleName(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCStoreStratergyRulesListComponent);
