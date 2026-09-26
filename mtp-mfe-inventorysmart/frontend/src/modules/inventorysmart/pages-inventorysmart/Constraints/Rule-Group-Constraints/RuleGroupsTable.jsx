import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { OldTable, Button, Modal, Input, TextArea, Tooltip, Select } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getAllColumnsWidth, getGridWidth } from "core/Utils/agGrid/table-functions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import { EDIT_CREATE_EXCEPTION_SCREEN } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  isActionAllowedOnSubModule,
} from "../../inventorysmart-utility";
import {
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getRuleGroupsList,
  deleteRuleGroups,
  updateRuleGroup,
  setManageConstraintsPreSelectedKeys,
} from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import RuleGroupDetailPanel from "./RuleGroupDetailPanel";
import ManageConstraintsBottomSheet from "./ManageConstraintsBottomSheet";
import {
  fetchRuleGroupsTableColumns,
  applyRuleGroupColumnRenderers,
  RULE_GROUP_SORT_OPTIONS,
  sortRuleGroups,
  clearExpandedGroups,
} from "./ruleGroupUtils";
import { useRuleGroupStyles } from "./ruleGroupStyles";
import "core/Utils/agGrid/ag-theme-mtp.scss";

const PAGE_SIZE = 10;

const RuleGroupsTable = (props) => {
  const classes = useRuleGroupStyles();
  const [columnDefs, setColumnDefs] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showManageConstraints, setShowManageConstraints] = useState(false);
  const [sortOption, setSortOption] = useState(null);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const canTakeActionOnModules = (subModuleName, action) =>
    isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );

  const enableEdit = () =>
    canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_RULE_GROUP_CONSTRAINTS,
      "edit"
    );

  const enableDelete = () =>
    canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_RULE_GROUP_CONSTRAINTS,
      "delete"
    );

  // Displayed rows are derived from the raw API rows + the active sort option,
  // so there is a single source of truth and no risk of a stale sort.
  const rowData = useMemo(
    () => sortRuleGroups(rawRows, sortOption?.value),
    [rawRows, sortOption]
  );

  useEffect(() => {
    let cancelled = false;
    fetchRuleGroupsTableColumns()
      .then((columns) => {
        if (!cancelled) {
          const formattedColumns = agGridColumnFormatter(
            columns.map((col) => cloneDeep(col))
          );
          formattedColumns.forEach(applyRuleGroupColumnRenderers);
          setColumnDefs(formattedColumns);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          handleErrorMessage(e, props);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedRows([]);
    setShowManageConstraints(false);
    setShowEditModal(false);
    setEditGroupName("");
    setEditDescription("");
    clearExpandedGroups();
    props.setManageConstraintsPreSelectedKeys([]);
    fetchRuleGroups();
  }, [props.selectedDependencyValue, props.rulesListStatus]);

  const fetchRuleGroups = async () => {
    setLoading(true);
    try {
      const filters = props.selectedDependencyValue?.filters || [];
      const postBody = {
        meta: {
          search: [],
          range: [],
          sort: [],
          limit: { limit: props.pageSize || 100, page: 1 },
        },
        filters,
        selection: {
          data: [{ checkedRows: [] }],
          unique_columns: ["key"],
        },
        status: props.rulesListStatus || "all",
      };
      const response = await getRuleGroupsList(postBody);
      setRawRows(response?.data?.data || []);
    } catch (e) {
      handleErrorMessage(e, props);
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onSelectionChanged = useCallback((params) => {
    const selected = params.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  const fitColumnsIfSpaceAvailable = useCallback((params) => {
    if (!params?.api) return;
    if (getAllColumnsWidth(params) <= getGridWidth(params)) {
      params.api.sizeColumnsToFit();
    }
  }, []);

  const getColumnDefsWithCheckbox = () => {
    if (!columnDefs.length) return [];
    const checkboxCol = {
      field: "",
      checkboxSelection: true,
      headerCheckboxSelection: false,
      headerCheckboxSelectionFilteredOnly: false,
      suppressSizeToFit: true,
      suppressMenu: true,
      minWidth: 56,
      maxWidth: 56,
      // headerClass: "ag-selection-column-header",
      // cellClass: "cell-vertical-center-align",
    };
    return [checkboxCol, ...columnDefs];
  };

  const handleDeleteRuleGroups = async () => {
    const groupIds = selectedRows.map((row) => row.group_id);
    try {
      setLoading(true);
      const response = await deleteRuleGroups({ group_list: groupIds });
      if (response?.data?.status) {
        props.addSnack({
          message: response?.data?.message || "Rule groups deleted successfully",
          options: { variant: "success" },
        });
        setSelectedRows([]);
        fetchRuleGroups();
        // Refresh the KPI summary cards since deleting groups changes the counts.
        props.refreshSummary?.();
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    if (selectedRows.length === 1) {
      const row = selectedRows[0];
      setEditGroupName(row.group_name || "");
      setEditDescription(row.group_description || "");
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditGroupName("");
    setEditDescription("");
  };

  const isEditUnchanged = () => {
    const row = selectedRows[0];
    return (
      editGroupName === (row?.group_name || "") &&
      editDescription === (row?.group_description || "")
    );
  };

  const handleUpdateRuleGroup = async () => {
    const row = selectedRows[0];
    const payload = {
      group_id: row.group_id,
      group_name: editGroupName,
      group_description: editDescription,
    };
    try {
      setEditLoading(true);
      const response = await updateRuleGroup(payload);
      if (response?.data?.status) {
        props.addSnack({
          message: response?.data?.message || "Rule group updated successfully",
          options: { variant: "success" },
        });
        handleCloseEditModal();
        setSelectedRows([]);
        fetchRuleGroups();
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddExceptions = () => {
    const filters = props.selectedDependencyValue?.filters || [];
    const ruleList = selectedRows.flatMap((row) => row.rule_list || []);
    sessionStorage.setItem(
      "inventorysmart_constraints_exception_filters",
      JSON.stringify({ filters, source: "rule_groups", rule_list: ruleList, table_name: "" })
    );
    props?.history?.push(EDIT_CREATE_EXCEPTION_SCREEN);
  };

  const getTopRightOptions = () => {
    return (
      <div className={classes.topRightOptionsContainer}>
        {selectedRows.length > 0 ? (
          <>
            <DeleteActionButton
              onClick={handleDeleteRuleGroups}
              disabled={!enableDelete()}
            />
            {selectedRows.length === 1 && (
              <EditActionButton
                onClick={handleOpenEditModal}
                disabled={!enableEdit()}
              />
            )}
          {selectedRows.length > 0 && (
          <div
            key="selection-actions-separator"
            className={classes.dividerLine}
          />
        )}
            <Button variant="secondary" onClick={handleAddExceptions} disabled={!enableEdit()}>
              Add Exceptions
            </Button>
            {selectedRows.length === 1 && (
              <Button
                variant="primary"
                onClick={() => setShowManageConstraints(true)}
                disabled={!enableEdit()}
              >
                Modify Group
              </Button>
            )}
          </>
        ):
        <Select
          isOpen={isSortOpen}
          setIsOpen={setIsSortOpen}
          isWithSearch={false}
          label="Sort by"
          labelOrientation="left"
          isClearable={false}
          isMulti={false}
          placeholder="Select"
          currentOptions={RULE_GROUP_SORT_OPTIONS}
          setCurrentOptions={() => {}}
          initialOptions={RULE_GROUP_SORT_OPTIONS}
          selectedOptions={sortOption}
          setSelectedOptions={setSortOption}
          handleChange={setSortOption}
          width="164px"
          minWidth="164px"
        />
        }
      </div>
    );
  };

  const isSinglePage = rowData.length <= PAGE_SIZE;

  return (
    <Loader loader={loading}>
      <div className={isSinglePage ? "hide-pagination" : ""}>
      <OldTable
        viewPoint="list"
        tableHeader={"All Rule Groups"}
        // cardContainer
        columnDefs={getColumnDefsWithCheckbox()}
        rowData={rowData}
        rowSelection="multiple"
        suppressRowClickSelection
        suppressColumnMenu
        masterDetail={true}
        detailRowAutoHeight={true}
        keepDetailRows={true}
        detailCellRenderer={RuleGroupDetailPanel}
        detailCellRendererParams={{
          selectedDependencyValue: props.selectedDependencyValue,
        }}
        onSelectionChanged={onSelectionChanged}
        defaultPageSize={PAGE_SIZE}
        paginationPageSizeSelector={[PAGE_SIZE]}
        topRightOptions={getTopRightOptions()}
        hideTableSetting
        hideTableFormat
        hideTableActions
        hideRowHeightOptionMenu
        hidePaginationPageSizeSelector
        hideNumericFormat
        hideFontSize
        pagination
        onFirstDataRendered={fitColumnsIfSpaceAvailable}
        onGridSizeChanged={fitColumnsIfSpaceAvailable}
      />
      </div>
      <ManageConstraintsBottomSheet
        open={showManageConstraints}
        onClose={() => setShowManageConstraints(false)}
        selectedGroup={selectedRows.length === 1 ? selectedRows[0] : null}
        filters={props.selectedDependencyValue?.filters || []}
        rulesListStatus={props.rulesListStatus || "all"}
        onUpdateSuccess={() => {
          setSelectedRows([]);
          props.setManageConstraintsPreSelectedKeys([]);
          fetchRuleGroups();
        }}
      />
      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={handleCloseEditModal}
          title="Edit Name And Description"
          primaryButtonLabel="Update"
          secondaryButtonLabel="Cancel"
          onPrimaryButtonClick={handleUpdateRuleGroup}
          onSecondaryButtonClick={handleCloseEditModal}
          primaryButtonProps={{
            disabled: !editGroupName.trim() || editLoading || isEditUnchanged()
          }}
        >
          <Loader loader={editLoading}>
            <div className={classes.editModalContent}>
              <div className={classes.editModalHalfWidth}>
                <Input
                  label="Group Name"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  isClearable
                />
              </div>
              <div className={classes.editModalFullWidth}>
                <TextArea
                  label="Description"
                  value={editDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setEditDescription(e.target.value);
                    }
                  }}
                  characterLimit={200}
                  maxRows={4}
                  width={"600px"}
                />
              </div>
            </div>
          </Loader>
        </Modal>
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setManageConstraintsPreSelectedKeys: (keys) =>
    dispatch(setManageConstraintsPreSelectedKeys(keys)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RuleGroupsTable);
