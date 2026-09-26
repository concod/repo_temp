import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import { Grid } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import Typography from "@mui/material/Typography";
import {
  getAllProductStores,
  getAllProductGroupStores,
  downloadAllProductStores,
  mapProductToStore,
  mapProductGroupToStore,
  validateProductMappingTimeBounds,
  editOrDelete,
  mapProductsToStoreGroup,
} from "../services-product-mapping/productMappingService";
import Exceptions from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/exception";
import {
  fetchAllStoreCodes,
  fetchAllStoreGroups,
} from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  Dialog,
  DialogActions,
  DialogContent,
  RadioGroup,
  Radio,
  FormControlLabel,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { cloneDeep, isEmpty, isNull } from "lodash";
import { Prompt } from "impact-ui-v3";
import ModifyTable from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/modify-table";
import TimeBoundDialog from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/time-bound-dialog";
import {
  splitMappedAndUnmappedData,
  prepareCreatePayload,
  parseMappings,
  addDateFieldSelection,
} from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/common-mapping-functions";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
// New set of filters imports
import SetAllComponent from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/set-all-component";
import ModifyStoreGroupsTable from "./modifyStoreGroupsTable";
import { updateCellValueData } from "./common-functions";
import moment from "moment";
import { changeDateStringToOtherFormat } from "core/Utils/functions/utils";
import { DEFAULT_DATE_FORMAT, END_DATE } from "config/constants";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  dynamicLabelsBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";
import DateRangePicker from "core/commonComponents/dateRangePicker";

const useStyles = makeStyles((theme) => ({
  extraLength: {
    backgroundColor: theme.palette.colours.disabledSelectBackground,
    borderRadius: theme.shape.borderRadius,
    padding: "0 0.2rem",
  },
  labelText: {
    color: theme.palette.text.disabled,
  },
  fieldText: {
    color: theme.palette.text.secondary,
  },
}));

function ProductsFilter(props) {
  const [showloader, setloader] = useState(true);
  const [defaultRowData, setDefaultRowData] = useState([]);
  const [filterDependency, setDependency] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [showException, updateShowException] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [isLoaderActive, setLoaderActive] = useState(false);
  const [editedStoresData, setEditedStoresData] = useState([]);
  const [conflictProdMappingData, setconflictProdMappingData] = useState({});
  const [appliedFilterBody, setAppliedFilterBody] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [downloadDisabled, setDownloadDisabled] = useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  //To display set all multi row pop up
  const [showSetAllPopUp, setshowSetAllPopUp] = useState(false);
  const [setAllPopUpFields, setsetAllPopUpFields] = useState([]);
  const [commonSetAllProducts, setcommonSetAllProducts] = useState([]);
  const [isTimePeriodPresent, setIsTimePeriodPresent] = useState(false);
  const [isUnmapClicked, setIsUnmapClicked] = useState(false);
  /**
   * New Modify Table State variables
   */
  const [selectedStoreObjects, setselectedStoreObjects] = useState([]); //All the selected Product Ids in modify table
  const [selectedStoreGroupObjects, setSelectedStoreGroupObjects] = useState(
    []
  );
  const [storeGroupDatesAPIPayload, setStoreGroupDatesAPIPayload] = useState(
    {}
  );
  const modifyTableRef = useRef(null);
  const modifyStoreGroupsTableRef = useRef(null);
  const [
    displayTimeBoundMappingDialog,
    setdisplayTimeBoundMappingDialog,
  ] = useState(false);

  const [
    editOrDeleteEditedAPIPayload,
    seteditOrDeleteEditedAPIPayload,
  ] = useState([]);
  const [setAllConfirmBox, showsetAllConfirmBox] = useState(false);
  const [storeRadioType, setStoreRadioType] = useState("store");
  const [storeGroupStartDate, setStoreGroupStartDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [storeGroupEndDate, setStoreGroupEndDate] = useState(END_DATE);
  const [hideSetDates, setHideSetDates] = useState(false);
  const [showModifyTable, setShowModifyTable] = useState(true);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const exceptionsFields = [
    {
      label: `Select ${captializeStringIfCamelCase(
        dynamicLabelsBasedOnTenant("product", "core")
      )}s`,
      field_type: "dropdown",
      isMulti: true,
      required: true,
      options: props.selectedProducts.map((item) => {
        return {
          value: item.product_code,
          id: item.product_code,
          label: item.sku || item.product_code,
        };
      }),
      accessor: "select_product",
    },
    {
      label: "Select Store",
      field_type: "dropdown",
      isMulti: true,
      required: true,
      options: [],
      accessor: "select_store",
    },
  ];
  /**
   * @func
   * @desc Fetch filter Options and Store Groups and initialise filter options
   */
  useEffect(() => {
    const getInitialData = async () => {
      try {
        let columnsResp = await getColumnsAg(
          "table_name=product_mapping_set_all_fields"
        )();
        setsetAllPopUpFields(columnsResp);
        setIsTimePeriodPresent(isColumnPresent(columnsResp, "start_date"));
        if (isEmpty(props.productMappingModifyFilterDashboardConfiguration)) {
          let response = await fetchFilterFieldValues(
            "store mapping",
            props.savedFilterSelection,
            props.screenName
          );
          const filterConfigData = [
            {
              filterDashboardData: response,
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Store Mapping";
          }
          const filterConfig = formattedFilterConfiguration(
            "productMappingModifyFilterConfiguration",
            filterConfigData,
            "Product Mapping Modify"
          );
          props.setFilterConfiguration(filterConfig);
        }
        const productMappingDownloadConfig = fetchDynamicConfigFromTenantReducer(
          "core",
          "mapping_download_csv"
        );
        const mappingDateFilter = fetchDynamicConfigFromTenantReducer(
          "core",
          "mapping_date_filter"
        );
        mappingDateFilter && setShowDateFilter(mappingDateFilter);
        setShowDownloadBtn(Boolean(productMappingDownloadConfig));
        setloader(false);
      } catch (error) {
        console.log(error);
      }
    };

    getInitialData();
    return () => {
      setAppliedFilterBody({});
      setTotalCount(0);
    };
  }, []);

  useEffect(() => {
    if (!showModifyTable) setShowModifyTable(true);
  }, [showModifyTable]);
  /**
   * @func
   * @desc Return structure object to utilize as filter options
   * @param {Array} data Array of Objects
   * @returns {Array}
   */
  const generateFilterValues = (data) => {
    const filterValues = data.map((item) => {
      return {
        label: item.name,
        value: item.sg_code,
      };
    });
    return filterValues;
  };

  /**
   * @function
   * @description Set all states on save request.
   */
  const saveRequest = () => {
    if (
      (storeRadioType === "store" &&
        (storeData.length || editOrDeleteEditedAPIPayload.length)) ||
      (storeRadioType === "store_groups" &&
        !isEmpty(storeGroupDatesAPIPayload.store_groups))
    ) {
      setShowModal(true);
    } else {
      displaySnackMessages("There are no changes to save", "warning");
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

  const checkEditedRow = (arr) => {
    return arr.map((item) => {
      let editedRow = editedStoresData.filter(
        (row) => row.store_code === item.store_code
      );
      return editedRow.length > 0 ? editedRow[0] : item;
    });
  };

  const updateProductsData = async (body, pageIndex) => {
    let queryParams = `?level=${
      props.isAggregated ? "aggregation" : "product"
    }&page=${pageIndex + 1}`;
    body = { ...body };
    body.meta.limit = { limit: 10, page: pageIndex + 1 };
    let storesRespObj = {};
    if (props.selectedDimension === "product") {
      if (showDateFilter) {
        body = addDateFieldSelection(startDate, endDate, body, "store");
      }
      const { data: stores } = await getAllProductStores(body, queryParams)();
      setAppliedFilterBody({ ...body });
      storesRespObj = stores;
    } else {
      const { data: stores } = await getAllProductGroupStores(
        body,
        queryParams
      )();
      storesRespObj = stores;
      setAppliedFilterBody({});
      setTotalCount(0);
    }
    storesRespObj.data = storesRespObj.data.map((item) => {
      item.include_unmapped =
        item.num_products_mapped.split("/")[0] ===
        item.num_products_mapped.split("/")[1];
      item.is_calendar_disabled = true;
      //we disable the include unmapped as there are no include unmapped to perform
      item.is_include_unmapped_disabled =
        item.num_products_mapped.split("/")[0] ===
        item.num_products_mapped.split("/")[1];
      return item;
    });

    if (editedStoresData.length > 0) {
      storesRespObj.data = checkEditedRow(storesRespObj.data);
    }
    setDefaultRowData([...defaultRowData, ...storesRespObj.data]);
    setloader(false);
    return {
      data: storesRespObj.data,
      total: storesRespObj.total,
    };
  };

  const resetToDefaultValues = () => {
    setEditedStoresData([]);
    setStoreData([]);
    seteditOrDeleteEditedAPIPayload([]);
    setStoreGroupDatesAPIPayload({});
    setselectedStoreObjects([]);
    setSelectedStoreGroupObjects([]);
  };

  /**
   * @func
   * @desc Update Chips dependency after Filter click and force update table
   */
  const onClickFilter = () => {
    setloader(true);
    setShowModifyTable(false);
  };

  const onConfirm = async () => {
    setShowModal(false);
    if (storeRadioType === "store_groups") {
      storeGroupSave(storeGroupDatesAPIPayload);
      return;
    }
    setloader(true);
    try {
      if (storeData.length > 0 || editOrDeleteEditedAPIPayload.length > 0) {
        if (!isEmpty(conflictProdMappingData)) {
          displaySnackMessages(
            "Please resolve the overlapping dates before saving",
            "error"
          );
          setloader(false);
          return;
        }
        if (props.selectedDimension === "product") {
          let [
            individualMappedObjects,
            individualUnMappedObjects,
          ] = splitMappedAndUnmappedData(storeData, "product_mapping");
          let includeUnmappedObjects = storeData.filter(
            (data) => data.include_unmapped
          );
          individualMappedObjects = prepareCreatePayload(
            [...individualMappedObjects, ...includeUnmappedObjects],
            props.selectedProducts,
            "product_mapping"
          );
          includeUnmappedObjects = individualMappedObjects.filter(
            (data) => data.include_unmapped
          );
          individualMappedObjects = individualMappedObjects.filter(
            (data) => !data.include_unmapped && data.select.length > 0
          );
          // this gives an object with dates as keys
          const payloadResp = individualMappedObjects.reduce(
            (payload, store) => {
              const date =
                store.valid_from +
                "+" +
                store.valid_to +
                "+" +
                store.store_code;
              if (!payload[date]) {
                payload[date] = [];
              }
              payload[date].push(store.select[0]);
              return payload;
            },
            {}
          );
          // Edit: to add it in the array format instead
          const storesArray = Object.keys(payloadResp).map((date) => {
            const KeyArr = date.split("+");
            return {
              store_code: KeyArr[2], //grp id
              include_unmapped: false,
              map: true,
              select: payloadResp[date], //["1900", "100"]
              unselect: [],
              valid_from: KeyArr[0], //from date
              valid_to: KeyArr[1], //to date
            };
          });
          if (storesArray.length > 0 || includeUnmappedObjects.length > 0) {
            let body = {
              stores: [...includeUnmappedObjects, ...storesArray],
              products: props.selectedProducts.map((item) => item.product_code),
              action: "conflict_combine",
            };
            await mapProductToStore(body, props.isAggregated)();
          }
          if (
            editOrDeleteEditedAPIPayload.length > 0 ||
            individualUnMappedObjects.length > 0
          ) {
            let body = {
              body: [
                ...parseMappings([...editOrDeleteEditedAPIPayload]),
                ...individualUnMappedObjects,
              ],
            };
            await editOrDelete(body, props.isAggregated)();
          }
          displaySnackMessages("Products updated successfully", "success");
        } else {
          let body = {
            stores: storeData,
            product_groups: props.selectedProducts.map((item) => item.pg_code),
          };
          await mapProductGroupToStore(body)();
          displaySnackMessages("Products updated successfully", "success");
        }
        setStoreData([]);
        resetToDefaultValues();
        onClickFilter();
      } else {
        displaySnackMessages("There are no changes to save", "warning");
      }
      setEditedStoresData([]);
      setloader(false);
    } catch (err) {
      displaySnackMessages(
        err?.response?.data?.message || "Something went wrong while modifying",
        "error"
      );
      setloader(false);
    }
  };

  const onApplyExceptions = async (exceptions) => {
    setloader(true);
    let productBody = [];
    //Loop over the exceptions and parse each exception to add stores and products to the payload
    exceptions.forEach((exception) => {
      const storecodes = exception.store_code.map((store) => store.value);
      let body = {
        product_code: exception.product_code.map((prod) => prod.value),
        store_code: storecodes,
        valid_from: null,
        valid_to: null,
      };
      productBody.push(body);
    });

    let postReq = {
      body: productBody,
    };
    await editOrDelete(postReq, props.isAggregated)();
    setShowModal(false);
    displaySnackMessages("Product(s) unmapped successfully");
    updateShowException(false); //close the exceptions dialog
    onClickFilter();
    setloader(false);
  };

  /**
   * This function checks for common mapped stores presence and opens the pop up
   * if there are common mapped stores or else throws an error saying no common stores present
   */
  const openSetAllPopUp = () => {
    setcommonSetAllProducts(
      props.selectedProducts.map(
        (product) => product.sku || product.product_code
      )
    );
    setshowSetAllPopUp(true);
  };

  /**
   * Close the Time bound Dialog box
   */
  const onTimeBoundDialogClose = () => {
    setdisplayTimeBoundMappingDialog(false);
  };

  const onClickStoreGroupsSetDates = () => {
    if (isEmpty(selectedStoreGroupObjects)) {
      displaySnackMessages("Please select atleast one Store Group", "error");
      return;
    }
    setshowSetAllPopUp(true);
  };

  const getDefaultStoreGroupPayload = (startDate, endDate) => {
    return {
      store_groups: [],
      products: props.selectedProducts.map((product) => product.product_code),
      valid_from: startDate,
      valid_to: endDate,
    };
  };
  /**
   *
   * @param {*} storeGroupsPayload
   * clear the exisitng store group payload and make the time period node values to null
   */
  const clearExisitingStoreGroups = (storeGroupsPayload) => {
    if (!isEmpty(storeGroupsPayload)) {
      const exisitngStoreGroups = storeGroupsPayload.store_groups;
      exisitngStoreGroups.forEach((groupId) => {
        const rowNode = modifyStoreGroupsTableRef.current.api.getRowNode(
          groupId + ""
        );
        updateCellValueData(
          "time_period",
          null,
          rowNode,
          modifyStoreGroupsTableRef
        );
      });
      setStoreGroupDatesAPIPayload({});
    }
  };

  /**
   *
   * @param {Node} rowNode
   * @param {string} startDate
   * @param {string} endDate
   *
   * this function updates the row node values to start date and end date passed with default date format
   */
  const updateStoreGroupRowNodeDate = (rowNode, startDate, endDate) => {
    updateCellValueData(
      "time_period",
      `${changeDateStringToOtherFormat(
        startDate,
        "YYYY-MM-DD",
        DEFAULT_DATE_FORMAT
      )} to ${changeDateStringToOtherFormat(
        endDate,
        "YYYY-MM-DD",
        DEFAULT_DATE_FORMAT
      )}`,
      rowNode,
      modifyStoreGroupsTableRef
    );
  };
  /**
   *
   * @param {*} values
   */
  const storeGroupSetAllApply = (values) => {
    const params = modifyStoreGroupsTableRef.current;
    //clear the exisiting records
    clearExisitingStoreGroups(storeGroupDatesAPIPayload);
    let rowNodes = params.api.getSelectedNodes();
    const startDate = values[0].start_date;
    const endDate = values[0].end_date;
    let newUpdatedDatesPayload = getDefaultStoreGroupPayload(
      startDate,
      endDate
    );
    //after clearing, update the row node time period with the start date and end date selected
    rowNodes.forEach((rowNode) => {
      newUpdatedDatesPayload.store_groups.push(rowNode.data.sg_code);
      updateStoreGroupRowNodeDate(rowNode, startDate, endDate);
    });
    params.api.flashCells({ rowNodes });
    displaySnackMessages("Successfully updated to selected date", "success");
    setStoreGroupDatesAPIPayload(newUpdatedDatesPayload);
    setStoreGroupStartDate(startDate);
    setStoreGroupEndDate(endDate);
  };

  const storeGroupSave = async (payload, isUnmapping = false) => {
    setShowModal(false); //close the modal
    try {
      setloader(true);
      const queryParams = props.isAggregated
        ? "?level=aggregation"
        : "?level=product";
      await props.mapProductsToStoreGroup(payload, queryParams);
      setloader(false);
      displaySnackMessages(
        `Products ${isUnmapping ? "unmapped" : "updated"} successfully`,
        "success"
      );
      resetToDefaultValues();
      onClickFilter();
    } catch (error) {
      setloader(false);
      displaySnackMessages(
        `Failed to ${
          isUnmapping ? "unmap" : "updated"
        } store groups to products`,
        "error"
      );
    }
  };

  /**
   * @function
   * @description Modify storeGroupDatesAPIPayload before mapping or unmapping
   */
  const unmapStoregroups = () => {
    if (
      storeRadioType === "store_groups" &&
      !isEmpty(storeGroupDatesAPIPayload.store_groups)
    ) {
      const params = modifyStoreGroupsTableRef.current;
      let rowNodes = params.api.getSelectedNodes();
      let newUpdatedDatesPayload = getDefaultStoreGroupPayload(null, null);
      rowNodes.forEach((rowNode) => {
        newUpdatedDatesPayload.store_groups.push(rowNode.data.sg_code);
      });
      storeGroupSave(newUpdatedDatesPayload, true);
      setShowPrompt(false);
    }
  };
  const onDatesChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    /**
     * if only end date is selected then
     * start date should be pre populated
     */
    if (isNull(start) && !isNull(end)) {
      start = moment();
      setStartDate(start);
    }
    if (!isNull(start) || (isNull(start) && isNull(end))) {
      onClickFilter();
    }
  };
  const onFocusChange = (inp) => {
    setFocusedInput(inp);
  };

  const renderContent = () => {
    let productIdText;
    if (props.selectedDimension === "product") {
      productIdText = props.selectedProducts.map(
        (item) => item.sku || item.product_code
      );
      productIdText =
        props.selectedProducts.length > 3
          ? productIdText.slice(0, 3).join(" , ")
          : productIdText.join(" , ");
    } else {
      productIdText = props.selectedProducts.map((item) => item.pg_code);
      productIdText =
        props.selectedProducts.length > 3
          ? productIdText.slice(0, 3).join(" , ")
          : productIdText.join(" , ");
    }
    const getPromptStatus = (loc) => {
      const message = `Are you sure you want to go to ${loc.pathname}?`;
      if (storeData.length !== 0 || editOrDeleteEditedAPIPayload.length !== 0) {
        return message;
      }
      return true;
    };

    const onSetAllBtnClick = (isUnmap = false) => {
      setIsUnmapClicked(false); //resetting it to false on click of any set all button
      if (storeRadioType === "store" && isEmpty(selectedStoreObjects)) {
        displaySnackMessages("Please select atleast one Store(s)", "error");
        return;
      }
      if (
        (storeRadioType === "store" && storeData.length > 0) ||
        editOrDeleteEditedAPIPayload.length > 0
      ) {
        showsetAllConfirmBox(true);
        return;
      }
      if (isUnmap) {
        setIsTimePeriodPresent(false);
        setIsUnmapClicked(true);
        setsetAllPopUpFields(
          cloneDeep(setAllPopUpFields).filter(
            (col) => !["start_date", "end_date"].includes(col.column_name)
          )
        );
      }
      openSetAllPopUp();
    };

    const onFilterDashboardClick = (dependencyData) => {
      setDependency(dependencyData);
      onClickFilter();
    };

    /**
     * @function
     * @description Request for download with current filtered dependency
     */
    const dowloadData = async () => {
      setDownloadDisabled(true);
      if (totalCount >= 500000) {
        setDownloadDisabled(false);
        displaySnackMessages(
          "Download limit exceeded. Please select limited products, where product to store count is below 25K.",
          "error"
        );
        return;
      }
      try {
        await downloadAllProductStores(appliedFilterBody, "?level=product")();
        displaySnackMessages(
          "Download request succesfully registered, you will recieve notification shortly",
          "success"
        );
        setDownloadDisabled(false);
      } catch (error) {
        displaySnackMessages("Failed to download data", "error");
        setDownloadDisabled(false);
      }
    };

    return (
      <>
        <CoreComponentScreen
          showFilterDashboard={true}
          filterConfigKey={"productMappingModifyFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          hideNoDataFound
        >
          <div
            className={`${globalClasses.marginTop}`}
            data-testid="filterContainer"
          >
            <Typography variant="body1" paragraph={true}>
              <Typography component="span" className={classes.labelText}>
                {" "}
                {props.selectedDimension === "product"
                  ? `Selected ${
                      props.isAggregated
                        ? "Article"
                        : dynamicLabelsBasedOnTenant("product", "core")
                    } `
                  : "Selected Product Group "}
                -
              </Typography>
              <Typography component="span" className={`${classes.labelText}`}>
                {props.selectedDimension === "product"
                  ? ` ID`
                  : "Product group ID"}
                : {""}
                <Typography
                  component="span"
                  className={`${classes.fieldText} ${globalClasses.marginHorizontal}`}
                >
                  {`${productIdText}`}
                </Typography>
                {props.selectedProducts.length > 3 && (
                  <Typography component="span" className={classes.extraLength}>
                    {`+${props.selectedProducts.length - 3}`}{" "}
                  </Typography>
                )}
              </Typography>
            </Typography>

            {confirmBox && (
              <ConfirmBox
                text="All the changes will be lost. Do you really want to cancel?"
                onClose={() => showConfirmBox(false)}
                onConfirm={() => {
                  resetToDefaultValues();
                  onClickFilter();
                  showConfirmBox(false);
                }}
              />
            )}
            {setAllConfirmBox && (
              <ConfirmBox
                onClose={() => showsetAllConfirmBox(false)}
                onConfirm={() => {
                  setStoreData([]);
                  seteditOrDeleteEditedAPIPayload([]);
                  onClickFilter();
                  showsetAllConfirmBox(false);
                }}
              />
            )}
            <Dialog
              open={showModal}
              className={globalClasses.dialogConfirmBox}
              onClose={() => {
                if (!isLoaderActive) {
                  setShowModal(false);
                }
              }}
              id={"routePrompt"}
            >
              <Loader loader={isLoaderActive}>
                <DialogContent className={globalClasses.minHeightBody}>
                  <div className={globalClasses.dialogTitle}>
                    {" "}
                    Update Changes
                  </div>
                  <div className={globalClasses.dialogText}>
                    Are you sure to update all changes ?
                  </div>
                </DialogContent>
                <DialogActions className={globalClasses.dialogActionBox}>
                  <Button
                    id="routePromptCloseBtn"
                    onClick={() => setShowModal(false)}
                    color="primary"
                    autoFocus
                  >
                    Close
                  </Button>
                  <Button
                    id="routePromptConfirmBtn"
                    onClick={() => onConfirm()}
                    color="primary"
                    autoFocus
                  >
                    Update
                  </Button>
                </DialogActions>
              </Loader>
            </Dialog>
            {showException && (
              <Exceptions
                filterDependency={filterDependency}
                fields={exceptionsFields}
                selectedProductsOrGrps={props.selectedProducts}
                onApply={onApplyExceptions}
                toggleError={(errMsg) => {
                  setloader(false);
                  displaySnackMessages(errMsg, "error");
                }}
                handleModalClose={() => {
                  updateShowException(false);
                }}
                screenName={"product_mapping"}
                isAggregated={props.isAggregated}
              ></Exceptions>
            )}
          </div>
          <Prompt
            isOpen={showPrompt}
            title={"Unmapping Confirmation"}
            variant="info"
            onPrimaryButtonClick={
              () => unmapStoregroups()
               }
            onSecondaryButtonClick={
               () => setShowPrompt(false)
               }
            primaryButtonLabel="Yes"
            secondaryButtonLabel="No"
          >
            Continue to unmap selected store groups?
          </Prompt>

          <Loader loader={showloader || props.fetchIdsLoader}>
            <div data-testid="resultContainer">
              <Paper elevation={0}>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
                >
                  <div>
                    <RadioGroup
                      row
                      aria-label="store type"
                      name="controlled-radio-buttons-group"
                      value={storeRadioType}
                      onChange={(event) =>
                        setStoreRadioType(event.target.value)
                      }
                    >
                      <FormControlLabel
                        value="store"
                        control={<Radio color="primary" id="StoreRadioBtn" />}
                        label="Store"
                      />
                      <FormControlLabel
                        value="store_groups"
                        control={
                          <Radio color="primary" id="StoreGroupRadioBtn" />
                        }
                        label="Store groups"
                      />
                    </RadioGroup>
                    <Typography variant="h6" gutterBottom>
                      Review Status
                    </Typography>
                  </div>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                  >
                    {showDateFilter && storeRadioType === "store" && (
                      <DateRangePicker
                        disableType="disableOnlyPast"
                        startDate={startDate}
                        endDate={endDate}
                        focusedInput={focusedInput}
                        onDatesChange={onDatesChange}
                        onFocusChange={onFocusChange}
                        // disabled={isEmpty(filterDependency)}
                      />
                    )}
                    {props.selectedDimension === "product" &&
                    !isEmpty(appliedFilterBody) &&
                    showDownloadBtn ? (
                      <Button
                        variant="contained"
                        color="primary"
                        id="dowloadProductToStores"
                        onClick={dowloadData}
                        disabled={downloadDisabled}
                      >
                        <DownloadIcon />
                      </Button>
                    ) : null}
                    {storeRadioType === "store_groups" ? (
                      <Button
                        variant="contained"
                        color="primary"
                        id="unMappingBtn"
                        onClick={() => setShowPrompt(true)}
                        disabled={!selectedStoreGroupObjects.length}
                      >
                        Unmap Groups
                      </Button>
                    ) : null}
                    {storeRadioType === "store_groups" && !hideSetDates && (
                      <Button
                        variant="contained"
                        color="primary"
                        id="storeGroupsSetDatesBtn"
                        onClick={onClickStoreGroupsSetDates}
                      >
                        Set Dates
                      </Button>
                    )}
                    {storeRadioType === "store" && (
                      <Button
                        variant="contained"
                        color="primary"
                        id="productSetAllBtn"
                        onClick={() => onSetAllBtnClick()}
                      >
                        Set All
                      </Button>
                    )}
                    {storeRadioType === "store" && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => onSetAllBtnClick(true)}
                      >
                        Unmap Set All
                      </Button>
                    )}
                    {storeRadioType === "store" && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          updateShowException(true);
                        }}
                      >
                        Add Exceptions
                      </Button>
                    )}
                  </div>
                </div>

                {showSetAllPopUp && (
                  <SetAllComponent
                    ref={modifyTableRef}
                    screenName={
                      storeRadioType === "store"
                        ? "product_mapping"
                        : "product_mapping_store_group"
                    }
                    showSetAllPopUp={showSetAllPopUp}
                    commonSetAllStores={commonSetAllProducts}
                    selectedProducts={props.selectedProducts}
                    setAllPopUpFields={setAllPopUpFields}
                    setshowSetAllPopUp={setshowSetAllPopUp}
                    {...(storeRadioType === "store" && {
                      selectedStoreObjects: selectedStoreObjects,
                    })}
                    {...(storeRadioType === "store_groups" && {
                      selectedStoreGroupObjects: selectedStoreGroupObjects,
                    })}
                    onClickFilter={async () => {
                      onClickFilter();
                    }}
                    storeGroupSetAllApply={storeGroupSetAllApply}
                    filterDependency={filterDependency}
                    isAggregated={props.isAggregated}
                    isTimePeriodPresent={isTimePeriodPresent}
                    isUnmapSetAll={isUnmapClicked}
                    setIsUnmapClicked={setIsUnmapClicked}
                  />
                )}

                {displayTimeBoundMappingDialog && (
                  <TimeBoundDialog
                    ref={modifyTableRef}
                    screenName="product_mapping"
                    displayDialog={displayTimeBoundMappingDialog}
                    selectedProducts={props.selectedProducts}
                    onCloseDialog={onTimeBoundDialogClose}
                    selectedStoreObjects={selectedStoreObjects}
                    editedAPIPayload={storeData}
                    setEditedAPIPayload={setStoreData}
                    setdisplayTimeBoundMappingDialog={
                      setdisplayTimeBoundMappingDialog
                    }
                    editOrDeleteEditedAPIPayload={editOrDeleteEditedAPIPayload}
                    seteditOrDeleteEditedAPIPayload={
                      seteditOrDeleteEditedAPIPayload
                    }
                    setAllPopUpFields={setAllPopUpFields}
                    modifyTableLoader={showloader}
                    conflictObject={conflictProdMappingData}
                    updateConflictObject={setconflictProdMappingData}
                    isAggregated={props.isAggregated}
                  />
                )}
                {storeRadioType === "store_groups" && showModifyTable && (
                  <ModifyStoreGroupsTable
                    ref={modifyStoreGroupsTableRef}
                    filterDependency={filterDependency}
                    setSelectedStoreGroupObjects={setSelectedStoreGroupObjects}
                    setStoreGroupDatesAPIPayload={setStoreGroupDatesAPIPayload}
                    storeGroupDatesAPIPayload={storeGroupDatesAPIPayload}
                    clearExisitingStoreGroups={clearExisitingStoreGroups}
                    selectedProducts={props.selectedProducts}
                    getDefaultStoreGroupPayload={getDefaultStoreGroupPayload}
                    defaultStartDate={storeGroupStartDate}
                    defaultEndDate={storeGroupEndDate}
                    updateStoreGroupRowNodeDate={updateStoreGroupRowNodeDate}
                    setHideSetDates={setHideSetDates}
                    setloader={setloader}
                  />
                )}
                {storeRadioType === "store" && showModifyTable && (
                  <ModifyTable
                    ref={{ modifyTableRef: modifyTableRef }}
                    screenName={"product_mapping"}
                    fetchData={updateProductsData}
                    filterDependency={filterDependency}
                    selectedProducts={props.selectedProducts}
                    setloader={setloader}
                    selectedDimension={props.selectedDimension}
                    updateProductsData={updateProductsData}
                    selectedStoreObjects={selectedStoreObjects}
                    toggleTimeBoundDialogView={setdisplayTimeBoundMappingDialog}
                    setselectedStoreObjects={setselectedStoreObjects}
                    defaulttableData={defaultRowData}
                    editedAPIPayload={storeData}
                    setEditedAPIPayload={setStoreData}
                    displayTimeBoundMappingDialog={
                      displayTimeBoundMappingDialog
                    }
                    editOrDeleteEditedAPIPayload={editOrDeleteEditedAPIPayload}
                    seteditOrDeleteEditedAPIPayload={
                      seteditOrDeleteEditedAPIPayload
                    }
                    conflictObject={conflictProdMappingData}
                    updateConflictObject={setconflictProdMappingData}
                  />
                )}
              </Paper>
            </div>
            <Grid
              className={`${globalClasses.bottomButtonsContainer} ${globalClasses.layoutAlignEnd}`}
              gap={2}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => saveRequest()}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                className={globalClasses.marginLeft1rem}
                onClick={() => {
                  if (
                    storeData.length ||
                    editOrDeleteEditedAPIPayload.length ||
                    selectedStoreGroupObjects.length
                  ) {
                    showConfirmBox(true);
                  } else {
                    displaySnackMessages("No changes are made", "warning");
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                className={globalClasses.marginLeft1rem}
                onClick={() => {
                  props.goBack();
                }}
              >
                Go Back
              </Button>
            </Grid>
          </Loader>
        </CoreComponentScreen>
      </>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}

const mapStateToProps = (store) => {
  return {
    productMappingModifyFilterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productMappingModifyFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    isAggregated: store.productMappingReducerService.isAggregated,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    validateProductMappingTimeBounds: (payload) =>
      dispatch(validateProductMappingTimeBounds(payload)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    mapProductsToStoreGroup: (body, queryParams) =>
      dispatch(mapProductsToStoreGroup(body, queryParams)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
    fetchAllStoreCodes,
    fetchAllStoreGroups,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ProductsFilter);
