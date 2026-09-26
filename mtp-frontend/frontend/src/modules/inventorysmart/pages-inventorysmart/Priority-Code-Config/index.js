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
import { Button } from "@mui/material";
import {
  getPriorityCodeList,
  setPriorityCodesFilterConfiguration,
  updatePriorityCode,
  getPriorityCodeTableConfig,
  DownloadRequest,
} from "modules/inventorysmart/services-inventorysmart/Priority-Code-Configuration/priority-code-configuration-service";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import "./priority-code-config.scss";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import PriorityCodeScreenSetAllModal from "./PriorityCodeScreenSetAllModal";
import {
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import moment from "moment";
const PriorityCodeConfig = (props) => {
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
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const addUniqueKey = (response) => {
    return response?.data?.data.map((item) => {
      item.unique_key = `${item.article}-${item.store_code}`;
      return item;
    });
  };

  /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
    setFilters(dependencyData);
    const payload = {
      tableConfigName: "priority_code_configuration",
    };
    let response = await props.getPriorityCodeTableConfig(payload);

    let cols = response?.data?.data;
    const currentChannel = dependencyData
      .filter((item) => item.attribute_name === "channel")
      .map((item) => item.values)?.[0];
    const updatedOptions =
      props.inventorysmartScreenConfig.priority_code_options?.options[
        currentChannel[0]
      ];
    let updatedColumnDefs = cols.map((item) => {
      if (item.column_name === "priority_code") {
        return {
          ...item,
          options: updatedOptions || item.extra.options,
          extra: {
            ...item.extra,
            options: updatedOptions || item.extra.options,
          },
        };
      }
      return item;
    });

    let formattedColumns = agGridColumnFormatter(updatedColumnDefs, null);
    setColumnDefs(formattedColumns);
    setIsLoading(true);
    setRender(true);
    setIsLoading(false);
  };

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
      const priorityCodeFilters = await fetchFilterFieldValues(
        "priority_code_configuration",
        props.savedFilterSelection
      );
      //Assign only the required filters present in the filters data
      //to the filter dependency ref
      onFilterDependency.current = getRequiredFilterList(
        priorityCodeFilters,
        dependency
      );
      if (!isEmpty(onFilterDependency.current)) {
        //If the filter dependency is not empty, we are triggering the manualcallback for
        //the filters related data
        tableInstance?.current.api?.refreshServerSideStore({ purge: false });
      }
      props.setPriorityCodesFilterConfiguration(priorityCodeFilters);
      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: priorityCodeFilters,
            isCrossDimensionFilter: true,
            screen_name: "priority_code_configuration",
            saved_filter_screen_name: "priority_code_configuration",
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "priority_code_configuration",
          filterConfigData,
          "priority_code_configuration"
        );
        props.setFilterConfiguration(filterConfig);
      }
    };
    fetchData();
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
            priority_code: item.priority_code,
            instore_date: moment(item.instore_date).format("MM-DD-YYYY")
          };
        }),
        checkAll: false,
        unCheckedRows: [],
        application_code: 1,
      };
      await props.updatePriorityCode(postBody);
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
                priority_code: item.priority_code,
                instore_date: item.instore_date,
              };
            }),
        checkAll: checkAll,
        unCheckedRows: [],
        application_code: 1,
      };

      if (checkAll) {
        postBody = {
          ...postBody,
          priority_code: p_editedRows.priority_code,
          instore_date: p_editedRows.instore_date,
          unCheckedRows: p_editedRows.unCheckedRows || [],
          meta: p_editedRows.meta || [],
        };
      }

      let l_response = await props?.updatePriorityCode(postBody);

      if (l_response?.data?.status) {
        displaySnackMessages("Edits Saved Successfully", "success");
        refreshCells && refreshCells();
        tableInstance?.current.api?.refreshServerSideStore({ purge: false });
        setRender(true);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
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
      };

      setRequestBody(body);
      let response = await getPriorityCodeList(body)();
      if (response.data.status) {
        const finalData = addUniqueKey(response);
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = getSelectedRowsForInfiniteRowModel(event);
    setButtonEnabled(selections?.length);
  };

  return (
    <>
      <CoreComponentScreen
        pageLabel={"Priority Code Setup"}
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"priority_code_configuration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      />
      <LoadingOverlay loader={isLoading} spinner>
        {showSetAllModal && (
          <PriorityCodeScreenSetAllModal
            setShowSetAllModal={setShowSetAllModal}
            agGridInstance={tableInstance.current}
            filters={filters}
            onSaveHandler={onSetAllSaveHandler}
            displaySnackMessages={displaySnackMessages}
            columns={columnDefs}
            inventorysmartScreenConfig={props.inventorysmartScreenConfig}
          />
        )}
        {render && (
          <div className="priority-code-config">
            <div className="ag-theme-alpine">
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
                rowSelection={"multiple"}
                onRowSelected
                cacheBlockSize={10}
                selectAllHeaderComponent
                onCellValueChanged={onCellValueChanged}
                onSelectionChanged={onSelectionChanged}
              />
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
        "priority_code_configuration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      state.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setFilterConfiguration,
      setPriorityCodesFilterConfiguration,
      getColumnsAg,
      addSnack,
      updatePriorityCode,
      DownloadRequest,
      getPriorityCodeTableConfig,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(PriorityCodeConfig);
