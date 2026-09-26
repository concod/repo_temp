import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";

import { Button, Grid } from "@mui/material";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty, isObject } from "lodash";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  DIALOG_CANCEL_BTN_TEXT,
  DIALOG_FINALIZE_BTN_TEXT,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
  setSelectedFilters,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  finalizeOrderBatchingData,
  getOrderBatchingTableConfiguration,
  getOrderBatchingTableData,
  setInventorysmartOrderBatchingTableConfigLoader,
  setInventorysmartOrderBatchingTableDataLoader,
  setInventorysmartReloadOrderBatchingData,
  setInventorysmartUpdateOrderBatchingLoader,
  setOrderBatchingTableConfig,
  setOrderBatchingTableData,
  updateOrderBatchingData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import OrderBatchingSetAllModal from "./OrderBatchingSetAllModal";
import { generateXMLDataForDownload } from "../../Finalize-Allocation";
import {
  uploadInv,
  uploadPO,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  filterByProperties,
  removeDuplicatesByProperty,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { useCallback } from "react";
import { isNonPrimitiveArray } from "../../Create-Allocation/helperFunctions";

const ViewCurrentAllocationsTables = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();

  const articleTableGridInstance = useRef(null);

  const [orderBatchingTableColumns, setOrderBatchingTableColumns] = useState(
    []
  );
  const [orderBatchingTableData, setOrderBatchingData] = useState([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [filterData, setFilterData] = useState({});
  const [initialTableData, setInitialTableData] = useState({});
  const [formData, setFormData] = useState({});
  const [concatAlertMessage, setConcatAlertMessage] = useState("");

  const redirectToFinalizeScreen = (value) => {
    setSelectedFilters(props.selectedFilters);
    setRedirectedFrom("Order Batching");
    setInventorySmartFinalizeFilterDependency(
      props.inventorysmartOrderBatchingFilterDependency
    );
    history.push(
      `${CREATE_ALLOCATION}?step=1&allocation_code=${value.allocation_code}`
    );
  };

  const actionMap = {
    allocation_name: redirectToFinalizeScreen,
  };

  const uploadMapping = {
    po: props.uploadPO,
    invn: props.uploadInv,
  };

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerValueGetter: (params) => `${params.colDef.headerName}`,
      minWidth: 220,
      cellRendererParams: {
        suppressCount: true,
      },
    };
  }, []);

  useEffect(() => {
    if (
      props?.inventorysmartScreenConfig?.order_triage?.drillDown?.showPlanFilter
    ) {
      setConcatAlertMessage(
        "Only the plans selected in the filter will be eligible for finalization"
      );
    }
  }, [
    props?.inventorysmartScreenConfig?.order_triage?.drillDown?.showPlanFilter,
  ]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && fetchOrderBatchingTableData();
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData &&
      fetchOrderBatchingTableData();
  }, [props.inventorysmartReloadOrderBatchingData]);

  const uploadXML = async (p_output) => {
    try {
      let l_uploadableFiles =
        props?.inventorysmartScreenConfig?.finalize?.upload;
      let l_apis = [];
      let l_xmlData = generateXMLDataForDownload(p_output);
      for (let i of l_uploadableFiles) {
        l_apis.push(p_output[i] ? uploadMapping[i](l_xmlData[i]) : null);
      }
      Promise.all(l_apis)
        .then((values) => {
          displaySnackMessages("Files Uploaded Successfully!!", "success");
        })
        .catch((error) => {
          displaySnackMessages("Error in Uploading Files!!", "error");
        });
    } catch (err) {
      console.log(err, "dciugyuy");
    }
  };

  const updateOrderStatus = async (articles, status) => {
    try {
      props.setInventorysmartUpdateOrderBatchingLoader(true);

      let changedArticles = [];
      for (let i = 0; i < articles?.length; i++) {
        if (
          articles[i]?.order_type?.value !==
          props.orderBatchingData?.data[i]?.order_type?.value ||
          articles[i]?.delivery_dt !==
          props.orderBatchingData?.data[i]?.delivery_dt
        ) {
          changedArticles.push(articles[i]);
        }
      }
      const orderArticles = changedArticles?.map((item) => {
        return {
          article: item.article,
          store: item.store,
          allocation_code: item.allocation_code,
          delivery_dt: item?.delivery_dt
            ? moment(item.delivery_dt).format("MM/DD/YYYY")
            : null,
          order_type: item?.order_type?.value
            ? item.order_type.value
            : item.order_type,
        };
      });

      let allocationName = props.allocationName;

      if (props.isNameMandatory && !allocationName) {
        displaySnackMessages("Please Enter Allocation Plan Name", "error");
        props.setInventorysmartUpdateOrderBatchingLoader(false);
        return;
      }

      let body = {
        payload: [...orderArticles],
        allocationName,
        status,
      };
      let response = await props.updateOrderBatchingData(body);
      if (response.data.status) {
        if (status === 3) {
          const allocationCodes = [];
          let l_filteredAllocationRows = cloneDeep(orderBatchingTableData);
          if (
            formData?.user_id?.length ||
            formData?.allocation_plan_name?.length
          ) {
            l_filteredAllocationRows = filterByProperties(
              orderBatchingTableData,
              {
                allocation_code: formData?.allocation_plan_name,
                user_id: formData?.user_id,
              }
            );
          }
          l_filteredAllocationRows.forEach((article) => {
            if (allocationCodes.indexOf(article.allocation_code) === -1) {
              allocationCodes.push(article.allocation_code);
            }
          });

          const payload = allocationCodes.map((code) => {
            return { allocation_code: code };
          });

          const finalizeResponse = await props.finalizeOrderBatchingData({
            payload,
            allocation_name: allocationName,
          });

          if (!finalizeResponse.data?.status) {
            const err_msg = finalizeResponse?.data.message;
            displaySnackMessages(err_msg, "error");
            props.setInventorysmartUpdateOrderBatchingLoader(false);
          } else {
            if (!isEmpty(finalizeResponse.data.data.output)) {
              uploadXML(finalizeResponse.data.data.output);
            }

            displaySnackMessages("Allocation has been finalized", "success");
          }
        } else {
          displaySnackMessages("Allocation data has been updated", "success");
        }
        props.setInventorysmartUpdateOrderBatchingLoader(false);
        props.setInventorysmartReloadOrderBatchingData(true);

        setTimeout(() => {
          props.setInventorysmartReloadOrderBatchingData(false);
        }, 1000);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setInventorysmartUpdateOrderBatchingLoader(false);
      }
    } catch (err) {
      let err_msg = err.response.status == 412 ? "Plan Already Finialized Can't Finalize Again" : ERROR_MESSAGE;
      displaySnackMessages(err_msg, err.response.status == 412 ? "info" : "error");
      props.setInventorysmartUpdateOrderBatchingLoader(false);
    }
  };

  const handleSave = () => {
    updateOrderStatus(orderBatchingTableData, 2);
  };

  const handleFinalizingOrder = async () => {
    updateOrderStatus(orderBatchingTableData, 3);
  };

  const formatOrderBatchingTableColumns = (columns) => {
    props.setInventorysmartOrderBatchingTableConfigLoader(true);

    const orderTypeColumn = columns?.find(
      (column) => column.column_name === "order_type"
    );

    columns = columns?.map((column) => {
      if (column.column_name === "delivery_dt") {
        column.extra = {
          disablePast: true,
        };
      }

      return column;
    });
    if (orderTypeColumn) {
      setOrderTypeOptions([...orderTypeColumn?.extra?.options]);
    }

    let formattedColumns = agGridColumnFormatter(columns, null, actionMap);
    setOrderBatchingTableColumns(formattedColumns);
    props.setInventorysmartOrderBatchingTableConfigLoader(false);
  };

  const setFilterOptions = (p_tableData) => {
    let l_uniqueAllocationCodes = removeDuplicatesByProperty(
      p_tableData,
      "allocation_code"
    );
    let l_uniqueUserId = removeDuplicatesByProperty(p_tableData, "user_id");
    setFilterData({
      allocationCodes: l_uniqueAllocationCodes?.map((val) => {
        return {
          label: val?.allocation_name,
          value: val?.allocation_code,
          id: val?.allocation_code,
        };
      }),
      userId: l_uniqueUserId?.map((val) => {
        return {
          label: val?.user_id,
          value: val?.user_id,
          id: val?.user_id,
        };
      }),
    });
  };

  useEffect(() => {
    if (!isEmpty(orderBatchingTableData)) {
      setFilterOptions(orderBatchingTableData);
    }
  }, [orderBatchingTableData]);

  const fetchOrderBatchingTableData = async () => {
    try {
      props.setInventorysmartOrderBatchingTableDataLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      let response = await props.getOrderBatchingTableData(body);
      if (response.data.status) {
        formatOrderBatchingTableColumns(response?.data?.data?.table_config);
        response.data.data.orders = response?.data?.data?.orders?.map(
          (item, index) => {
            item.allocation_index = index;
            return item;
          }
        );
        setOrderBatchingData(cloneDeep(response.data.data.orders));
        props.setOrderBatchingTableData(response.data);
        setInitialTableData(cloneDeep(response.data.data.orders));
        props.setInventorysmartOrderBatchingTableDataLoader(false);
        return { data: response.data, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setInventorysmartOrderBatchingTableDataLoader(false);
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setInventorysmartOrderBatchingTableDataLoader(false);
      return [];
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();

    if (selections?.length > 0) {
      setButtonEnabled(true);
    } else {
      setButtonEnabled(false);
    }

    setSelectedArticles([...selections]);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
  };

  const FILTER_FOR_ALLOCATION_PLAN = useMemo(
    () => [
      {
        label: "User Name",
        accessor: "user_id",
        field_type: "dropdown",
        options: filterData?.userId,
        isMulti: true,
        isClearable: true,
        dropDownUp: true,
      },
      {
        label: "Allocation Plan Name",
        accessor: "allocation_plan_name",
        field_type: "dropdown",
        options: filterData?.allocationCodes,
        isMulti: true,
        isClearable: true,
        dropDownUp: true,
      },
    ],
    [filterData]
  );

  const handleChange = (p_data) => {
    let l_cascadedTableData = filterByProperties(initialTableData, {
      allocation_code: p_data?.allocation_plan_name,
      user_id: p_data?.user_id,
    });
    setFilterOptions(l_cascadedTableData);
    setFormData(p_data);
  };

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (Array.isArray(l_cellValue)) {
      return isNonPrimitiveArray(l_cellValue)
        ? l_cellValue.map((val) => val.label)?.join(" | ")
        : l_cellValue;
    } else if (isObject(l_cellValue)) {
      return l_cellValue.label;
    }
    return l_cellValue;
  }, []);

  const processHeaderForClipboard = useCallback((params) => {
    const l_colDef = params.column.getColDef();
    return l_colDef.headerName;
  }, []);

  return (
    <>
      <Loader
        loader={
          props.inventorysmartOrderBatchingTableConfigLoader ||
          props.inventorysmartOrderBatchingTableDataLoader ||
          props.inventorysmartUpdateOrderBatchingLoader
        }
        minHeight={"120px"}
      >
        {!props.inventorysmartOrderBatchingTableConfigLoader &&
          !props.inventorysmartOrderBatchingTableDataLoader &&
          !props.inventorysmartUpdateOrderBatchingLoader && (
            <AgGridComponent
              processCellCallbackForExcel
              processCellForClipboard={processCellForClipboard}
              processHeaderForClipboard={processHeaderForClipboard}
              downloadAsExcel
              columns={orderBatchingTableColumns}
              rowdata={orderBatchingTableData}
              selectAllHeaderComponent={
                !props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB")
              }
              onSelectionChanged={onSelectionChanged}
              rowSelection="multiple"
              autoGroupColumnDef={autoGroupColumnDef}
              groupDisplayType={"multipleColumns"}
              uniqueRowId={"allocation_index"}
              loadTableInstance={loadTableInstance}
              pagination={false}
            />
          )}

        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          className={globalClasses.marginAround}
        >
          {!props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB") && (
            <Button
              variant="contained"
              color="primary"
              disabled={!buttonEnabled || !orderBatchingTableData?.length}
              className={classes.button}
              onClick={() => setShowSetAllModal(true)}
            >
              Set All
            </Button>
          )}
          {!props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB") && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              disabled={!orderBatchingTableData?.length}
              className={classes.button}
              onClick={() => handleSave()}
            >
              Save
            </Button>
          )}
        </Grid>
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          {props?.inventorysmartScreenConfig?.order_triage?.drillDown
            ?.showPlanFilter && (
              <div className={classes.contentBody}>
                <Form
                  maxFieldsInRow={2}
                  layout={"vertical"}
                  handleChange={handleChange}
                  fields={FILTER_FOR_ALLOCATION_PLAN}
                  updateDefaultValue={true}
                  defaultValues={{}}
                ></Form>
              </div>
            )}
        </Grid>
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          className={globalClasses.marginAround}
        >
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            disabled={!orderBatchingTableData?.length}
            className={classes.button}
            onClick={() => setShowFinalizePopup(true)}
          >
            Finalize For Order Generation
          </Button>
        </Grid>
      </Loader>
      <Prompt
        isOpen={showFinalizePopup}
        title="Confirm Finalizing Allocations"
        subHeading={`Are you sure you want to finalize these allocations? ${concatAlertMessage}`}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_FINALIZE_BTN_TEXT,
          onClick: () => {
            handleFinalizingOrder();
            setShowFinalizePopup(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_CANCEL_BTN_TEXT,
          onClick: () => setShowFinalizePopup(false),
        }}
      />
      {showSetAllModal && (
        <OrderBatchingSetAllModal
          showSetAllModal={showSetAllModal}
          orderTypeOptions={orderTypeOptions}
          setShowSetAllModal={setShowSetAllModal}
          agGridInstance={articleTableGridInstance.current}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    inventorysmartOrderBatchingTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingTableConfigLoader,
    inventorysmartOrderBatchingTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingTableDataLoader,
    inventorysmartUpdateOrderBatchingLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartUpdateOrderBatchingLoader,
    orderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .orderBatchingTableData,
    inventorysmartOrderBatchingFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterDependency,
    allocationName:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .allocationName,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_allocation
        ?.isNameMandatory,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingTableConfiguration: (payload) =>
    dispatch(getOrderBatchingTableConfiguration(payload)),
  getOrderBatchingTableData: (payload) =>
    dispatch(getOrderBatchingTableData(payload)),
  updateOrderBatchingData: (payload) =>
    dispatch(updateOrderBatchingData(payload)),
  finalizeOrderBatchingData: (payload) =>
    dispatch(finalizeOrderBatchingData(payload)),
  setInventorysmartOrderBatchingTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingTableConfigLoader(payload)),
  setInventorysmartOrderBatchingTableDataLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingTableDataLoader(payload)),
  setInventorysmartUpdateOrderBatchingLoader: (payload) =>
    dispatch(setInventorysmartUpdateOrderBatchingLoader(payload)),
  setOrderBatchingTableConfig: (payload) =>
    dispatch(setOrderBatchingTableConfig(payload)),
  setOrderBatchingTableData: (payload) =>
    dispatch(setOrderBatchingTableData(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setInventorysmartReloadOrderBatchingData: (payload) =>
    dispatch(setInventorysmartReloadOrderBatchingData(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  uploadPO: (payload) => dispatch(uploadPO(payload)),
  uploadInv: (payload) => dispatch(uploadInv(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewCurrentAllocationsTables);
