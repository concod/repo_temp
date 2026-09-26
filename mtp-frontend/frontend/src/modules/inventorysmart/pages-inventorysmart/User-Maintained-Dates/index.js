import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getRequiredFilterList,
} from "core/commonComponents/coreComponentScreen/utils";
import { isEmpty } from "lodash";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import {
  getProductLifeCycleList,
  setInventorySmartApplicationLifeCycleFilterConfiguration,
  updateProductLifeCycleDates,
  DownloadRequest,
  productLifeCycleCheckDownload,
  userMaintainedDatesCount,
  setAllTableData
} from "modules/inventorysmart/services-inventorysmart/Application-Lifecycle/application-lifecycle-service";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import "./user-maintained-dates.scss";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import UserMaintainedDatesSetAllModal from "./UserMaintainedDatesSetAllModal";
import NoDatesToggle from "./NoDatesToggle";
import { ERROR_MESSAGE, defaultTableData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const UserMaintainedDates = (props) => {
  const dateOptions = [
    {
      label: "Clearance Date",
      value: "clearance_date",
    },
    {
      label: "Mark Down Date",
      value: "markdown_date",
    },
    {
      label: "Floorset Date",
      value: "launch_date",
    },
  ];

  const [columnDefs, setColumnDefs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const onFilterDependency = useRef(null);
  const tableInstance = useRef(null);
  const [editedRows, setEditedRows] = useState([]);
  const classes = useStyles();
  const [filters, setFilters] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [requestBody, setRequestBody] = useState([]);
  const refForFilter = useRef({});
  const [toggleActive, setToggleActive] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(dateOptions);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [isDownloadDisabled, setIsDownloadDisable] = useState(true);
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [saveJobId, setJobId] = useState("");
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState("");
  const [displaySetAllRecordCount, setDisplaySetAllRecordCount] = useState(0);
  const [setAllPayload, saveSetAllPayload] = useState({body:{}});
  const [loader, setLoader] = useState(false);

  const addUniqueKey = (response) => {
    return response?.data?.data.map(item => {
      item.unique_key = `${item.article}-${item.store_code}`;
        return item;
    })
  }

  /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
    setFilters(dependencyData);
    fetchColumns();
    setIsLoading(true);
    setRender(true);
    setIsLoading(false);
  };

  const fetchColumns = async () => {
    const cols = await props.getColumnsAg("table_name=product_life_cycle");
    cols.forEach((col) => {
      if (col.type === "multiple_daterangepicker") {
        col.cellRenderer = (instance) => {
          return (
            <CellRenderer
              cellData={instance}
              column={col}
              onCellValueChanged={onCellValueChanged}
            ></CellRenderer>
          );
        };
      }
    });
    setColumnDefs(cols);
  }

  useEffect(() => {
    setRender(false);
  }, [filters]);

  useEffect(() => {
    if (!isEmpty(filters) && !render) {
      setRender(true);
    }
  }, [render]);

  useEffect(async () => {
    let dependency = props.savedFilterSelection || [];
    const fetchData = async () => {
      const userMaintainedFilters = await fetchFilterFieldValues(
        "Product Life Cycle",
        props.savedFilterSelection
      );
      //Assign only the required filters present in the filters data
      //to the filter dependency ref
      onFilterDependency.current = getRequiredFilterList(
        userMaintainedFilters,
        dependency
      );
      if (!isEmpty(onFilterDependency.current)) {
        //If the filter dependency is not empty, we are triggering the manualcallback for
        //the filters related data
        tableInstance?.current.api?.refreshServerSideStore({ purge: false });
      }
      props.setInventorySmartApplicationLifeCycleFilterConfiguration(
        userMaintainedFilters
      );
      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: userMaintainedFilters,
            isCrossDimensionFilter: true,
            screen_name: "Product Life Cycle",
            saved_filter_screen_name: "Product Life Cycle",
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "productLifeCycleFilterConfig",
          filterConfigData,
          "Product Life Cycle"
        );
        props.setFilterConfiguration(filterConfig);
      }
    };
    fetchData();
    fetchColumns();
  }, []);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onSaveHandler = async () => {
    try {
      setIsLoading(true);
      let postBody = {
        filters: filters,
        checkedRows: editedRows.map((item) => {
          return {
            article: item.article,
            store_code: item.store_code,
            l0_name: item.l0_name,
            markdown_date: item.markdown_date || [],
            clearance_date: item.clearance_date || [],
            launch_date:
              typeof item.launch_date !== "string"
                ? item.launch_date?.format("YYYY-MM-DD") || ""
                : item.launch_date || "",
          };
        }),
        checkAll: false,
        unCheckedRows: [],
        application_code: 1,
      };
      await props.updateProductLifeCycleDates(postBody);
      tableInstance?.current?.api?.refreshServerSideStore({
        purge: false,
      });
      setEditedRows([]);
      setIsLoading(false);
      displaySnackMessages("Data saved successfully", "success");
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      displaySnackMessages("Error while saving the data", "error");
    }
  };

  const onSetAllSaveHandler = async (
    p_editedRows,
    checkAll = false,
    refreshCells = null
  ) => {
    try {
      setIsLoading(true);
      let postBody = {
        filters: filters,
        checkedRows: checkAll
          ? []
          : p_editedRows?.map((item) => {
              return {
                article: item.article,
                store_code: item.store_code,
                l0_name: item.l0_name,
                markdown_date: item.markdown_date || [],
                clearance_date: item.clearance_date || [],
                launch_date:
                  typeof item.launch_date !== "string"
                    ? item.launch_date?.format("YYYY-MM-DD") || ""
                    : item.launch_date || "",
              };
            }),
        checkAll: checkAll,
        unCheckedRows: [],
        application_code: 1,
      };

      if (checkAll) {
        postBody = {
          ...postBody,
          markdown_date: p_editedRows.markdown_date || [],
          clearance_date: p_editedRows.clearance_date || [],
          launch_date:
          typeof p_editedRows.launch_date !== "string"
          ? p_editedRows.launch_date?.format("YYYY-MM-DD") || ""
          : p_editedRows.launch_date || "",
          unCheckedRows: p_editedRows.unCheckedRows || [],
          meta: p_editedRows.meta || [],
        };
      }


      let l_response = await props?.updateProductLifeCycleDates(postBody);

      if (l_response?.data?.status) {
        displaySnackMessages("Edits Saved Successfully", "success");
        refreshCells && refreshCells();
        tableInstance?.current.api?.refreshServerSideStore({ purge: false });
        setRender(true);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      console.log(">>>>>", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setIsLoading(false);
      setEditedRows({});
    }
  };

  /**
   *
   * @param {object} params
   *
   * This function maintain the updated data if any date cells are edited.
   */
  const onCellValueChanged = (params) => {
    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) =>
            item.store_code === params.data.store_code &&
            item.article === params.data.article
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (
              item.store_code === params.data.store_code &&
              item.article === params.data.article
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const setAllRequest = () => {
    let checkSelection =
      tableInstance?.current?.api?.getSelectedNodes()?.length > 0
        ? true
        : false;
    if (checkSelection) {
      setShowSetAllModal(true);
    } else {
      displaySnackMessages("Please select atleast one row", "error");
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setIsLoading(true);
      let body = {
        filters: filters,
        meta: manualbody
          ? {
              ...manualbody,
              sort:
                manualbody?.sort.length > 0
                  ? [manualbody.sort[0]]
                  : [
                      { column: "article", order: "asc" },
                      { column: "store_code", order: "asc" },
                    ],
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [
                { column: "article", order: "asc" },
                { column: "store_code", order: "asc" },
              ],
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        application_code: 1,
        no_date_filter: {
          clearance_date: false,
          markdown_date: false,
          launch_date: false,
        },
      };

      if (toggleActive) {
       
        body = {
          ...body,
          no_date_filter: refForFilter?.current?.filterConfig?.no_date_filter,
        };
      }
      setRequestBody(body);
      let response = await getProductLifeCycleList(body)();
      if (response.data.status) {
        let finalData = addUniqueKey(response);
        finalData = agGridRowFormatter(
          finalData,
           params?.api?.checkConfiguration,
          "uniqueKey"
        )
        if (pageIndex == 0) {
          if (response?.data?.data?.length)
            setIsDownloadDisable(false);
          else setIsDownloadDisable(true);
        }
        setTotalCount(response.data.total);
        setIsLoading(false);
        return { data: finalData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setIsLoading(false);
        setButtonEnabled(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log(err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setIsLoading(false);
      return defaultTableData;
    }
  };

  const downloadReport = async () => {
    try {
      await props.DownloadRequest(requestBody);
    } catch (err) {
      displaySnackMessages("Error while downloading", "error");
    }
  };

  const handleToggleSwitch = async (filterObject) => {
    try {
      refForFilter.current.filterConfig = filterObject;
      fetchColumns()
      setRender(false);
    } catch (err) {
      console.log(err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setIsLoading(false);
      return defaultTableData;
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = getSelectedRowsForInfiniteRowModel(event);
    setButtonEnabled(selections?.length);
  };

  const callSetAllApi = async (reqBody) => {
    try {
      
      setLoader(true);
        await props.setAllTableData({ body: reqBody, jobIdCheck: saveJobId });
        setLoader(false)
        setConfirmSetAll(false);
        //tableInstance.api.deselectAll(true);
        displaySnackMessages("Saved request is running in background. Please refresh the table once a notification is received","info");
      
    } catch (err) {
      //setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  const openConfirmationPopUp = () => {
   return (
     <Dialog
       open={confirmSetAll}
       onClose={() => setConfirmSetAll(false)}
       maxWidth="sm"
       fullWidth={true}
     >
       <DialogTitle>Confirm Set All</DialogTitle>
       <LoadingOverlay loader={loader}>
         <DialogContent>
           {Number(displaySetAllRecordCount) < 100000 ? (
             <Typography variant="h6">
               Set All operation is being applied for {displaySetAllSKUCount}{" "}
               number of Material/Material's{" "}
               {displaySetAllRecordCount
                 ? `and ${displaySetAllRecordCount} number of Material-Store combination.`
                 : ""}
               Please confirm to proceed.
             </Typography>
           ) : (
             <Typography variant="h6">
               Record Count is more than 100000. Please add some more filters
             </Typography>
           )}
         </DialogContent>
       </LoadingOverlay>
       <DialogActions>
         <Button
           variant="outlined"
           color="primary"
           onClick={() => setConfirmSetAll(false)}
         >
           Cancel
         </Button>
         {Number(displaySetAllRecordCount) < 100000 && (
           <Button
             variant="contained"
             color="primary"
             onClick={() => callSetAllApi(setAllPayload.body)}
           >
             Ok
           </Button>
         )}
       </DialogActions>
     </Dialog>
   );
  };

  const handleCountCheck= async (payload) => {
    payload = {...payload, meta: requestBody.meta }
    payload.meta.sort = []; //FIXME: removing the sort in case of setAll case because of BE limitation.
    setIsLoading(true);
    const notification = await props.userMaintainedDatesCount(payload)
    setConfirmSetAll(true);
    setIsLoading(false);
    setJobId(notification.data?.data?.job_id)
    setDisplaySetAllSKUCount(notification.data?.data?.sku_count)
    setDisplaySetAllRecordCount(notification.data?.data?.record_count)
    saveSetAllPayload({body:payload});
  }

  return (
    <>
      <CoreComponentScreen
        pageLabel={"User Maintained Dates"}
        showPageRoute={false}
        showPageHeader={true}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"productLifeCycleFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      />
      <LoadingOverlay loader={isLoading} spinner>
          {showSetAllModal && (
            <UserMaintainedDatesSetAllModal
              setShowSetAllModal={setShowSetAllModal}
              agGridInstance={tableInstance.current}
              filters={filters}
              onSaveHandler={onSetAllSaveHandler}
              displaySnackMessages={displaySnackMessages}
              userMaintainedDatesCount={props.userMaintainedDatesCount}
              setAllTableData={props.setAllTableData}
              handleCountCheck={handleCountCheck}
              loader={loader}
              setLoader={setLoader}
            />
          )}
          {render && (
          <div className="user-maintained-dates">
            <p className="user-maintained-dates__header">Filtered Stores</p>
            <div className="ag-theme-alpine" style={{ height: 400 }}>
              <div style={{ textAlign: "right", paddingBottom: "0.6rem" }}>
                <NoDatesToggle
                  handleToggleSwitch={handleToggleSwitch}
                  downloadReport={downloadReport}
                  dateOptions={dateOptions}
                  toggleActive={toggleActive}
                  setToggleActive={setToggleActive}
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                  columns={columnDefs}
                  productLifeCycleCheckDownload={props.productLifeCycleCheckDownload}
                  requestBody={requestBody}
                  isDownloadDisabled={isDownloadDisabled}
                />
              </div>
              <AgGridComponent
                loadTableInstance={loadTableInstance}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                serverSideStoreType="partial"
                rowModelType="serverSide"
                columns={columnDefs}
                pagination={true}
                uniqueRowId="unique_key"
                adjustTableHeight
                rowSelection={"multiple"}
                onRowSelected
                cacheBlockSize={10}
                selectAllHeaderComponent
                onCellValueChanged={onCellValueChanged}
                onSelectionChanged={onSelectionChanged}
                rowHeight={52}
              />
              {confirmSetAll && openConfirmationPopUp()}
              <div className={classes.buttonGroupWrapper}>
                <Button
                variant="contained"
                color="primary"
                className={classes.button}
                disabled={!buttonEnabled}
                onClick={() => setShowSetAllModal(true)}
              >
                Set Bulk Edit
              </Button>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={isEmpty(editedRows)}
                  className={classes.button}
                  onClick={() => onSaveHandler()}
                >
                  Save Grid Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productLifeCycleFilterConfig"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setFilterConfiguration,
      setInventorySmartApplicationLifeCycleFilterConfiguration,
      getColumnsAg,
      addSnack,
      updateProductLifeCycleDates,
      DownloadRequest,
      productLifeCycleCheckDownload,
      userMaintainedDatesCount,
      setAllTableData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserMaintainedDates);
