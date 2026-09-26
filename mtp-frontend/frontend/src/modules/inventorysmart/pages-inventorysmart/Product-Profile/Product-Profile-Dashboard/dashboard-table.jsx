import Paper from "@mui/material/Paper";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";

import { CREATE_PRODUCT_PROFILE } from "../../../constants-inventorysmart/routesConstants";
import {
  DELETE_MESSAGE,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "../../../constants-inventorysmart/stringConstants";
import {
  deleteUserProductProfile,
  getIARecommededTableData,
  getStoreSizeContributionData,
  getStoreSizeContributionForUserData,
  getUserCreatedTableData,
  setIARecommendedTableData,
  setProductProfileTableLoader,
  setStoreSizeContributionData,
  setUserCreatedTableData,
} from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import StoreSizeContributionComponent from "./store-size-contribution";

import { Prompt } from "impact-ui";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";

const DashboardTable = (props) => {
  const [iaRecommendedColumns, setIARecommendedColumns] = useState([]);
  const [userCreatedColumns, setUserCreatedColumns] = useState([]);
  const agGridInstance = useRef(null);
  const agGridUserInstance = useRef(null);
  const [displayStoreSizeContribution, setDisplayStoreSizeContribution] =
    useState(false);
  const [selectedPPCode, setSelectedPPCode] = useState("");
  const [queryParam,setQueryparam]=useState({})
  const [hideTables, setHideTables] = useState(false);
  const filterDependencies = useRef({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState([]);

  const globalClasses = globalStyles();

  const history = useHistory();

  useEffect(() => {
    // do not call table config api when tabs are switched but no hierarchy is selected
    if (!isEmpty(props.selectedDependencyValue)) {
      props.setProductProfileTableLoader(true);
      if (props.tabState === 0)
        (async () => {
          setDisplayStoreSizeContribution(false);
          let iaRecommendedColDef = await getColumnsAg(
            "table_name=product_profile_ia_table"
          )();
          iaRecommendedColDef = setFirstColumnToBeClickable(
            iaRecommendedColDef,
            props.tabState
          );
          setIARecommendedColumns(iaRecommendedColDef);
        })();
      else
        (async () => {
          setDisplayStoreSizeContribution(false);
          let userCreatedColDef = await getColumnsAg(
            "table_name=product_profile_user_table"
          )();
          userCreatedColDef = setFirstColumnToBeClickable(
            userCreatedColDef,
            props.tabState
          );
          setUserCreatedColumns(userCreatedColDef);
        })();
    }
  }, [props.tabState, props.selectedDependencyValue]);

  const setFirstColumnToBeClickable = (tableColumns, tabVal) => {
    return tableColumns.map((item) => {
      if (
        tabVal === 0
          ? item.column_name === "article"
          : item.column_name === "name"
      ) {
        item.type = "link";
        item.cellRenderer = (cellProps) => {
          if (cellProps.value !== undefined) {
            return (
              <CellRenderers cellData={cellProps} column={item}></CellRenderers>
            );
          }
          else {
            return <img src="https://www.ag-grid.com/example-assets/loading.gif" />;
          }
        };
        item.onClick = async (tableInfo) => {
          setSelectedPPCode(tableInfo.cellData.data.pp_code);
          props.setProductProfileTableLoader(true);
          let q_params = {
            pp_code: tableInfo.cellData.data?.pp_code,
            channel: tableInfo.cellData.data?.channel?.toString(),
            metrics: "sale",
            store_attributes: props.selectedDependencyValue?.store_attributes,
          };
          let response = {};
          try {
            if (props.tabState === 0) {
              response = await props.getStoreSizeContributionData(q_params);
            } else {
              setQueryparam(q_params)
              response = await props.getStoreSizeContributionForUserData(
                q_params
              );
            }
            setDisplayStoreSizeContribution(response.data.status);
            props.setStoreSizeContributionData(response.data.data);
          } catch (e) {
            props.setProductProfileTableLoader(false);
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        };
      }
      return item;
    });
  };

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      setHideTables(false);
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      agGridUserInstance.current?.api?.refreshServerSideStore({ purge: true });
      // add a condition to call this oly when its on the same page, to avoid being called twice
      if (
        !isEmpty(props.tableDataIARecommended) ||
        !isEmpty(props.tableDataUserCreated)
      ) {
        if (props.tabState === 0)
          manualCallBackIARecommended(props.selectedDependencyValue.meta, 0);
        else {
          manualCallBackUserCreated(props.selectedDependencyValue.meta, 0);
        }
      }
    } else {
      // setting ref to empty
      filterDependencies.current = {};
      setHideTables(true);
      setDisplayStoreSizeContribution(false);
    }
  }, [props.selectedDependencyValue]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const loadUserTableInstance = (params) => {
    agGridUserInstance.current = params;
  };

  const manualCallBackIARecommended = async (manualbody, pageIndex) => {
    if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("MPIARecommendedDetailsTable")) {
      pageIndex == 0 && props.setProductProfileTableLoader(true);
    }
    else {
      props.setProductProfileTableLoader(true);
    }
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      product_attributes: !isEmpty(filterDependencies.current)
        ? filterDependencies.current?.product_attributes
        : [],
      store_attributes: !isEmpty(filterDependencies.current)
        ? filterDependencies.current?.store_attributes
        : [],
    };

    try {
      let response = await props.getIARecommededTableData(body);
      props.setIARecommendedTableData(response.data.data);
      props.setProductProfileTableLoader(false);
      return {
        data: response.data.data,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setProductProfileTableLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackUserCreated = async (manualbody, pageIndex) => {
    if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("MPUserCreatedDetailsTable")) {
      pageIndex == 0 && props.setProductProfileTableLoader(true);
    }
    else {
      props.setProductProfileTableLoader(true);
    }
    let body = {
      meta: {
        ...manualbody,
        sort: isEmpty(manualbody.sort)
          ? [{ column: "created_at", order: "desc" }]
          : manualbody.sort,
        limit: { limit: 10, page: pageIndex + 1 },
      },
      product_attributes: !isEmpty(filterDependencies.current)
        ? filterDependencies.current?.product_attributes
        : [],
      store_attributes: !isEmpty(filterDependencies.current)
        ? filterDependencies.current?.store_attributes
        : [],
    };

    try {
      let response = await props.getUserCreatedTableData(body);
      props.setUserCreatedTableData(response.data.data);
      props.setProductProfileTableLoader(false);
      let dateFormattedResponse = response.data.data?.map((item) => {
        return {
          ...item,
          created_at: moment(item.created_at).format("DD-MM-YYYY"),
        };
      });
      return {
        data: dateFormattedResponse,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setProductProfileTableLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const editProductProfile = (tableData) => {
    history.push({ pathname: CREATE_PRODUCT_PROFILE, state: tableData.data });
  };

  const onDeleteClick = (rowData) => {
    setDeleteInstance(rowData.pp_code);
    setShowDeleteDialog(true);
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
      } catch (err) {
        props.setProductProfileTableLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    callDelete();
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

  const disabledEdit = () => {
    let deletedEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
      "delete"
    );
    return !deletedEnabled;
  };

  return (
    <>
      <div className={globalClasses.marginAround}>
        {props.tabState === 0 &&
          !isEmpty(filterDependencies.current) &&
          !hideTables && (
            <Paper elevation={0}>
              <AgGridComponent
                columns={iaRecommendedColumns}
                uniqueRowId={"pp_code"}
                loadTableInstance={loadTableInstance}
                manualCallBack={(body, pageIndex) =>
                  manualCallBackIARecommended(body, pageIndex)
                }
                cacheBlockSize={10}
                sizeColumnsToFitFlag
                // no rowdata as its BE paginated
                // enabling infinite scroll for RL based on key available in response from smart screen config api
                {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                  "MPIARecommendedDetailsTable"
                )
                  ? {
                    pagination: false,
                    rowModelType: "infinite",
                    cacheOverflowSize: 2,
                    hideSelectCurrentPageRecords: true,

                  } :
                  {
                    rowModelType: "serverSide",
                    serverSideStoreType: "partial"
                  }
                )}
              />
            </Paper>
          )}
        {props.tabState === 1 &&
          !isEmpty(filterDependencies.current) &&
          !hideTables && (
            <Paper elevation={0}>
              <AgGridComponent
                columns={userCreatedColumns}
                uniqueRowId={"pp_code"}
                manualCallBack={(body, pageIndex) =>
                  manualCallBackUserCreated(body, pageIndex)
                }
                cacheBlockSize={10}
                onEditClick={(tableInfo) => editProductProfile(tableInfo)}
                callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
                loadTableInstance={loadUserTableInstance}
                isEditDisabled={enableEdit}
                isDeleteDisabled={disabledEdit}
                // to check if loadInstance is required, once we get proper data from api
                // enabling infinite scroll for RL based on key available in response from smart screen config api
                {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                  "MPUserCreatedDetailsTable"
                )
                  ? {
                    pagination: false,
                    rowModelType: "infinite",
                    cacheOverflowSize: 2,
                    hideSelectCurrentPageRecords: true,

                  } :
                  {
                    rowModelType: "serverSide",
                    serverSideStoreType: "partial"
                  }
                )}
              />
            </Paper>
          )}
        {(props.tabState === 0 || props.tabState === 1) && hideTables && <></>}
      </div>
      {displayStoreSizeContribution && (
        <div className={globalClasses.marginAround}>
          <StoreSizeContributionComponent
            tabState={props.tabState}
            queryParam={queryParam}
            selectedPPCode={selectedPPCode}
          />
        </div>
      )}
      <Prompt
        isOpen={showDeleteDialog}
        title={`Delete ${dynamicLabelsBasedOnTenant("article")} Profile`}
        subHeading={DELETE_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            confirmDeleteUserProductProfiles();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    tableDataIARecommended:
      inventorysmartReducer.productProfileDashboardReducer
        .tableDataIARecommended,
    tableDataUserCreated:
      inventorysmartReducer.productProfileDashboardReducer.tableDataUserCreated,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
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
    getStoreSizeContributionData: (pp_code) =>
      dispatch(getStoreSizeContributionData(pp_code)),
    setStoreSizeContributionData: (body) =>
      dispatch(setStoreSizeContributionData(body)),
    getUserCreatedTableData: (body) => dispatch(getUserCreatedTableData(body)),
    setUserCreatedTableData: (body) => dispatch(setUserCreatedTableData(body)),
    deleteUserProductProfile: (id) => dispatch(deleteUserProductProfile(id)),
    getStoreSizeContributionForUserData: (body) =>
      dispatch(getStoreSizeContributionForUserData(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DashboardTable);
