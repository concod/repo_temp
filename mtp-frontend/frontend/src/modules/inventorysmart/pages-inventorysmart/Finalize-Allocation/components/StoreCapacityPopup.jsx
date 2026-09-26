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
import React, { useEffect, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useConstraintsStyles } from "../../Constraints/StoreAllocations/components/constraints-style";
import { connect } from "react-redux";
import { cloneDeep, noop } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getStoreCapacityTablePopupData, getStoreCapacityTablePopupDataWithPacks } from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { bulkUpdateAllocatedUnits } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { checkIfAllocationIsInMultiples, checkIfAllocationIsWithinDCAvailability } from "../utils";
import { PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import styles from "../index.module.scss";

const StoreCapacityPopup = (props) => {
  const tableRef = useRef();

  const [columns, setColumns] = useState([]);
  const classes = useConstraintsStyles();
  const [showloading, setShowloading] = useState(false);
  const [tableData, seTableData] = useState([]);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  const [packDetails, setPackDetails] = useState({});
  const [selectedPackDetails, setSelectedPackDetails] = useState(null);
  const [casePackFactors, setCasePackFactors] = useState({});
  const [todaysAllocationQty, setTodaysAllocationQty] = useState({});
  const [storePhysicalCapacity, setStorePhysicalCapacity] = useState(0);
  const [dailyStoreCapacity, setDailyStoreCapacity] = useState(0);
  const [dailyCartonCapacity, setDailyCartonCapacity] = useState(0);
  const [cartonFactor, setCartonFactor] = useState(1);
  const [dcCodeMapping, setDCCodeMapping] = useState({});

  const { includePacksFlag, displayStoreNumberFlag, checkQtyInMultiplesFlag, multiDCEditFlag, getDCCodeFromMappingFlag } =
    props.inventorysmartScreenConfig?.finalize?.storeCapacityBreach
      ?.review_allocation_popup || {};
  const caseQuantity = Object.values(casePackFactors)[0] ?? '-';
  const isEditable =
    !props.finalized &&
    !PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(props.planStatus);

  useEffect(() => {
    setShowloading(true);
    const setCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=size_level_allocation_popup"
      );
      fetchData();
      // setColumns(storeCols);
    };
    setCols();
  }, []);

  const showPackDetails = (allPackDetails) => (data) => {
    const packName = data.size;
    const currentPackDetails = allPackDetails[packName];

    if(currentPackDetails) {
      setSelectedPackDetails({
        ...currentPackDetails,
        pack_name: packName,
        formatted_table_config: agGridColumnFormatter(currentPackDetails.table_config),
      });
    }
  };

  const tableActionMap = (allPackDetails) => ({
    size: includePacksFlag ? showPackDetails(allPackDetails) : noop,
  });

  const fetchData = async () => {
    try {
      let reqBody = {
        article: props.selectedRowData.article,
        plan_status: "Created",
        allocation_code: props.allocationCode,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_type: props.planType,
        store_code: props.selectedRowData.store_code,
      };
      const dataApi = includePacksFlag ? props.getStoreCapacityTablePopupDataWithPacks : props.getStoreCapacityTablePopupData;
      let { data: storeData } =  await dataApi(
        reqBody,
        true
      );
      const packInfo = storeData.data?.pack_info || {};
      let tableConfig = (includePacksFlag ? storeData.data?.table_config : storeData.data?.table_config_capacity_breach) ?? [];

      // Display packs as links to display its details on click and eaches as plain text
      if (includePacksFlag) {
        tableConfig.forEach((colDef) => {
          if (colDef.column_name === "size") {
            colDef.cellClass = (params) => {
              if (!packInfo[params.value]) {
                return `${styles["pointer-events-none"]} ${styles["color-black"]}`;
              }
            };
          }
        });
      }

      if (tableConfig) {
        tableConfig = tableConfig.map(
          (item) => {
            if (item.column_name === "allocated_header") {
              item.sub_headers = item.sub_headers.map((key) => {
                key.is_editable = isEditable;

                return key;
              });
            }
            return item;
          }
        );
        let formattedColumns = agGridColumnFormatter(
          tableConfig,
          null,
          tableActionMap(packInfo)
        );
        setColumns(formattedColumns);

        if(includePacksFlag) {
          setPackDetails(packInfo);
          setTodaysAllocationQty(storeData?.data?.todays_allocation_qty ?? {});
          setCartonFactor(storeData?.data?.carton_factor ?? 1);
        }

        if(checkQtyInMultiplesFlag) {
          setCasePackFactors(storeData?.data?.case_pack_factors ?? {});
        }

        if(getDCCodeFromMappingFlag) {
          setDCCodeMapping(storeData?.data?.dc_mapping ?? {});
        }
      }
      if (storeData.data?.table_data) {
        seTableData(storeData.data?.table_data);
        setOriginalTableData(cloneDeep(storeData.data?.table_data));
      }
      setShowloading(false);
    } catch (err) {
      displaySnackMessages("Error while fetching the data", "error");
      setShowloading(false);
    }
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const calculateNetCapacities = () => {
    const { selectedRowData = {}, allocatedQuantities = {}, cartonFactors = {} } = props;

    // Allocated quantity of selected material after edit

    let totalAllocatedQty = 0;

    tableRef.current?.api.forEachNode(node => {
      const sizeName = node.data.size;
      const packDetail = packDetails[sizeName];
      let rowSum = 0;
      let packMultiplier = 1;

      if(packDetail) {
        const packInfoObj = packDetail?.data?.[0] || {};

        packMultiplier = Object.values(packInfoObj).reduce((total, value) => total + value, 0);
      }

      for (const column of columns) {
        if (column.field === "allocated_header") {
          const subHeaders = column.children;

          for(const subHeader of subHeaders) {
            rowSum += node.data[subHeader.field] ?? 0;
          }
        }
      }

      const rowTotal = rowSum * packMultiplier;

      totalAllocatedQty += rowTotal;
    });

    // Allocated quantity of all the materials in the store after edit

    const otherMaterialAllocatedQuantities = Object.keys(allocatedQuantities)
      .reduce((total, article) => {
        if(article === selectedRowData.article) {
          return total;
        }

        return total + allocatedQuantities[article];
      }, 0);
    const totalStoreAllocatedQuantity = totalAllocatedQty + otherMaterialAllocatedQuantities;

    const todaysAllocatedQty = todaysAllocationQty.allocated_qty ?? 0;

    // Store physical capacity calculation

    const newStorePhysicalCapacity = selectedRowData.unit_capacity - selectedRowData.store_inv - totalStoreAllocatedQuantity - todaysAllocatedQty;

    setStorePhysicalCapacity(newStorePhysicalCapacity);

    // Daily store capacity calculation

    const newDailyStoreCapacity = selectedRowData.receipt_capacity - totalStoreAllocatedQuantity - todaysAllocatedQty;

    setDailyStoreCapacity(newDailyStoreCapacity);

    // Daily carton capacity calculation

    const otherMaterialCartonConsumed = Object.keys(cartonFactors)
      .reduce((total, article) => {
        if (article === selectedRowData.article) {
          return total;
        }

        const materialAllocatedQuantity = allocatedQuantities[article];
        const materialCartonFactor = cartonFactors[article];
        const cartonConsumed = materialAllocatedQuantity / materialCartonFactor;

        return total + cartonConsumed;
      }, 0);
    const currentMaterialCartonConsumed = totalAllocatedQty / cartonFactor;
    const totalCartonConsumed = otherMaterialCartonConsumed + currentMaterialCartonConsumed;
    const totalCartonConsumedRoundedUp = Math.ceil(totalCartonConsumed);

    const todaysCartonAllocatedQty = todaysAllocationQty.carton_allocated_qty ?? 0;

    const newDailyCartonCapacity = selectedRowData.carton_capacity - totalCartonConsumedRoundedUp - todaysCartonAllocatedQty;

    setDailyCartonCapacity(newDailyCartonCapacity);
  };

  useEffect(() => {
    if(includePacksFlag) {
      calculateNetCapacities();
    }
  }, [editedRows]);

  useEffect(() => {
    if(includePacksFlag) {
      setTimeout(() => { // To execute after the aggrid API is updated
        calculateNetCapacities();
      }, 0);
    }
  }, [tableData]);

  const onBlur = (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    params
  ) => {
    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) => item.size === params.data.size
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (item.size === params.data.size) {
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

  const onCancel = () => {
    props.onCancel();
  };
  const saveRequest = async () => {
    if(checkQtyInMultiplesFlag) {
      const allocationNotInMultiplesErrStr = checkIfAllocationIsInMultiples(columns, editedRows, packDetails, casePackFactors);

      if(allocationNotInMultiplesErrStr) {
        displaySnackMessages(
          allocationNotInMultiplesErrStr,
          "error"
        );

        return;
      }
    }

    // Check for new allocations within the DC availability

    const allocationBeyondDCAvailabilityErrStr = checkIfAllocationIsWithinDCAvailability(
      columns,
      editedRows,
      originalTableData
    );

    if (allocationBeyondDCAvailabilityErrStr) {
      displaySnackMessages(allocationBeyondDCAvailabilityErrStr, "error");

      return;
    }

    setShowloading(true);
    try {
      let obj = {};
      if (multiDCEditFlag) {
        editedRows.forEach((item) => {
          const { store_code, size } = item;

          if(!obj[store_code]) {
            obj[store_code] = {};
          }

          for (const column of columns) {
            if (column.field === "allocated_header") {
              const subHeaders = column.children;

              for(const subHeader of subHeaders) {
                const { field } = subHeader;
                const dc_code = field.split('allocated_qty__')[1];
                let mapped_dc_code = dc_code;

                if(getDCCodeFromMappingFlag) {
                  mapped_dc_code = dcCodeMapping[dc_code];
                }

                const key = `${mapped_dc_code}___${size}`;
                const value = item[`allocated_qty__${dc_code}`];

                obj[store_code] = {
                  ...obj[store_code],
                  [key]: value,
                };
              }
            }
          }
        });
      } else {
        editedRows.forEach((item) => {
          let l_size = item.size;
          let l_packId =
            Object.keys(item.pack_description || {}).find(
              (key) => item.pack_description[key] === l_size
            ) || null;
          let l_packOrSize = item.is_pack ? l_packId : l_size;

          let key = `${item.dc_code}___${l_packOrSize}`;
          let value = item[`allocated_qty__${item.dc}`];
          obj[item.store_code] = {
            ...obj[item.store_code],
            [key]: +value,
          };
        });
      }
      let reqBody = {
        allocation_code: props.originalAllocationCode || props.allocationCode,
        edited_allocation_code: !props.originalAllocationCode
          ? null
          : props.allocationCode,
        allocation_row: {
          [props.selectedRowData.article]: obj,
        },
      };
      let l_response = await props.bulkUpdateAllocatedUnits(reqBody, true);
      if (l_response?.data?.status) {
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        displaySnackMessages("Updated Successfully!!", "success");
      }
      setShowloading(false);
      setEditedRows([]);
      props.onCancel();
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.storeModalPopup}
      aria-labelledby="customized-dialog-title"
      open={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Review Size wise Allocation
          <IconButton
            aria-label="close"
            onClick={() => onCancel()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <LoadingOverlay loader={showloading}>
          <div className={classes.container}>
            <div className={classes.headerContainer}>
              <div className={classes.headerContainer}>
                <span>
                  {dynamicLabelsBasedOnTenant("product")}
                  {" : "}
                </span>
                &nbsp;
                <Typography variant="h4">
                  {props.selectedRowData.article}
                </Typography>
              </div>
              {displayStoreNumberFlag && (
                <>
                  <span>{" | "}</span>
                  <div className={classes.headerContainer}>
                    <span>
                      {dynamicLabelsBasedOnTenant("store")}
                      {" : "}
                    </span>
                    &nbsp;
                    <Typography variant="h4">
                      {props.selectedRowData.retail_facility_code}
                    </Typography>
                  </div>
                </>
              )}
  
              {includePacksFlag ? (
                <>
                  <span>{" | "}</span>
                  <div className={classes.headerContainer}>
                    <span> {"Store Physical Capacity : "}</span>
                    &nbsp;
                    <Typography variant="h4">
                      {storePhysicalCapacity}
                    </Typography>
                  </div>
                  <span>{" | "}</span>
                  <div className={classes.headerContainer}>
                    <span> {"Daily Store Capacity : "}</span>
                    &nbsp;
                    <Typography variant="h4">
                      {dailyStoreCapacity}
                    </Typography>
                  </div>
                  <span>{" | "}</span>
                  <div className={classes.headerContainer}>
                    <span> {"Daily Carton Capacity : "}</span>
                    &nbsp;
                    <Typography variant="h4">
                      {dailyCartonCapacity}
                    </Typography>
                  </div>
                </>
              ) : (
                <>
                  <span>{" | "}</span>
                  <div className={classes.headerContainer}>
                    <span> {"Net Avl Capacity : "}</span>
                    &nbsp;
                    <Typography variant="h4">
                      {props.selectedRowData.net_capacity}
                    </Typography>
                  </div>
                </>
              )}
            </div>
            <div className={classes.tableBody}>
              {columns.length > 0 && (
                <AgGridComponent
                  tableRef={tableRef}
                  columns={columns}
                  rowdata={tableData}
                  sizeColumnsToFitFlag
                  onBlur={onBlur}
                />
              )}
            </div>
            {includePacksFlag && selectedPackDetails && (
              <>
                <Typography variant="h4" className={styles["m-t-28"]}>
                  {selectedPackDetails.pack_name} Configuration
                </Typography>
                <div className={classes.tableBody}>
                  <AgGridComponent
                    columns={selectedPackDetails.formatted_table_config}
                    rowdata={selectedPackDetails.data}
                    sizeColumnsToFitFlag
                    onBlur={onBlur}
                  />
                </div>
              </>
            )}
          </div>
        </LoadingOverlay>
      </DialogContent>
      {isEditable ? (
        <DialogActions
          classes={{
            root: classes.footer,
          }}
        >
          <Button
            onClick={() => {
              onCancel();
            }}
            id="modifyCancelBtn"
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              saveRequest();
            }}
            id="modifyAddBtn"
            color="primary"
            disabled={editedRows?.length === 0}
          >
            Save
          </Button>
        </DialogActions>
      ) : null}
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreCapacityTablePopupData: (payload, isV3) =>
    dispatch(getStoreCapacityTablePopupData(payload, isV3)),
  getStoreCapacityTablePopupDataWithPacks: (payload, isV3) =>
    dispatch(getStoreCapacityTablePopupDataWithPacks(payload, isV3)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreCapacityPopup);
