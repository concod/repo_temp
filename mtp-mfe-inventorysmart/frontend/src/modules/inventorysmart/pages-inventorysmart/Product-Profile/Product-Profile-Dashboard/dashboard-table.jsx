import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { cloneDeep, isEmpty } from "lodash";
import { Prompt } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { CREATE_PRODUCT_PROFILE } from "../../../constants-inventorysmart/routesConstants";
import StoreSizeContributionComponent from "./store-size-contribution";
import {
  DELETE_MESSAGE,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "../../../constants-inventorysmart/stringConstants";
import {
  deleteUserProductProfile,
  getIARecommededTableData,
  getUserCreatedTableData,
  setIARecommendedTableData,
  setProductProfileTableLoader,
  setUserCreatedTableData,
  getIAEditsSavedData,
} from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import { applyInventoryEditDeleteCellRenderers } from "../../../utils-inventorysmart/utilityFunctions";
import StoreBandContributionComponent from "./store-band-table";

const DashboardTable = (props) => {
  const [iaRecommendedColumns, setIARecommendedColumns] = useState([]);
  const [userCreatedColumns, setUserCreatedColumns] = useState([]);
  const [
    displayStoreSizeContribution,
    setDisplayStoreSizeContribution,
  ] = useState(false);
  const [selectedPPCode, setSelectedPPCode] = useState("");
  const [selectedPPCodeIAEdits, setSelectedPPCodeIAEdits] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState([]);
  const [
    displayStoreBandContribution,
    setDisplayStoreBandContribution,
  ] = useState(false);
  const [unmount, setUnmount] = useState(false);
  const [iaEditsSavedColumns, setIAEditsSavedColumns] = useState([]);
  const [ppSelectionState, setPpSelectionState] = useState({
    ppInDetailsTable: false,
    ppInIAEditsTable: false,
  });

  const agGridInstance = useRef(null);
  const agGridUserInstance = useRef(null);
  const filterDependencies = useRef({});
  const agGridIAEditsInstance = useRef(null);

  const history = useHistory();
  const uniqueArticleKey = props.createPPTenantAttrs?.pp_unique_id || "article";

  const viewStoreBandSplitDetails = (data) => {
    setSelectedPPCode(data);
    setDisplayStoreBandContribution(true);
  };
  const viewStoreContributionSplitDetails = (data) => {
    setPpSelectionState((prevState) => ({
      ...prevState,
      ppInDetailsTable: true,
    }));
    setSelectedPPCode(data);
    setDisplayStoreSizeContribution(true);
  };

  const viewStoreContributionFromIAEditsDetails = (data) => {
    setPpSelectionState((prevState) => ({
      ...prevState,
      ppInIAEditsTable: true,
    }));
    setSelectedPPCodeIAEdits(data);
    setDisplayStoreSizeContribution(true);
  };

  const iaProductProfileViewAction = {
    article: viewStoreBandSplitDetails,
  };

  // call this for carters
  const iaProductProfileStoreContrViewAction = {
    article: viewStoreContributionSplitDetails,
    l8_code: viewStoreContributionSplitDetails,
    display_article: viewStoreContributionSplitDetails,
    l4_name: viewStoreContributionSplitDetails,
    style_colour_id: viewStoreContributionSplitDetails,
  };

  const userProductProfileViewAction = {
    name: viewStoreContributionSplitDetails,
  };

  const iaProductProfileEditsAction = {
    name: viewStoreContributionFromIAEditsDetails,
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setProductProfileTableLoader(false);
  };

  const editProductProfile = (tableData) => {
    history.push({ pathname: CREATE_PRODUCT_PROFILE, state: tableData.data });
  };

  const onDeleteClick = (rowData) => {
    setDeleteInstance(rowData.pp_code);
    setShowDeleteDialog(true);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
      "edit"
    );
    return !editEnabled;
  };

  const disabledDelete = () => {
    let deletedEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
      "delete"
    );
    return !deletedEnabled;
  };

  const applyEditDeleteColumnOverrides = (columns) =>
    applyInventoryEditDeleteCellRenderers(columns, {
      onEdit: editProductProfile,
      onDelete: onDeleteClick,
      isEditDisabled: enableEdit,
      isDeleteDisabled: disabledDelete,
    });

  useEffect(() => {
    // do not call table config api when tabs are switched but no hierarchy is selected
    if (!isEmpty(props.selectedDependencyValue)) {
      props.setProductProfileTableLoader(true);
      // hide sub tables whenever filter selection has changed
      setDisplayStoreBandContribution(false);
      setDisplayStoreSizeContribution(false);
      if (props.tabState === 0)
        (async () => {
          let iaRecommendedColDef = [];
          iaRecommendedColDef = await getColumnsAg(
            "table_name=product_profile_ia_table"
          )();
          let iaRecommendedColDefWithAction = agGridColumnFormatter(
            cloneDeep(iaRecommendedColDef),
            null,
            uniqueArticleKey === "primary_sku"
              ? iaProductProfileViewAction // for dg
              : iaProductProfileStoreContrViewAction // for other clients
          );
          setIARecommendedColumns(iaRecommendedColDefWithAction);
        })();
      else {
        (async () => {
          let userCreatedColDef = [];
          userCreatedColDef = await getColumnsAg(
            "table_name=product_profile_user_table"
          )();
          let userCreatedColDefWithAction = agGridColumnFormatter(
            cloneDeep(userCreatedColDef),
            null,
            userProductProfileViewAction
          );
          setUserCreatedColumns(
            applyEditDeleteColumnOverrides(userCreatedColDefWithAction)
          );
        })();
        if (props.showIASavedAsUserCreated) {
          (async () => {
            let iaEditsColDef = [];
            iaEditsColDef = await getColumnsAg(
              "table_name=product_profile_ia_edited_table"
            )();
            let iaEditsColDefWithAction = agGridColumnFormatter(
              cloneDeep(iaEditsColDef),
              null,
              iaProductProfileEditsAction
            );
            setIAEditsSavedColumns(
              applyEditDeleteColumnOverrides(iaEditsColDefWithAction)
            );
          })();
        }
        props.setProductProfileTableLoader(false);
      }
    }
  }, [props.selectedDependencyValue, props.showIASavedAsUserCreated]);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      // hide sub tables whenever filter selection has changed
      setDisplayStoreBandContribution(false);
      setDisplayStoreSizeContribution(false);
      setPpSelectionState({
        ppInDetailsTable: false,
        ppInIAEditsTable: false,
      });
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      agGridUserInstance.current?.api?.refreshServerSideStore({ purge: true });
      setUnmount(true);
      // add a condition to call this oly when its on the same page, to avoid being called twice
      if (
        !isEmpty(props.tableDataIARecommended) ||
        !isEmpty(props.tableDataUserCreated)
      ) {
        if (props.tabState === 0)
          agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
        else {
          agGridUserInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props.showIASavedAsUserCreated &&
            agGridIAEditsInstance.current?.api?.refreshServerSideStore({
              purge: true,
            });
        }
      }
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
  }, [props.selectedDependencyValue]);

  // to remount the table data and get it back to its initial state
  useEffect(() => {
    if (unmount) setUnmount(false);
  }, [unmount]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const loadUserTableInstance = (params) => {
    agGridUserInstance.current = params;
  };

  const loadIAEditsTableInstance = (params) => {
    agGridIAEditsInstance.current = params;
  };

  const manualCallBackIARecommended = async (manualbody, pageIndex) => {
    props.setProductProfileTableLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: filterDependencies.current?.filters,
    };

    try {
      let response = await props.getIARecommededTableData(body);
      props.setIARecommendedTableData(response.data.data);
      props.setProductProfileTableLoader(false);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else
        return {
          data: response.data.data,
          totalCount: response.data.total,
        };
    } catch (e) {
      handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackIAEditsSaved = async (manualbody, pageIndex) => {
    props.setProductProfileTableLoader(true);
    let body = {
      meta: {
        ...manualbody,
        sort: isEmpty(manualbody.sort)
          ? [{ column: "created_at", order: "desc" }]
          : manualbody.sort,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: filterDependencies.current?.filters,
    };

    try {
      let response = await props.getIAEditsSavedData(body);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      props.setProductProfileTableLoader(false);
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        return {
          data: response.data.data,
          totalCount: response.data.total,
        };
      }
    } catch (e) {
      handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackUserCreated = async (manualbody, pageIndex) => {
    props.setProductProfileTableLoader(true);
    let body = {
      meta: {
        ...manualbody,
        sort: isEmpty(manualbody.sort)
          ? [{ column: "created_at", order: "desc" }]
          : manualbody.sort,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: filterDependencies.current?.filters,
    };

    try {
      let response = await props.getUserCreatedTableData(body);
      props.setProductProfileTableLoader(false);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        props.setUserCreatedTableData(response.data?.data);
        return {
          data: response.data.data,
          totalCount: response.data.total,
        };
      }
    } catch (e) {
      handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const confirmDeleteUserProductProfiles = () => {
    props.setProductProfileTableLoader(true);
    const callDelete = async () => {
      try {
        setShowDeleteDialog(false);
        await props.deleteUserProductProfile(deleteInstance);
        displaySnackMessages(
          `Successfully deleted ${dynamicLabelsBasedOnTenant(
            "article"
          )} profile`,
          "success"
        );
        // working now to check updated row data after delete if not call manualCallBack and update the table Data
        agGridUserInstance.current?.api?.refreshServerSideStore({
          purge: true,
        });
        if (props.showIASavedAsUserCreated) {
          agGridIAEditsInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    callDelete();
  };

  function getNestedTableVisibilityForTab0() {
    if (props.tabState === 0 && displayStoreSizeContribution) return true;
    if (props.tabState === 0 && displayStoreBandContribution) return true;

    return false;
  }

  return (
    <>
      <div>
        {props.tabState === 0 &&
          !isEmpty(filterDependencies.current) &&
          !unmount && (
            <AgGridComponent
              columns={iaRecommendedColumns}
              uniqueRowId={"pp_code"}
              loadTableInstance={loadTableInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackIARecommended(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSize || 10}
              paginationPageSize={props.pageSize}
              tableHeader="Details Table"
              topRightOptions={props.topRightPPDetailsTableOptions}
              topCenterOptions={props.topCenterOptions}
              nestedTable={getNestedTableVisibilityForTab0()}
              nestedTableComponent={
                displayStoreBandContribution ? (
                  <StoreBandContributionComponent
                    tabState={props.tabState}
                    selectedPPCode={selectedPPCode}
                    filterDependencies={filterDependencies.current}
                    setSelectedPPCode={setSelectedPPCode}
                    setDisplayStoreBandContribution={
                      setDisplayStoreBandContribution
                    }
                    setPpSelectionState={setPpSelectionState}
                  />
                ) : (
                  <StoreSizeContributionComponent
                    tabState={props.tabState}
                    selectedPPCode={selectedPPCode}
                    filterDependencies={filterDependencies.current}
                    module={props.module}
                    setKeyValueInCache={props.setKeyValueInCache}
                    cache={props.cache}
                    uniqueArticleKey={uniqueArticleKey}
                    setSelectedPPCode={setSelectedPPCode}
                    setDisplayStoreSizeContribution={
                      setDisplayStoreSizeContribution
                    }
                    setPpSelectionState={setPpSelectionState}
                  />
                )
              }
              sizeColumnsToFitFlag={true}
            />
          )}
        {props.tabState === 1 &&
          !isEmpty(filterDependencies.current) &&
          !unmount && (
            <AgGridComponent
              columns={userCreatedColumns}
              uniqueRowId={"pp_code"}
              manualCallBack={(body, pageIndex) =>
                manualCallBackUserCreated(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSize || 10}
              onEditClick={(tableInfo) => editProductProfile(tableInfo)}
              callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
              loadTableInstance={loadUserTableInstance}
              isEditDisabled={enableEdit}
              isDeleteDisabled={disabledDelete}
              paginationPageSize={props.pageSize}
              skipAutoSizeColumn
              tableHeader="Details Table"
              topRightOptions={props.topRightPPDetailsTableOptions}
              topCenterOptions={props.topCenterOptions}
              nestedTable={ppSelectionState.ppInDetailsTable}
              nestedTableComponent={
                <StoreSizeContributionComponent
                  key={"details-child-table"}
                  tabState={props.tabState}
                  selectedPPCode={selectedPPCode}
                  filterDependencies={filterDependencies.current}
                  module={props.module}
                  setKeyValueInCache={props.setKeyValueInCache}
                  cache={props.cache}
                  uniqueArticleKey={uniqueArticleKey}
                  setSelectedPPCode={setSelectedPPCode}
                  setDisplayStoreSizeContribution={
                    setDisplayStoreSizeContribution
                  }
                  setPpSelectionState={setPpSelectionState}
                  tableContext="DETAILS"
                />
              }
              sizeColumnsToFitFlag={true}
            />
          )}
      </div>
      <div>
        {props.showIASavedAsUserCreated &&
          props.tabState === 1 &&
          !isEmpty(filterDependencies.current) &&
          !unmount && (
            <AgGridComponent
              columns={iaEditsSavedColumns}
              uniqueRowId={"pp_code"}
              manualCallBack={(body, pageIndex) =>
                manualCallBackIAEditsSaved(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSize || 10}
              callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
              loadTableInstance={loadIAEditsTableInstance}
              isDeleteDisabled={disabledDelete}
              paginationPageSize={props.pageSize}
              tableHeader="IA Product Profile Edits"
              topCenterOptions={props.topCenterOptions}
              nestedTable={ppSelectionState.ppInIAEditsTable}
              nestedTableComponent={
                <StoreSizeContributionComponent
                  key={"ia-edits-child-table"}
                  tabState={props.tabState}
                  selectedPPCode={selectedPPCodeIAEdits}
                  filterDependencies={filterDependencies.current}
                  module={props.module}
                  setKeyValueInCache={props.setKeyValueInCache}
                  cache={props.cache}
                  uniqueArticleKey={uniqueArticleKey}
                  setSelectedPPCode={setSelectedPPCodeIAEdits}
                  setDisplayStoreSizeContribution={
                    setDisplayStoreSizeContribution
                  }
                  isIASavedAsUserCreated={props.showIASavedAsUserCreated}
                  setPpSelectionState={setPpSelectionState}
                  tableContext="IA_EDITS"
                />
              }
              sizeColumnsToFitFlag={true}
            />
          )}
      </div>
      <Prompt
        handleClose={() => setShowDeleteDialog(false)}
        onPrimaryButtonClick={() => {
          confirmDeleteUserProductProfiles();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        title={`Delete ${dynamicLabelsBasedOnTenant("article")} Profile`}
        variant="warning"
        isOpen={showDeleteDialog}
      >
        {DELETE_MESSAGE}
      </Prompt>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    tableDataIARecommended:
      inventorysmartReducer.productProfileDashboardReducer
        .tableDataIARecommended,
    tableDataUserCreated:
      inventorysmartReducer.productProfileDashboardReducer.tableDataUserCreated,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    showIASavedAsUserCreated:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.showIASavedAsUserCreated,
    createPPTenantAttrs:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setProductProfileTableLoader: (body) =>
      dispatch(setProductProfileTableLoader(body)),
    getIARecommededTableData: (body) =>
      dispatch(getIARecommededTableData(body)),
    setIARecommendedTableData: (body) =>
      dispatch(setIARecommendedTableData(body)),
    getUserCreatedTableData: (body) => dispatch(getUserCreatedTableData(body)),
    setUserCreatedTableData: (body) => dispatch(setUserCreatedTableData(body)),
    deleteUserProductProfile: (id) => dispatch(deleteUserProductProfile(id)),
    getIAEditsSavedData: (body) => dispatch(getIAEditsSavedData(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DashboardTable);
