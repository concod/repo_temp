import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { isEmpty, cloneDeep, isNull } from "lodash";
import {
  fetchAllProductCodes,
  fetchAllProducteGroups,
} from "core/pages/product-grouping/product-grouping-service";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../../Utils/Loader/loader";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
import { addSnack } from "../../../actions/snackbarActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import {
  editOrDelete,
  getAllRefStores,
  getAllStoreGroupProducts,
  getAllStoreProducts,
  mapStoreGroupToProduct,
  mapStoreToProduct,
  validateTimeBounds,
} from "../services/storeMappingService";
import {
  parseMappings,
  prepareCreatePayload,
  splitMappedAndUnmappedData,
  addDateFieldSelection,
} from "./common-mapping-functions";
import Exceptions from "./exception";
import "./filter.scss";
import ModifyTable from "./modify-table";
import ReferenceStore from "./reference-store";
import SetAllComponent from "./set-all-component";
import TimeBoundDialog from "./time-bound-dialog";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import moment from "moment";
import { Prompt as IaPrompt } from "impact-ui";

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

const ProductsFilter = forwardRef((props, ref) => {
  const [showloader, setloader] = useState(true);
  const [defaulttableData, setDefaulttableData] = useState([]);
  const [showException, updateShowException] = useState(false);
  const [alignment, setAlignment] = useState("product");
  const [referenceStore, setReferenceStore] = useState([]);
  const [productData, setProductData] = useState([]);
  const [confirmBox, showConfirmBox] = useState(false);
  const [editedProductsData, setEditedProductsData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  //To display set all multi row pop up
  const [showSetAllPopUp, setshowSetAllPopUp] = useState(false);
  const [setAllPopUpFields, setsetAllPopUpFields] = useState([]);
  const [defaultSetAllFields, setDefaultSetAllFields] = useState([]);
  const [commonSetAllStores, setcommonSetAllStores] = useState([]);
  const [isCancelled, setisCancelled] = useState(false); // isCancelled is made true when we click on cancel button
  const [
    displayTimeBoundMappingDialog,
    setdisplayTimeBoundMappingDialog,
  ] = useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();
  /**
   * New Modify Table State variables
   */
  const [selectedProductObjects, setselectedProductObjects] = useState([]); //All the selected Product Ids in modify table
  const modifyTableRef = useRef(null);
  const [
    editOrDeleteEditedAPIPayload,
    seteditOrDeleteEditedAPIPayload,
  ] = useState([]);
  const [setAllConfirmBox, showsetAllConfirmBox] = useState(false);
  const [conflictStoreMappingData, setconflictStoreMappingData] = useState({});
  const onFilterDependency = useRef([]);
  const [selectedRefStore, setSelectedRefStore] = useState({});
  const [refStoreLoader, setRefStoreLoader] = useState(false);
  const [isTimePeriodPresent, setIsTimePeriodPresent] = useState(false);
  const [isUnmapClicked, setIsUnmapClicked] = useState(false);
  const [showModifyTable, setShowModifyTable] = useState(true);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Flag to indicate that the Apply/Filter action has been triggered. This flag is required
  const [isApplyButtonClicked, setIsApplyButtonClicked] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  /**
   * Whenever payload to send to backend is changed, we update the edited flag to true for
   * prompt dialog to appear when navigating out of the page
   */
  useEffect(() => {
    props.updateFlagEdit(productData.length > 0);
  }, [productData]);

  useEffect(() => {
    if (modifyTableRef.current) {
      modifyTableRef.current.api.filterDashboardConfiguration =
        props.filterDashboardConfiguration;
    }
  }, [props.filterDashboardConfiguration]);

  /**
   * @func
   * @desc Fetch filter Options and Product Groups and initialise filter options
   */
  useEffect(() => {
    const getInitialData = async () => {
      setRefStoreLoader(true);
      const mappingDateFilter = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_date_filter"
      );
      mappingDateFilter && setShowDateFilter(mappingDateFilter);
      try {
        let columnsResp = await getColumnsAg(
          "table_name=store_mapping_set_all_fields"
        )();
        setsetAllPopUpFields(columnsResp);
        setDefaultSetAllFields(columnsResp);
        setIsTimePeriodPresent(isColumnPresent(columnsResp, "start_date"));
        let data = await fetchFilterFieldValues(
          "store Mapping modify screen",
          props.savedFilterSelection,
          props.screenName
        );
        if (isEmpty(props.filterDashboardConfiguration)) {
          const filterConfigData = [
            {
              filterSectionHeader: "Merchant Category",
              filterDashboardData: data,
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Product Mapping";
          }
          const filterConfig = formattedFilterConfiguration(
            "storeToProductMappingModifyFilterConfiguration",
            filterConfigData,
            "Store To Product Mapping"
          );
          props.setFilterConfiguration(filterConfig);
        }

        let { data: reference_store } = await getAllRefStores()();
        reference_store.data = reference_store.data.map((item) => {
          return {
            value: item.store_code,
            label: item.store_name,
            id: item.store_code,
          };
        });
        setReferenceStore(reference_store.data);
        setRefStoreLoader(false);
      } catch (error) {
        displaySnackMessages("Something went wrong", "error");
        setRefStoreLoader(false);
      }
    };

    getInitialData();
  }, []);

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
        value: item.pg_code,
      };
    });
    return filterValues;
  };

  const checkEditedRow = (arr) => {
    return arr.map((item) => {
      let editedRow = editedProductsData.filter(
        (row) => row.product_code === item.product_code
      );
      return editedRow.length > 0 ? editedRow[0] : item;
    });
  };

  const getSelectedRefStore = (storeFilters) => {
    //If the dynamic label is different from store_code
    if (dynamicLabelKeysBasedOnTenant("store_code", "core") !== "store_code") {
      //Fetch the store_code filter if already selected
      let store_code = storeFilters.find((element) => {
        return element.filter_id === "store_code";
      });
      //If not selected, fetch it from the filter config updated data
      if (!store_code) {
        //Need to verify with Aayush if this logic is uniform across
        const filterConfig =
          modifyTableRef?.current?.api?.filterDashboardConfiguration
            ?.filterConfig[0]["filterDashboardData"];
        //In the filter config data, store_code
        const filter_store_code_data = filterConfig.find(
          (ele) => ele.column_name === "store_code"
        );
        //If store code is not present in the config, return empty string
        if (!filter_store_code_data) return "";
        return filter_store_code_data?.initialData[0].value; //else return value
      }
      return store_code.values[0];
    }
    return storeFilters.values[0];
  };
  const updateProductsData = async (
    body,
    pageIndex,
    alignmentSelection,
    selectedRefStore = null,
    refStoreCount = 0
  ) => {
    if (isEmpty(body?.filters)) {
      //Don't load products on mount of table without selecting any filters
      setloader(false);
      return {
        data: [],
        total: 0,
      };
    }
    const storeFilters = body.filters.find((element) => {
      return (
        element.filter_id ===
        dynamicLabelKeysBasedOnTenant("store_code", "core")
      );
    });
    if (storeFilters) {
      alignmentSelection = "reference_store";
      selectedRefStore = getSelectedRefStore(body.filters);
    }
    let queryParams =
      pageIndex && alignmentSelection !== "reference_store"
        ? `&page=${pageIndex + 1}`
        : alignmentSelection === "reference_store"
        ? `&reference_store=${selectedRefStore}`
        : "";
    let productsRespObj = {};
    body.filters = body.filters.filter(
      (filter) => filter.filter_id !== "store_code"
    );
    if (props.selectedDimension === "store") {
      if (showDateFilter) {
        body = addDateFieldSelection(startDate, endDate, body, "product");
      }
      if (props.isAggregated) {
        body.selection.unique_columns = ["aggregation_code"];
      }
      const level = props.isAggregated ? "aggregation" : "product";
      const { data: products } = await getAllStoreProducts(
        body,
        queryParams,
        level
      )();
      productsRespObj = products;
    } else {
      const { data: products } = await getAllStoreGroupProducts(
        body,
        queryParams
      )();
      productsRespObj = products;
    }
    productsRespObj.data = productsRespObj.data.map((item) => {
      item.include_unmapped =
        item.num_stores_mapped.split("/")[0] ===
        item.num_stores_mapped.split("/")[1];
      item.is_calendar_disabled = true;
      //we disable the include unmapped as there are no include unmapped to perform
      item.is_include_unmapped_disabled =
        item.num_stores_mapped.split("/")[0] ===
        item.num_stores_mapped.split("/")[1];
      return item;
    });
    if (editedProductsData.length > 0 && !isCancelled) {
      productsRespObj.data = checkEditedRow(productsRespObj.data);
    }
    setDefaulttableData([...defaulttableData, ...productsRespObj.data]);
    props.updateFlagEdit(false);
    if (isCancelled) {
      setisCancelled(false);
      setEditedProductsData([]);
    }
    setloader(false);
    return {
      data: productsRespObj.data,
      total: productsRespObj.total,
    };
  };

  //Reset the changes that were made when we either reset or toggle between reference store tab
  //or when applied a new filter
  const resetSavedChanges = () => {
    setProductData([]);
    seteditOrDeleteEditedAPIPayload([]);
  };

  const saveRequest = () => {
    if (productData?.length > 0 || editOrDeleteEditedAPIPayload?.length > 0) {
      setShowModal(true);
    } else {
      displaySnackMessages("There are no changes to save", "warning");
    }
  };

  useEffect(() => {
    if (!showModifyTable) setShowModifyTable(true);
  }, [showModifyTable]);

  const onClickFilter = () => {
    setShowModifyTable(false);
    resetSavedChanges();
    setIsApplyButtonClicked(true); 
  };

  const onConfirm = async () => {
    setShowModal(false);
    try {
      setloader(true);
      if (!isEmpty(conflictStoreMappingData)) {
        displaySnackMessages(
          "Please resolve the overlapping dates before saving",
          "error"
        );
        setloader(false);
        return;
      }
      if (props.selectedDimension === "store") {
        let [
          individualMappedObjects,
          individualUnMappedObjects,
        ] = splitMappedAndUnmappedData(productData, "store_mapping");
        let includeUnmappedObjects = productData.filter(
          (data) => data.include_unmapped
        );
        individualMappedObjects = prepareCreatePayload(
          [...individualMappedObjects, ...includeUnmappedObjects],
          props.selectedProducts,
          "store_mapping"
        );
        includeUnmappedObjects = individualMappedObjects.filter(
          (data) => data.include_unmapped
        );
        individualMappedObjects = individualMappedObjects.filter(
          (data) => !data.include_unmapped && data.select.length > 0
        );
        // this gives an object with dates as keys
        const payloadResp = individualMappedObjects.reduce(
          (payload, product) => {
            const date =
              product.valid_from +
              "+" +
              product.valid_to +
              "+" +
              product.product_code;
            if (!payload[date]) {
              payload[date] = [];
            }
            payload[date].push(product.select[0]);
            return payload;
          },
          {}
        );
        // Edit: to add it in the array format instead
        const productsArray = Object.keys(payloadResp).map((date) => {
          const KeyArr = date.split("+");
          return {
            product_code: KeyArr[2],
            include_unmapped: false,
            map: true,
            select: payloadResp[date],
            unselect: [],
            valid_from: KeyArr[0],
            valid_to: KeyArr[1],
          };
        });
        if (productsArray.length > 0 || includeUnmappedObjects.length > 0) {
          let body = {
            products: [...includeUnmappedObjects, ...productsArray],
            stores: props.selectedProducts.map((item) => item.store_code),
            action: "conflict_combine",
          };
          const level = props.isAggregated ? "aggregation" : "product";
          await mapStoreToProduct(body, level)();
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
      } else {
        let body = {
          products: productData,
          store_groups: props.selectedProducts.map((item) => item.sg_code),
        };
        await mapStoreGroupToProduct(body)();
      }
      setEditedProductsData([]);
      props.addSnack({
        message: "Store Mapping Data Saved Successfully",
        options: {
          variant: "success",
        },
      });
      onClickFilter();

      setloader(false);
    } catch (err) {
      setloader(false);
      props.addSnack({
        message: err?.response?.data?.detail || "Something went wrong.",
        options: {
          variant: "error",
        },
      });
    }
  };

  const handleChange = (event, newAlignment) => {
    if (newAlignment && newAlignment !== alignment) {
      setAlignment(newAlignment);
    }
    onClickFilter();
  };

  const onApply = async (exceptions) => {
    setloader(true);
    let productBody = [];
    //We loop over the exceptions list and parse the store codes and product codes to
    //the api payload
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
    if (props.selectedDimension === "store") {
      let postReq = {
        body: productBody,
      };
      await editOrDelete(postReq, props.isAggregated)();
    } else {
      let postReq = {
        products: productData,
        store_groups: props.selectedProducts.map((item) => item.sg_code),
      };
      await mapStoreGroupToProduct(postReq)();
    }
    onClickFilter();
    setloader(false);
    setShowModal(false);
    displaySnackMessages("Applied unmappings done successfully", "success");
    updateShowException(false);
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
    let storeIdText;
    let exceptionsFields = [
      {
        label: `Select ${captializeStringIfCamelCase(
          dynamicLabelsBasedOnTenant("product", "core")
        )}s`,
        field_type: "dropdown",
        isMulti: true,
        required: true,
        options: [],
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
    if (props.selectedDimension === "store") {
      storeIdText = props.selectedProducts.map(
        (item) => item[dynamicLabelKeysBasedOnTenant("store_code", "core")]
      );
      storeIdText =
        props.selectedProducts.length > 3
          ? storeIdText.slice(0, 3).join(" , ")
          : storeIdText.join(" , ");
    } else {
      storeIdText = props.selectedProducts.map((item) => item.sg_code);
      storeIdText =
        props.selectedProducts.length > 3
          ? storeIdText.slice(0, 3).join(" , ")
          : storeIdText.join(" , ");
    }

    /**
     * This function checks for common mapped stores presence and opens the pop up
     * if there are common mapped stores or else throws an error saying no common stores present
     */
    const openSetAllPopUp = () => {
      setcommonSetAllStores(
        props.selectedProducts.map((store) => store.store_code)
      );
      setshowSetAllPopUp(true);
    };

    /**
     * Close the Time bound Dialog box
     */
    const onTimeBoundDialogClose = () => {
      setdisplayTimeBoundMappingDialog(false);
    };

    const getPromptStatus = (loc) => {
      const message = `Are you sure you want to go to ${loc.pathname}?`;
      if (
        productData.length !== 0 ||
        editOrDeleteEditedAPIPayload.length !== 0
      ) {
        return message;
      }
      return true;
    };

    const onSetAllBtnClick = (isUnmap = false) => {
      setIsUnmapClicked(false); //resetting it to false on click of any set all button
      if (!isEmpty(selectedProductObjects)) {
        if (productData.length > 0 || editOrDeleteEditedAPIPayload.length > 0) {
          showsetAllConfirmBox(true);
          return;
        }
        if (isUnmap) {
          setIsTimePeriodPresent(false);
          setIsUnmapClicked(true);
          setsetAllPopUpFields(
            cloneDeep(defaultSetAllFields).filter(
              (col) => !["start_date", "end_date"].includes(col.column_name)
            )
          );
        } else {
          setIsTimePeriodPresent(isColumnPresent(defaultSetAllFields, "start_date"));
          setsetAllPopUpFields(defaultSetAllFields);
        }
        openSetAllPopUp();
      } else {
        props.addSnack({
          message: `Please select atleast one ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )}(s)`,
          options: {
            variant: "error",
          },
        });
      }
    };

    const onFilterDashboardClick = (dependencyData) => {
      onFilterDependency.current = dependencyData;
      onClickFilter();
    };

    return (
      <>
        {alignment === "product" ? (
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"storeToProductMappingModifyFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            hideNoDataFound
          >
            <Prompt when={productData.length > 0 ? true : false} message={""} />
            <div
              className={`${globalClasses.marginTop}`}
              data-testid="filterContainer"
            >
              <Typography variant="body1" paragraph={true}>
                <Typography component="span" className={classes.labelText}>
                  {" "}
                  {props.selectedDimension === "store"
                    ? "Selected Store"
                    : "Selected Store Group "}
                  -
                </Typography>
                <Typography
                  component="span"
                  className={`${classes.labelText} ${globalClasses.marginLeft1rem}`}
                >
                  {props.selectedDimension === "store"
                    ? dynamicLabelsBasedOnTenant("store_code", "core")
                    : "Store Group ID"}
                  : {""}
                  <Typography
                    component="span"
                    className={`${classes.fieldText} ${globalClasses.marginHorizontal}`}
                  >
                    {`${storeIdText}`}
                  </Typography>
                  {props.selectedProducts.length > 3 && (
                    <Typography
                      component="span"
                      className={classes.extraLength}
                    >
                      {`+${props.selectedProducts.length - 3}`}{" "}
                    </Typography>
                  )}
                </Typography>
              </Typography>
              {confirmBox && (
                <ConfirmBox
                  onClose={() => showConfirmBox(false)}
                  onConfirm={() => {
                    onClickFilter();
                    showConfirmBox(false);
                  }}
                />
              )}
              {setAllConfirmBox && (
                <ConfirmBox
                  onClose={() => showsetAllConfirmBox(false)}
                  onConfirm={() => {
                    onClickFilter();
                    seteditOrDeleteEditedAPIPayload([]);
                    setProductData([]);
                    showsetAllConfirmBox(false);
                  }}
                />
              )}
              <IaPrompt
                id={"routePrompt"}
                isOpen={showModal}
                title="Update Changes"
                subHeading="Are you sure to update all changes ?"
                infoList={[]}
                primaryButtonProps={{
                  children: "Update",
                  onClick: () => {
                    onConfirm();
                  },
                }}
                tertiaryButtonProps={{
                  children: "Close",
                  onClick: () => setShowModal(false),
                }}
              />

              <Loader loader={showloader}>
                <div data-testid="resultContainer">
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
                  >
                    <Typography variant="h6" gutterBottom>
                      Review Status
                    </Typography>
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
                    >
                      {showDateFilter && (
                        <DateRangePicker
                          disableType="disableOnlyPast"
                          startDate={startDate}
                          endDate={endDate}
                          focusedInput={focusedInput}
                          onDatesChange={onDatesChange}
                          onFocusChange={onFocusChange}
                          disabled={isEmpty(onFilterDependency.current)}
                        />
                      )}
                      <Button
                        variant="contained"
                        color="primary"
                        id="storeSetAllBtn"
                        onClick={() => onSetAllBtnClick()}
                      >
                        Set All
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        id="storeUnmapSetAllBtn"
                        onClick={() => onSetAllBtnClick(true)}
                      >
                        Unmap Set All
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        id="modifyAddExceptionBtn"
                        className={globalClasses.marginLeft1rem}
                        onClick={() => {
                          updateShowException(true);
                        }}
                        disabled={
                          (onFilterDependency?.current || []).length === 0
                        }
                      >
                        Add Exceptions
                      </Button>
                    </div>
                  </div>
                  {showException && (
                    <Exceptions
                      fields={exceptionsFields}
                      onApply={onApply}
                      toggleError={(errMsg) => {
                        setloader(false);
                        displaySnackMessages(errMsg, "error");
                      }}
                      handleModalClose={() => {
                        updateShowException(false);
                      }}
                      selectedStoreOrGrps={props.selectedProducts}
                      tabDimension={props.selectedDimension}
                      allStoresInfo={referenceStore}
                      filterDependency={onFilterDependency.current}
                      screenName={"store_mapping"}
                      isAggregated={props.isAggregated}
                    ></Exceptions>
                  )}
                  {showSetAllPopUp && (
                    <SetAllComponent
                      ref={modifyTableRef}
                      screenName="store_mapping"
                      showSetAllPopUp={showSetAllPopUp}
                      commonSetAllStores={commonSetAllStores}
                      selectedProducts={props.selectedProducts}
                      setAllPopUpFields={setAllPopUpFields}
                      setshowSetAllPopUp={setshowSetAllPopUp}
                      selectedProductObjects={selectedProductObjects}
                      onClickFilter={async () => {
                        onClickFilter();
                      }}
                      filterDependency={onFilterDependency.current}
                      isAggregated={props.isAggregated}
                      isTimePeriodPresent={isTimePeriodPresent}
                      isUnmapSetAll={isUnmapClicked}
                      setIsUnmapClicked={setIsUnmapClicked}
                    />
                  )}

                  {displayTimeBoundMappingDialog && (
                    <TimeBoundDialog
                      ref={modifyTableRef}
                      setAllPopUpFields={setAllPopUpFields}
                      screenName="store_mapping"
                      displayDialog={displayTimeBoundMappingDialog}
                      selectedStores={props.selectedProducts}
                      onCloseDialog={onTimeBoundDialogClose}
                      selectedProductObjects={selectedProductObjects}
                      editedAPIPayload={productData}
                      setEditedAPIPayload={setProductData}
                      setdisplayTimeBoundMappingDialog={
                        setdisplayTimeBoundMappingDialog
                      }
                      editOrDeleteEditedAPIPayload={
                        editOrDeleteEditedAPIPayload
                      }
                      seteditOrDeleteEditedAPIPayload={
                        seteditOrDeleteEditedAPIPayload
                      }
                      modifyTableLoader={showloader}
                      conflictObject={conflictStoreMappingData}
                      updateConflictObject={setconflictStoreMappingData}
                      isAggregated={props.isAggregated}
                    />
                  )}
                  {showModifyTable && (
                    <ModifyTable
                      ref={{
                        modifyTableRef: modifyTableRef,
                        isRedirected: ref,
                      }}
                      screenName={"store_mapping"}
                      fetchData={updateProductsData}
                      filterDependency={onFilterDependency.current}
                      selectedProducts={props.selectedProducts}
                      setloader={setloader}
                      selectedDimension={props.selectedDimension}
                      updateProductsData={updateProductsData}
                      selectedProductObjects={selectedProductObjects}
                      toggleTimeBoundDialogView={
                        setdisplayTimeBoundMappingDialog
                      }
                      setselectedProductObjects={setselectedProductObjects}
                      defaulttableData={defaulttableData}
                      editedAPIPayload={productData}
                      setEditedAPIPayload={setProductData}
                      displayTimeBoundMappingDialog={
                        displayTimeBoundMappingDialog
                      }
                      editOrDeleteEditedAPIPayload={
                        editOrDeleteEditedAPIPayload
                      }
                      seteditOrDeleteEditedAPIPayload={
                        seteditOrDeleteEditedAPIPayload
                      }
                      conflictObject={conflictStoreMappingData}
                      updateConflictObject={setconflictStoreMappingData}
                      selectedRefStore={selectedRefStore}
                      alignment={alignment}
                      isAggregated={props.isAggregated}
                      isApplyButtonClicked={isApplyButtonClicked}
                    />
                  )}
                </div>
                <div
                  className={`${globalClasses.centerAlign} ${globalClasses.evenPaddingAround}`}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    id="modifySaveBtn"
                    onClick={() => saveRequest()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    className={globalClasses.marginLeft1rem}
                    id="modifyCancelBtn"
                    onClick={() => {
                      if (
                        productData.length > 0 ||
                        editOrDeleteEditedAPIPayload.length
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
                </div>
              </Loader>
            </div>
          </CoreComponentScreen>
        ) : (
          <ReferenceStore
            options={referenceStore}
            rowData={props.selectedProducts}
            selectedDimension={props.selectedDimension}
            selectedProducts={selectedProductObjects}
            setSelectedRefStore={setSelectedRefStore}
            ref={modifyTableRef}
            {...props}
            showFilterLoader={refStoreLoader}
            isAggregated={props.isAggregated}
          ></ReferenceStore>
        )}
      </>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
});

const mapStateToProps = (state) => {
  return {
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeToProductMappingModifyFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.storeMappingReducerService.isAggregated,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (payload) => dispatch(addSnack(payload)),
    validateTimeBounds: (payload) => dispatch(validateTimeBounds(payload)),
    fetchAllProducteGroups,
    fetchAllProductCodes,
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductsFilter);