import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { Grid } from "@mui/material";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { displaySnackMessages } from "../inventorysmart-utility";
import { Prompt, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import {
  setEditId,
  setEditRuleName,
  deleteAllocationScheduler,
} from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/auto-allocation-scheduler-service";
import { handleErrorMessage } from "./CreateAutoAllocationScheduler";
import {
  getColumnDefinationForRules,
  isActionDisabled,
} from "../../utils-inventorysmart/utilityFunctions";

const AutoAllocationSchedulerListComponent = (props) => {
  const { t } = useTranslation();
  const { is_scheduler_editable} = props
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const [colDef, setColDef] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState(null);
  const { setRenderTableOrScheduler, onOpenEditPanel, refreshTableRef } = props;
  const { setEditSchedulerId, setEditSchedulerName, deleteScheduler } = props;

  const disableDelete = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_SCHEDULER,
    "delete",
    props?.modulePermissions,
    props?.module
  );
  const disableEdit = isActionDisabled(
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_SCHEDULER,
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
          is_scheduler_editable,
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

  useEffect(() => {
    if (refreshTableRef) {
      refreshTableRef.current = () => {
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      };
    }
  }, [refreshTableRef]);

  const onEditRuleClick = async ({ sh_code, sh_name }) => {
    setEditSchedulerId(sh_code);
    setEditSchedulerName(sh_name);
    if (onOpenEditPanel) {
      onOpenEditPanel();
      return;
    }
    setRenderTableOrScheduler?.("grid-edit");
  };

  const onDeleteRuleClick = (table_info) => {
    setDeleteInstance(table_info);
    setShowDeleteDialog(true);
  };

  const confirmDeleteRule = async () => {
    const data = deleteInstance;
    setShowDeleteDialog(false);
    
    try {
      props.setTableLoader(true);

      const payload = data.sh_code;
      const response = await deleteScheduler(payload);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      displaySnackMessages(
        response?.data?.data?.[0]?.auto_allocation_scheduler_delete?.message,
        "success",
        props
      );
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setTableLoader(false);
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
          hideSelectAllRecords={true}
          uniqueRowId={"sh_code"}
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
          topRightOptions={props.topRightOptions}
          tableHeader={
            props.autoAllocationSchedulerTableHeader
              ? props.autoAllocationSchedulerTableHeader
              : t("inventorysmart.autoAllocationScheduler")
          }
          disablePaginationForSinglePage
        />
      </Grid>
      <Prompt
        isOpen={showDeleteDialog}
        title={t("inventorysmart.deleteAutoAllocationScheduler")}
        variant="error"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        onPrimaryButtonClick={confirmDeleteRule}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        handleClose={() => setShowDeleteDialog(false)}
      >
        {t("inventorysmart.deleteSchedulerConfirmation")}
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
    autoAllocationSchedulerTableHeader: inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.autoAllocationSchedulerTableHeader,
    is_scheduler_editable: inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.is_scheduler_editable,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    deleteScheduler: (payload) => dispatch(deleteAllocationScheduler(payload)),
    setEditSchedulerId: (payload) => dispatch(setEditId(payload)),
    setEditSchedulerName: (payload) => dispatch(setEditRuleName(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationSchedulerListComponent);
