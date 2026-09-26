import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { setStoreDetailsTableData } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  getStoreView,
  saveShippingDates,
  saveCancelDates,
  setStoreViewLoader,
  savePriority,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  getIgnoreAllocationCode,
  shouldDisplayFinalizeButtons,
  shouldDisplayGridBulkEditButtons,
  shouldDisplaySelectComponent,
} from "../../Create-Allocation/helperFunctions";
import InvalidAllocation from "./InvalidAllocation";
import SetDatesComponent from "./SetDatesComponent";
import { Button, Grid } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import StoreSizeModal from "./StoreSizeModal";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const StoreDetailsTable = (props) => {
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const [storeDetailsTableColumns, setStoreDetailsTableColumns] = useState([]);
  const [storeDetailsTableData, setStoreTableData] = useState([]);
  const [storeViewResposne, setStoreViewResposne] = useState({});
  const [userEdits, setUserEdits] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const storeDetailsTableInstance = useRef(null);
  const [dcOptionsInSetAll, setDcOptionsInSetAll] = useState([]);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [deliveryDateInBulk, setDeliveryDateInBulk] = useState(false);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [modalColumns, setModalColumns] = useState([]);

  const DELIVERY_DATES_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "DCs",
        accessor: "dcs",
        field_type: "dropdown",
        options: dcOptionsInSetAll?.map((dcs) => {
          return {
            ...dcs,
            value: `shipping_date_${dcs?.value}`,
          };
        }),
        isMulti: true,
      },
      {
        label: storeDetailsTableColumns?.filter(
          (val) => val.column_name === "shipping_date__dc"
        )?.[0]?.label,
        accessor: "shipping_date",
        field_type: "DateTimeField",
        disablePast: true,
      },
      ...(props.showInSetAll?.includes("cancel_date")
        ? [
            {
              label: "Cancel Date",
              accessor: "cancel_date",
              field_type: "DateTimeField",
              disablePast: true,
            },
          ]
        : []),
      ...(props.showInSetAll?.includes("priority_code")
        ? [
            {
              label: "Priority Code",
              accessor: "priority_code",
              field_type: "dropdown",
              options: storeDetailsTableColumns?.filter(
                (val) => val.column_name === "priority_code_dc"
              )?.[0]?.extra?.options,
            },
          ]
        : []),
    ],
    [storeDetailsTableData, storeDetailsTableColumns]
  );

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    props.allocationCode &&
      (async () => {
        let columns = [],
          data = [];
        try {
          props.setStoreDetailsTableData(null);
          props.setStoreViewLoader(true);
          let l_response = await props.getStoreView(
            {
              allocation_code: props.allocationCode,
              article: props.articles,
              ignore_allocation_code: getIgnoreAllocationCode(
                props.originalAllocationCode,
                props.allocationCode
              ),
              plan_status: props.planStatus,
              plan_type: props.planType,
            },
            props.isV3?.includes("storeDetails")
          );
          if (l_response.data.status) {
            let l_responseData = l_response.data.data;
            setModalColumns(l_responseData);
            columns = l_responseData.table_config;
            data = l_responseData.table_data;
            data.forEach((item, index) => (item.index = index));
            props.setStoreDetailsTableData(data);
            setStoreViewResposne(l_response.data);
            setDcOptionsInSetAll(l_responseData?.dc_dict);
          }
        } catch {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setStoreViewLoader(false);
          let formattedColumns = agGridColumnFormatter(
            columns,
            null,
            props.actionMap
          );

          let l_columnsWithDisablekey = formattedColumns?.map((obj) => {
            if (obj?.extra?.disableSubHeader && obj.sub_headers?.length) {
              obj.sub_headers = obj?.sub_headers?.map((val) => {
                val.disabled = setCellsToBeDisabled;
                return val;
              });
            }
            return obj;
          });
          setStoreDetailsTableColumns(l_columnsWithDisablekey);
          setStoreTableData(cloneDeep(data));
        }
      })();
  }, [props.allocationCode]);

  const setCellsToBeDisabled = (row, item) => {
    return row?.[item?.column_name] ? false : true;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setButtonEnabled(selections?.length);
  };

  const onCellValueChanged = (params) => {
    let {
      column: {
        colId,
        colDef: { extra },
      },
      data,
    } = params;
    setUserEdits((old) => {
      return {
        ...old,
        [extra.column_name]: {
          ...old?.[extra.column_name],
          [params.data.store_code]: {
            ...old?.[extra.column_name]?.[params.data.store_code],
            [colId?.replace([extra.column_name], "")]: data?.[colId],
          },
        },
      };
    });
  };

  const shouldCallApi = (p_editedColumn, p_api) => {
    let l_request = {
      allocation_code: props.originalAllocationCode || props.allocationCode,
      updated_stores: userEdits?.[p_editedColumn],
    };
    return !isEmpty(userEdits?.[p_editedColumn]) ? p_api(l_request) : null;
  };

  const EDITABLE_DATES_STORE_VIEW = {
    shipping_date_: props.saveShippingDates,
    cancel_date_: props.saveCancelDates,
    priority_code_: props.savePriority,
  };

  const saveHandler = async () => {
    try {
      props.setStoreViewLoader(true);

      let l_apis = [];
      for (let i in EDITABLE_DATES_STORE_VIEW) {
        l_apis.push(shouldCallApi(i, EDITABLE_DATES_STORE_VIEW[i]));
      }

      Promise.all(l_apis)
        .then((values) => {
          displaySnackMessages(
            "The edits have been successfully updated.!!",
            "success"
          );
        })
        .catch((error) => {
          displaySnackMessages("Error while updating the edits!!", "error");
        });
    } finally {
      props.setStoreViewLoader(false);
    }
  };

  const editDeliveryDate = (p_bool) => {
    setDeliveryDateInBulk(p_bool);
  };

  const loadTableInstance = (params) => {
    storeDetailsTableInstance.current = params;
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  return (
    <>
      <Loader loader={props.storeViewLoader}>
        {props.openPopup && (
          <StoreSizeModal
            columns={agGridColumnFormatter([
              ...(modalColumns?.article ? modalColumns?.article : []),
              ...modalColumns?.[props?.columnSelected],
            ])}
            storeSizeData={props?.modalRows}
            setOpenPopup={props?.setOpenPopup}
          />
        )}
        <InvalidAllocation resposne={storeViewResposne} />
        <AgGridComponent
          columns={storeDetailsTableColumns}
          rowdata={storeDetailsTableData}
          // onRowSelected
          uniqueRowId={"index"}
          downloadAsExcel={storeDetailsTableData?.length ? true : false}
          suppressFieldDotNotation
          pagination={false}
          hideSelectCurrentPageRecords
          onCellValueChanged={onCellValueChanged}
          selectAllHeaderComponent={
            props?.inventorysmartScreenConfig?.finalize
              ?.hideSelectAllForFinalized
              ? shouldDisplaySelectComponent(
                  props.finalized,
                  props.planStatus,
                  props.planType,
                  flowType
                )
                ? false
                : true
              : true
          }
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
        />
        {deliveryDateInBulk && (
          <SetDatesComponent
            setAllFields={DELIVERY_DATES_SETALL_FIELDS}
            editDeliveryDate={(p_bool) => editDeliveryDate(p_bool)}
            storeDetailsTableInstance={storeDetailsTableInstance}
            allocationCode={props.allocationCode}
            originalAllocationCode={props.originalAllocationCode}
          />
        )}
        {props.isV3?.includes("storeDetailsEdits") &&
          !shouldDisplayGridBulkEditButtons(
            props.planStatus,
            props.planType,
            props?.inventorysmartScreenConfig?.finalize?.subComponent
          ) && (
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
                className={classes.button}
                disabled={!buttonEnabled || props.finalized}
                id="bulkEditEachesBtn"
                onClick={() => editDeliveryDate(true)}
              >
                Bulk Edit
              </Button>
              <Button
                variant="contained"
                color="primary"
                id="productSetAllBtn"
                disabled={isEmpty(userEdits) || props.finalized}
                className={classes.button}
                onClick={() => saveHandler()}
              >
                Save Grid Edits
              </Button>
            </Grid>
          )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    storeViewLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .storeViewLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getStoreView: (payload, isV3) => dispatch(getStoreView(payload, isV3)),
  saveShippingDates: (payload) => dispatch(saveShippingDates(payload)),
  saveCancelDates: (payload) => dispatch(saveCancelDates(payload)),
  savePriority: (payload) => dispatch(savePriority(payload)),
  setStoreDetailsTableData: (payload) =>
    dispatch(setStoreDetailsTableData(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreDetailsTable);
