import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Form from "core/Utils/form";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import { Prompt } from "impact-ui";
import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";
import {
  SET_ALL_DEMAND_CONSTRAINTS_FORM,
  ERROR_MESSAGE,
  NO_PRODUCT_PROFILE_MAPPED,
  DEMAND_AND_CONSTRAINTS_DEMAND_VALIDATION,
  DEMAND_AND_CONSTRAINTS_MAX_FIELD_VALIDATION,
  DEMAND_AND_CONSTRAINTS_MIN_FIELD_VALIDATION,
  GO_BACK_MESSAGE,
  NEW_STORE_DEMAND_CONSTRAINTS_EDITABLE_FIELDS,
  SAME_MIN_MAX_VALIDATION_MSG,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  clearDemandConstraintsStates,
  fetchDemandAndConstraintsTableData,
  fetchUpdatedDemandAndConstraints,
  saveNewStoreDetails,
  setDemandAndConstraintsTableData,
  setDemandConstraintsFilterConfiguration,
  setDemandConstraintsScreenLoader,
  updateNewStoreDetails,
  setSubDemandAndConstraintsTableData,
} from "../../../../services-inventorysmart/New-Store/demand-constraints";
import {
  clearEditNewStoreData,
  editDemandAndConstraints,
  setEditDemandConstraints,
} from "../../../../services-inventorysmart/New-Store/new-store-dashboard";
import { getStoreSizeContributionData } from "../../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  scrollIntoView,
} from "../../../inventorysmart-utility";
import AddProductsPopup from "./AddProductsPopup";

const useStyles = makeStyles(() => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
}));

const DemandConstraints = (props) => {
  const [sisterStoreArticlesColumnConfig, setSisterStoreArticlesColumnConfig] =
    useState([]);
  const [sisterStoreArticlesData, setSisterStoreArticlesData] = useState([]);
  const [selectedArticlesColumnConfig, setSelectedArticlesColumnConfig] =
    useState([]);
  const [selectedArticlesData, setSelectedArticlesData] = useState([]);
  const [storeSizeSplitColumnConfig, setStoreSizeSplitColumnConfig] = useState(
    []
  );
  const [storeSizeSplitData, setStoreSizeSplitData] = useState([]);
  const [showPPSizeDistribution, setShowPPSizeDistribution] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [demandConstraintsEditFields, setDemandConstraintsEditFields] =
    useState(NEW_STORE_DEMAND_CONSTRAINTS_EDITABLE_FIELDS);
  const [showAddProductsPopup, setShowAddProductsPopup] = useState(false);
  const [sendToSelectedProducts, setSendToSelectedProducts] = useState([]);
  const [initialL1FilterPayload, setInitialL1FilterPayload] = useState([]);
  const [displayDemandConstraintsTables, setDisplayDemandConstraintsTables] =
    useState(false);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [editLoader, setEditLoader] = useState(false);
  const [unmount, setUnmount] = useState(false);

  const demandConstraintsTableInstance = useRef(null);
  const demandConstraintsSisterStoreInstance = useRef(null);
  const storePriceContributionRef = useRef(null);
  const finalizedSkuRef = useRef(null);
  const sisterStoreArticlesDataRef = useRef([]);
  const selectedArticlesDataRef = useRef([]);
  const subTableRef = useRef([]);
  const mainTableRef = useRef([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    const getInitialDemandConstraints = async () => {
      props.setDemandConstraintsScreenLoader(true);
      try {
        let response = await fetchFilterConfig(
          "New Store Demand And Constraint"
        );
        props.setDemandConstraintsFilterConfiguration(response);
        props.setDemandConstraintsScreenLoader(false);
      } catch (e) {
        props.setDemandConstraintsScreenLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialDemandConstraints();
    return () => {
      props.clearDemandConstraintsStates();
      demandConstraintsTableInstance.current = null;
      demandConstraintsSisterStoreInstance.current = null;
      storePriceContributionRef.current = null;
      finalizedSkuRef.current = null;
      selectedArticlesDataRef.current = [];
      subTableRef.current = [];
      sisterStoreArticlesDataRef.current = [];
      mainTableRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(props.demandConstraintsFilterConfig)) {
      props.setDemandConstraintsScreenLoader(true);
      const getFilterValues = async (selected, current) => {
        let deptNames = {};
        let flatSelectedStructure = selected?.flat();
        flatSelectedStructure.forEach((element) => {
          // iterating over each row or table_row attrs from previous steps
          if (element.attribute_name !== "store_code") {
            if (isEmpty(deptNames))
              deptNames[element.attribute_name] = element.values;
            else if (Object.keys(deptNames).includes(element.attribute_name))
              deptNames[element.attribute_name] = [
                ...new Set([
                  ...deptNames[element.attribute_name],
                  ...element.values,
                ]),
              ];
            else deptNames[element.attribute_name] = element.values;
          }
        });
        if (
          props.demandConstraintsFilterConfig.some(
            (item) => item.column_name === "channel"
          )
        ) {
          deptNames["channel"] = [
            props.finalStoreDetailsStateValues.form_attributes?.channel,
          ];
        }
        let savedFilterHierarchy = {};
        props.savedFilterSelection.forEach((item) => {
          if (
            Object.keys(deptNames).some((obj) => obj === item.attribute_name)
          ) {
            savedFilterHierarchy[item.attribute_name] = item.values;
          }
        });

        let commonHierarchy = [];
        // Perform an intersection logic to check for the common filter values from saved filter configuration and values fetched from previous step to set initially
        if (!isEmpty(savedFilterHierarchy)) {
          Object.keys(deptNames).forEach((item) => {
            if (Object.keys(savedFilterHierarchy).includes(item)) {
              let commonPayloadVal = deptNames[item].filter((val) =>
                savedFilterHierarchy[item].includes(val)
              );
              let commonValues = {
                attribute_name: item,
                values: commonPayloadVal?.length
                  ? commonPayloadVal
                  : deptNames[item],
              };
              commonHierarchy.push(commonValues);
            } else {
              let uncommonValues = {
                attribute_name: item,
                values: deptNames[item],
              };
              commonHierarchy.push(uncommonValues);
            }
          });
        } else {
          // when saved filter config is empty, map hierarchy from step 2 directly
          Object.keys(deptNames).forEach((item) => {
            let uncommonValues = {
              attribute_name: item,
              values: deptNames[item],
            };
            commonHierarchy.push(uncommonValues);
          });
        }
        let preSelectedValues = commonHierarchy.map((item) => {
          if (item.attribute_name === "channel") {
            return {
              filter_type: "cascaded",
              attribute_name: item.attribute_name,
              operator: "in",
              values: item.values,
              dimension: "store",
            };
          } else
            return {
              filter_type: "cascaded",
              attribute_name: item.attribute_name,
              operator: "in",
              values: item.values,
              dimension: "product",
            };
        });

        setInitialL1FilterPayload(deptNames);
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.demandConstraintsFilterConfig),
            appliedFilters: preSelectedValues,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          let response = await fetchFilterOptions(requiredFilterObjParams);
          // fetching only those values that are common from the API list and step 2
          response.forEach((obj) => {
            if (Object.keys(deptNames).includes(obj.column_name)) {
              obj.initialData = obj.initialData.filter((item) =>
                deptNames[obj.column_name].some((data) => data === item.value)
              );
            }
          });
          const filterDataWithCustomFilter = [...response];
          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "newStoreDemandConstraintsFilterConfiguration",
            filterConfigData,
            "Demand Constraints New Store"
          );
          props.setFilterConfiguration(filterConfig);
          props.setDemandConstraintsScreenLoader(false);
        } catch (err) {
          props.displaySnackMessages(ERROR_MESSAGE, "error");
          props.setDemandConstraintsScreenLoader(false);
        }
      };
      getFilterValues(props.finalStoreDetailsStateValues?.table_row_attributes);
    }
  }, [props.demandConstraintsFilterConfig, props.finalStoreDetailsStateValues]);

  // useEffect to fetch table data based on table row attrs key from props.editNewStoreData while editing
  useEffect(() => {
    (async () => {
      if (
        !isEmpty(props.editNewStoreData) &&
        !isEmpty(props.finalStoreDetailsStateValues)
      ) {
        setEditLoader(true);
        try {
          let response = await props.editDemandAndConstraints({
            id: props.editNewStoreData?.store_code,
            data: {
              table_row_attributes:
                props.finalStoreDetailsStateValues?.table_row_attributes,
            },
            attr: props?.sisterStoreHierarchyKey,
          });
          props.setEditDemandConstraints(response.data?.data);
          setEditLoader(false);
        } catch (e) {
          setEditLoader(false);
          props.displaySnackMessages(ERROR_MESSAGE, "error");
        }
      }
    })();
  }, [props.editNewStoreData, props.finalStoreDetailsStateValues]);

  useEffect(() => {
    if (!isEmpty(props.editDemandConstraints)) {
      let copyEditDemandConstriants = cloneDeep(props.editDemandConstraints);
      copyEditDemandConstriants = copyEditDemandConstriants.map((item) => {
        return {
          ...item,
          is_edited: true, // set is_edited to true for rows in edit flow to avoid calling demand api so that we show the demand that was originally saved.
        };
      });
      if (selectedArticlesData?.length) {
        let uniqueIds = copyEditDemandConstriants.filter((item) =>
          selectedArticlesData.some(
            (obj) => parseInt(obj.mapping_code) !== parseInt(item.mapping_code)
          )
        );
        setSelectedArticlesData([...uniqueIds, ...selectedArticlesData]);
        let cloneSubTableData = cloneDeep([
          ...uniqueIds,
          ...selectedArticlesData,
        ]);
        props.setSubDemandAndConstraintsTableData(cloneSubTableData);
      } else {
        setSelectedArticlesData(copyEditDemandConstriants);
        let cloneEditDemandConstraints = cloneDeep(copyEditDemandConstriants);
        props.setSubDemandAndConstraintsTableData(cloneEditDemandConstraints);
      }
    }
  }, [props.editDemandConstraints]);

  useEffect(() => {
    mainTableRef.current = cloneDeep(props.demandConstraintsTableData);
  }, [props.demandConstraintsTableData]);

  useEffect(() => {
    subTableRef.current = cloneDeep(props.subDemandConstraintsTableData);
  }, [props.subDemandConstraintsTableData]);

  useEffect(() => {
    if (unmount && props.subDemandConstraintsTableData.length) {
      setUnmount(false);
      setSelectedArticlesData(cloneDeep(props.subDemandConstraintsTableData));
    }
  }, [unmount, props.subDemandConstraintsTableData]);

  useEffect(() => {
    if (!isEmpty(sisterStoreArticlesData))
      sisterStoreArticlesDataRef.current = cloneDeep(sisterStoreArticlesData);
  }, [sisterStoreArticlesData]);

  useEffect(() => {
    if (!isEmpty(selectedArticlesData))
      selectedArticlesDataRef.current = cloneDeep(selectedArticlesData);
  }, [selectedArticlesData]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const openSetAllModal = () => {
    if (selectedRows.length) {
      setOpenDialogForSetAll(true);
    }
  };

  const applyEditOnSelectedRows = async () => {
    if (Object.values(demandConstraintsEditFields).some((val) => !val)) {
      props.displaySnackMessages("Enter all mandatory fields", "warning");
    } else {
      if (
        parseInt(demandConstraintsEditFields.max_stock) <
        parseInt(demandConstraintsEditFields.min_stock)
      ) {
        props.displaySnackMessages(
          DEMAND_AND_CONSTRAINTS_MAX_FIELD_VALIDATION,
          "error"
        );
      } else if (
        parseInt(demandConstraintsEditFields.min_stock) ===
        parseInt(demandConstraintsEditFields.max_stock)
      ) {
        props.displaySnackMessages(SAME_MIN_MAX_VALIDATION_MSG, "error");
      } else if (
        parseInt(demandConstraintsEditFields.demand_estimated) >
          parseInt(demandConstraintsEditFields.max_stock) ||
        parseInt(demandConstraintsEditFields.demand_estimated) <
          parseInt(demandConstraintsEditFields.min_stock)
      ) {
        props.displaySnackMessages(
          DEMAND_AND_CONSTRAINTS_DEMAND_VALIDATION,
          "error"
        );
      } else {
        let cloneOfSelectedArticlesData = cloneDeep(
          props.subDemandConstraintsTableData
        );
        let updatedDemand = updateSetAllValuesInTable(
          cloneOfSelectedArticlesData
        );
        setSelectedArticlesData([]);
        setSetAllChangesInRedux(updatedDemand);
        setOpenDialogForSetAll(false);
        setSelectedRows([]);
        setDemandConstraintsEditFields(
          NEW_STORE_DEMAND_CONSTRAINTS_EDITABLE_FIELDS
        );
        setUnmount(true);
      }
    }
  };

  const setSetAllChangesInRedux = (updatedDemand) => {
    let cloneUpdatedDemand = cloneDeep(updatedDemand);
    props.setSubDemandAndConstraintsTableData(cloneUpdatedDemand);
  };

  const setRowEditInRedux = (row) => {
    let cloneOfSelectedArticlesData = cloneDeep(subTableRef.current);
    let rowIndex = cloneOfSelectedArticlesData?.findIndex(
      (obj) => obj.mapping_code === row.mapping_code
    );
    if (rowIndex !== -1) {
      cloneOfSelectedArticlesData[rowIndex] = row;
      props.setSubDemandAndConstraintsTableData(cloneOfSelectedArticlesData);
    }
  };

  const updateSetAllValuesInTable = (tableRows) => {
    return tableRows.map((item) => {
      if (
        selectedRows.some(
          (obj) => parseInt(obj.mapping_code) === parseInt(item.mapping_code)
        )
      ) {
        return {
          ...item,
          min_stock: demandConstraintsEditFields.min_stock
            ? demandConstraintsEditFields.min_stock
            : item.min_stock,
          max_stock: demandConstraintsEditFields.max_stock
            ? demandConstraintsEditFields.max_stock
            : item.max_stock,
          wos: demandConstraintsEditFields.wos
            ? demandConstraintsEditFields.wos
            : item.wos,
          demand_estimated: demandConstraintsEditFields.demand_estimated
            ? demandConstraintsEditFields.demand_estimated
            : item.demand_estimated,
          is_demand_calculated: true,
          is_edited: true,
          forecast_estimated: item?.forecast_estimated
            ? item.forecast_estimated
            : 0,
          selected: false,
        };
      } else return item;
    });
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    if (isChanged) {
      if (column.colId === "wos") {
        let response = await fetchUpdatedDemandOnWOS([data], value);
        data.wos = value;
        data.is_demand_calculated = true;
        data.is_edited = true;
        data.forecast_estimated = parseFloat(response[0]?.forecast_estimated);
        data.demand_estimated = Math.min(
          Number(data.max_stock),
          Math.max(
            Number(data.min_stock),
            parseFloat(response[0]?.forecast_estimated)
          )
        );
        demandConstraintsTableInstance.current?.api?.refreshCells({
          columns: ["demand_estimated", "forecast_estimated"],
        });
      }
      if (column.colId === "max_stock") {
        if (parseInt(value) < parseInt(data.min_stock)) {
          props.displaySnackMessages(
            DEMAND_AND_CONSTRAINTS_MAX_FIELD_VALIDATION,
            "error"
          );
          data.max_stock = initialValue;
          demandConstraintsTableInstance.current?.api?.refreshCells({
            columns: ["max_stock"],
          });
        } else {
          data.max_stock = value;
          data.demand_estimated = Math.min(
            Number(data.max_stock),
            Math.max(
              Number(data.min_stock),
              parseFloat(data?.forecast_estimated)
            )
          );

          demandConstraintsTableInstance.current?.api?.refreshCells({
            columns: ["max_stock", "demand_estimated"],
          });
        }
      }

      if (column.colId === "min_stock") {
        if (parseInt(value) > parseInt(data.max_stock)) {
          props.displaySnackMessages(
            DEMAND_AND_CONSTRAINTS_MIN_FIELD_VALIDATION,
            "error"
          );
          data.min_stock = initialValue;
          demandConstraintsTableInstance.current?.api?.refreshCells({
            columns: ["min_stock"],
          });
        } else {
          data.min_stock = value;
          data.demand_estimated = Math.min(
            Number(data.max_stock),
            Math.max(
              Number(data.min_stock),
              parseFloat(data?.forecast_estimated)
            )
          );
          demandConstraintsTableInstance.current?.api?.refreshCells({
            columns: ["min_stock", "demand_estimated"],
          });
        }
      }

      if (column.colId === "demand_estimated") {
        if (
          parseInt(value) > parseInt(data.max_stock) ||
          parseInt(value) < parseInt(data.min_stock)
        ) {
          props.displaySnackMessages(
            DEMAND_AND_CONSTRAINTS_DEMAND_VALIDATION,
            "error"
          );
          data.demand_estimated = initialValue;
        } else {
          data.demand_estimated = value;
        }
        demandConstraintsTableInstance.current?.api?.refreshCells({
          columns: ["demand_estimated"],
        });
      }
      // after making edits save the updated changes to redux
      // Note - demand value will be lost if wos is not changed, demand will be calculated based on API response as is_edited is false
      setRowEditInRedux(data);
    }
  };

  const fetchUpdatedDemandOnWOS = async (rows, wosVal) => {
    try {
      props.setDemandConstraintsScreenLoader(true);
      let leadTime = props.finalStoreDetailsStateValues?.dc_row_attributes.map(
        (item) => parseInt(item.lead_time)
      );
      let maxLeadTime = Math.max(...leadTime);
      let reqBody = {
        demand: rows.map((item) => {
          return {
            product_code: item.product_code,
            store_code: item.store_code,
            wos: wosVal ? wosVal : item.wos,
            mapping_code: item.mapping_code,
            article: item.article,
            transit_time: maxLeadTime,
          };
        }),
        reservation_start_date:
          props.finalStoreDetailsStateValues.other_attributes
            .reservation_start_date,
      };
      let response = await props.fetchUpdatedDemandAndConstraints(reqBody);
      props.setDemandConstraintsScreenLoader(false);
      return response.data.data;
    } catch (e) {
      props.setDemandConstraintsScreenLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return [];
    }
  };

  const handleChangeSisterStoreAttrs = (updatedFormData) => {
    setDemandConstraintsEditFields(updatedFormData);
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    setDemandConstraintsEditFields(
      NEW_STORE_DEMAND_CONSTRAINTS_EDITABLE_FIELDS
    );
  };

  const openPopUpModal = () => {
    return (
      <Dialog
        open={openDialogForSetAll}
        onClose={() => setOpenDialogForSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Set All</DialogTitle>
        <DialogContent>
          <Form
            layout={"vertical"}
            maxFieldsInRow={3}
            handleChange={handleChangeSisterStoreAttrs}
            fields={SET_ALL_DEMAND_CONSTRAINTS_FORM}
            updateDefaultValue={false}
            defaultValues={demandConstraintsEditFields}
            labelWidthSpan={2}
            fieldTypeWidthSpan={6}
          ></Form>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => closeSetAll()}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => applyEditOnSelectedRows()}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const loadTableInstance = (params) => {
    demandConstraintsTableInstance.current = params;
  };

  const loadSisterStoreTableInstance = (params) => {
    demandConstraintsSisterStoreInstance.current = params;
  };

  const onSelectionChangedParentTable = (event) => {
    let selections = event.api.getSelectedRows();
    setSendToSelectedProducts(selections);
  };

  const closeAddProductsPopup = () => {
    setShowAddProductsPopup(false);
  };

  const navigateToSelectedProducts = () => {
    if (!selectedArticlesData?.length) {
      addProducts();
    } else {
      // additional check for edit flow
      let selectedCodes = sendToSelectedProducts.map((obj) => obj.mapping_code);
      if (
        selectedArticlesData.some((item) =>
          selectedCodes.includes(item.mapping_code)
        )
      ) {
        props.displaySnackMessages(
          "Some of the records with same code are already present in the below table, cannot move the records",
          "error"
        );
      } else {
        addProducts();
      }
    }
  };

  const addProducts = () => {
    /*
    Move the selected articles(rowData) from parent table to child table
    Destructure the existing rows of the child table (old) and append the selected rows of parent table
    Create a cloneDeep of selected records as same state value, in this case same rowData cannot be referenced in two tables w/o creating a copy, throws an error while editing - Cannot assign to read only properties
  */
    setSelectedArticlesData((old) => {
      return [...old, ...cloneDeep(sendToSelectedProducts)];
    });
    let allRows = subTableRef.current?.length
      ? [
          ...cloneDeep(subTableRef.current),
          ...cloneDeep(sendToSelectedProducts),
        ]
      : cloneDeep(sendToSelectedProducts);
    props.setSubDemandAndConstraintsTableData(allRows);
    demandConstraintsSisterStoreInstance.current?.api?.deselectAll(true);
    scrollIntoView(finalizedSkuRef);
  };

  const navigateToRemoveProducts = () => {
    let updatedSelectedArticlesData = selectedArticlesData.filter((item) =>
      selectedRows.every(
        (obj) => parseInt(obj.mapping_code) !== parseInt(item.mapping_code)
      )
    );
    setSelectedArticlesData(updatedSelectedArticlesData);
    props.setSubDemandAndConstraintsTableData(updatedSelectedArticlesData);
    demandConstraintsTableInstance.current?.api?.deselectAll(true);
  };

  const fetchArticleSizeDistribution = async (data, columnName) => {
    if (data?.pp_code) {
      try {
        props.setDemandConstraintsScreenLoader(true);
        let reqBody = {
          pp_code: data?.pp_code,
          channel: data?.channel,
        };
        let response = await props.getStoreSizeContributionData(reqBody);
        setShowPPSizeDistribution(true);
        let copyOfStoreSizeContributionData = cloneDeep(
          response.data?.data?.columns
        );
        let penetrationColDef = agGridColumnFormatter(
          copyOfStoreSizeContributionData
        );
        setStoreSizeSplitColumnConfig(penetrationColDef);
        setStoreSizeSplitData(response.data?.data?.data);
        props.setDemandConstraintsScreenLoader(false);
        scrollIntoView(storePriceContributionRef);
      } catch (e) {
        props.setDemandConstraintsScreenLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      props.displaySnackMessages(
        `${NO_PRODUCT_PROFILE_MAPPED} ${dynamicLabelsBasedOnTenant("article")}`,
        "error"
      );
    }
  };

  const ppAction = {
    ia_recommended: fetchArticleSizeDistribution,
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setDemandConstraintsScreenLoader(true);
    try {
      let reqBody = {
        ...props.finalStoreDetailsStateValues,
        filters: dependency,
      };
      let response = await props.fetchDemandAndConstraintsTableData(reqBody);
      props.setDemandAndConstraintsTableData(cloneDeep(response.data.data)); // to maintain original data ref for search issue
      let demandConstraintsCol = await getColumnsAg(
        "table_name=new_store_demand_and_constraint",
        null,
        ppAction
      )();
      let demandConstraintsEditCol = await getColumnsAg(
        "table_name=new_store_demand_and_constraint_edit"
      )();
      setSisterStoreArticlesColumnConfig(demandConstraintsCol);
      setSelectedArticlesColumnConfig(demandConstraintsEditCol);
      setSisterStoreArticlesData(response.data.data);
      demandConstraintsSisterStoreInstance.current?.api?.deselectAll(true);
      setDisplayDemandConstraintsTables(true);
      props.setDemandConstraintsScreenLoader(false);
      setShowPPSizeDistribution(false);
    } catch (e) {
      setShowPPSizeDistribution(false);
      props.setDemandConstraintsScreenLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const updateDependencyHandler = async (
    _dependency,
    _dimension,
    _filters,
    filterList,
    selectionDependency
  ) => {
    try {
      let copyOfFilterConfig = await cloneDeep(
        props.filterDashboardConfiguration
      );
      filterList.forEach((obj) => {
        if (Object.keys(initialL1FilterPayload).includes(obj.column_name)) {
          obj.initialData = obj.initialData.filter((item) =>
            initialL1FilterPayload[obj.column_name].some(
              (data) => data === item.value
            )
          );
        }
      });
      let preSelectedDependency = copyOfFilterConfig?.filterConfig.map(
        (item) => {
          return {
            ...item,
            filterDashboardData: filterList,
          };
        }
      );
      copyOfFilterConfig = {
        ...copyOfFilterConfig,
        filterConfig: preSelectedDependency,
      };
      let obj = {};
      obj["newStoreDemandConstraintsFilterConfiguration"] = copyOfFilterConfig;
      props.setFilterConfiguration(obj);
      props.setDemandConstraintsScreenLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setDemandConstraintsScreenLoader(false);
    }
  };

  const customDependencyValue = async (dependency, filter) => {
    let selectedDependencies = dependency.map((obj) => obj?.filter_id);
    let includesList = selectedDependencies.filter((val) =>
      Object.keys(initialL1FilterPayload).some((key) => key === val)
    );
    //  to recheck this later - works but to cross verify the payload
    if (includesList.length) {
      return dependency;
    } else {
      let hierarchyKeyFilterDependency = Object.keys(
        initialL1FilterPayload
      ).map((key) => {
        return {
          attribute_name: key,
          dimension: key === "channel" ? "store" : "product",
          display_type: "dropdown",
          filter_id: key,
          filter_type: "cascaded",
          operator: "in",
          values: initialL1FilterPayload[key],
        };
      });
      return [...dependency, ...hierarchyKeyFilterDependency];
    }
  };

  const newSelectedRecords = (rows) => {
    let cloneSisterStoreArticlesData = cloneDeep(sisterStoreArticlesData);
    let existingRowCond = cloneSisterStoreArticlesData.filter((item) =>
      rows.some(
        (row) => parseInt(row.mapping_code) === parseInt(item.mapping_code)
      )
    );
    if (existingRowCond.length) {
      props.displaySnackMessages(
        "Some of the records with the same mapping code are already present in the table, cannot push the same",
        "error"
      );
    } else {
      setShowAddProductsPopup(false);
      let updatedSisterStoreArticlesData = [
        ...rows,
        ...sisterStoreArticlesData,
      ];
      setSisterStoreArticlesData(updatedSisterStoreArticlesData);
      props.setDemandAndConstraintsTableData(updatedSisterStoreArticlesData); // to maintain original data ref for search issue
    }
  };

  const saveNewStore = async () => {
    try {
      props.setDemandConstraintsScreenLoader(true);
      let reqBody = {
        ...props.finalStoreDetailsStateValues,
        row_data: selectedArticlesData.map((item) => {
          return {
            ...item,
            is_demand_calculated: item?.is_edited
              ? true
              : item.is_demand_calculated,
          };
        }),
        store_code:
          props.finalStoreDetailsStateValues.form_attributes.store_code,
      };
      let response = isEmpty(props.editNewStoreData)
        ? await props.saveNewStoreDetails(reqBody)
        : await props.updateNewStoreDetails(reqBody);
      if (response.data?.status) {
        // navigate to configuration screen
        props.displaySnackMessages(response.data?.message, "info", () =>
          props.history.push({
            pathname: CONFIGURATION,
            state: ADD_NEW_STORE,
          })
        );
        props.clearEditNewStoreData();
      }
      props.setDemandConstraintsScreenLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setDemandConstraintsScreenLoader(false);
    }
  };

  const paginationChanged = async (e) => {
    if (sisterStoreArticlesDataRef.current?.length) {
      // fetch the rows displayed on search, sort or render from rowModel
      let displayRows = e.api?.rowModel?.rowsToDisplay?.map((item) =>
        cloneDeep(item.data)
      );
      let filtersApplied = e.api?.getFilterModel();
      let clonedRef = [];
      if (isEmpty(filtersApplied)) {
        if (displayRows.length === mainTableRef.current?.length) {
          clonedRef = displayRows;
        } else {
          clonedRef = mainTableRef.current; // return back to original state when a filter is cleared after a search is performed and call demand api
        }
      } else {
        clonedRef = displayRows; // when a filter is applied display the rows returned by row model that matches with the filter
      }
      let currentPage =
        demandConstraintsSisterStoreInstance.current?.api?.paginationGetCurrentPage();
      let recordsToUpdateDemand = clonedRef?.slice(
        currentPage * 10,
        parseInt(currentPage) * 10 + 10
      );
      let toCalculateDemand = recordsToUpdateDemand.filter(
        (item) => !item?.is_demand_calculated
      );
      if (toCalculateDemand?.length) {
        let updatedDemand = await fetchUpdatedDemandOnWOS(toCalculateDemand);
        if (updatedDemand?.length) {
          let updatedValues = clonedRef?.map((item) => {
            if (
              updatedDemand &&
              updatedDemand.some(
                (obj) =>
                  parseInt(obj.mapping_code) === parseInt(item.mapping_code)
              )
            ) {
              let matchingObj = updatedDemand.filter(
                (obj) =>
                  parseInt(obj.mapping_code) === parseInt(item.mapping_code)
              )[0];
              return {
                ...item,
                demand_estimated: Math.min(
                  Number(item.max_stock),
                  Math.max(
                    Number(item.min_stock),
                    parseFloat(matchingObj?.forecast_estimated)
                  )
                ),
                is_demand_calculated: true,
                forecast_estimated: parseFloat(matchingObj?.forecast_estimated),
              };
            } else {
              return item;
            }
          });
          setSisterStoreArticlesData(updatedValues);
        } else {
          setSisterStoreArticlesData([]);
          sisterStoreArticlesDataRef.current = [];
        }
      }
    }
  };

  // to check this function later on set all edit for one scenario - search - do set all and clear search - breaks
  const paginationChangedSelectedRow = async (e) => {
    if (selectedArticlesDataRef.current?.length) {
      // fetch the rows displayed on search, sort or render from rowModel
      let displayRows = e.api?.rowModel?.rowsToDisplay?.map((item) =>
        cloneDeep(item.data)
      );
      let filtersApplied = e.api?.getFilterModel();
      let clonedRef = [];
      if (isEmpty(filtersApplied)) {
        if (displayRows.length === subTableRef.current?.length) {
          clonedRef = displayRows;
        } else {
          clonedRef = subTableRef.current; // return back to original state when a filter is cleared after a search is performed and call demand api
        }
      } else {
        clonedRef = displayRows; // when a filter is applied display the rows returned by row model that matches with the filter
      }
      let currentPage =
        demandConstraintsTableInstance.current?.api?.paginationGetCurrentPage();
      let recordsToUpdateDemand = clonedRef?.slice(
        currentPage * 10,
        parseInt(currentPage) * 10 + 10
      );
      let toCalculateDemand = recordsToUpdateDemand.filter(
        (item) => !item?.is_demand_calculated && !item?.is_edited
      );
      if (toCalculateDemand?.length) {
        let updatedDemand = await fetchUpdatedDemandOnWOS(toCalculateDemand);
        if (updatedDemand?.length) {
          let updatedValues = clonedRef?.map((item) => {
            if (
              updatedDemand &&
              updatedDemand.some(
                (obj) =>
                  parseInt(obj.mapping_code) === parseInt(item.mapping_code)
              )
            ) {
              let matchingObj = updatedDemand.filter(
                (obj) =>
                  parseInt(obj.mapping_code) === parseInt(item.mapping_code)
              )[0];
              return {
                ...item,
                demand_estimated: matchingObj?.original_forecast,
                is_demand_calculated: true,
                forecast_estimated: matchingObj?.forecast_estimated,
              };
            } else {
              return item;
            }
          });
          setSelectedArticlesData(updatedValues);
        } else {
          setSelectedArticlesData([]);
          selectedArticlesDataRef.current = [];
        }
      }
    }
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"newStoreDemandConstraintsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        updateDependencyHandler={updateDependencyHandler}
        customDependencyValue={customDependencyValue}
        contained={true}
      />
      <Loader loader={props.demandConstraintsScreenLoader || editLoader}>
        {displayDemandConstraintsTables && (
          <>
            <div className={globalClasses.marginAround}>
              <div className={classes.alignButtons}>
                <Button
                  title="Add Products"
                  color="primary"
                  variant="contained"
                  id="new-products-button"
                  onClick={() => setShowAddProductsPopup(true)}
                >
                  <AddIcon />
                </Button>
              </div>

              <div className={globalClasses.marginVertical1rem}>
                <AgGridComponent
                  columns={sisterStoreArticlesColumnConfig}
                  rowdata={sisterStoreArticlesData}
                  uniqueRowId={"mapping_code"}
                  selectAllHeaderComponent={true}
                  onSelectionChanged={onSelectionChangedParentTable}
                  loadTableInstance={loadSisterStoreTableInstance}
                  onPaginationChanged={paginationChanged}
                />
              </div>
              <div className={globalClasses.centerAlign}>
                <Button
                  color="primary"
                  variant="outlined"
                  id="new-store-button"
                  disabled={!sendToSelectedProducts.length}
                  onClick={() => navigateToSelectedProducts()}
                >
                  Move To Selected Products
                </Button>
              </div>

              {showPPSizeDistribution && (
                <div
                  className={globalClasses.marginVertical1rem}
                  ref={storePriceContributionRef}
                >
                  <Typography
                    variant="h4"
                    className={globalClasses.paddingHorizontal}
                  >
                    Product Profile: IA Recommended
                  </Typography>
                  <div className={globalClasses.marginVertical1rem}>
                    <AgGridComponent
                      columns={storeSizeSplitColumnConfig}
                      rowdata={storeSizeSplitData}
                      uniqueRowId={"store_code"}
                      sizeColumnsToFitFlag
                    />
                  </div>
                </div>
              )}
              <div className={globalClasses.marginVertical1rem}>
                <div className={globalClasses.layoutAlignSpaceBetween}>
                  <Typography
                    variant="h4"
                    className={globalClasses.paddingHorizontal}
                  >
                    Selected Products
                  </Typography>
                  <Button
                    className={classes.alignButtons}
                    color="primary"
                    variant="contained"
                    id="new-store-button"
                    onClick={() => openSetAllModal()}
                    disabled={!selectedRows.length}
                  >
                    Set All
                  </Button>
                </div>
                {/* Reload on set all as we need to display all rows */}
                {!unmount && (
                  <div
                    className={globalClasses.marginVertical1rem}
                    ref={finalizedSkuRef}
                  >
                    <AgGridComponent
                      columns={selectedArticlesColumnConfig}
                      rowdata={selectedArticlesData}
                      uniqueRowId={"mapping_code"}
                      selectAllHeaderComponent={true}
                      onSelectionChanged={onSelectionChanged}
                      loadTableInstance={loadTableInstance}
                      onBlur={onBlur}
                      onPaginationChanged={paginationChangedSelectedRow}
                    />
                  </div>
                )}
              </div>

              <div className={globalClasses.centerAlign}>
                <Button
                  color="primary"
                  variant="outlined"
                  id="new-store-button"
                  disabled={!selectedRows.length}
                  onClick={() => navigateToRemoveProducts()}
                >
                  Remove Products
                </Button>
              </div>

              <div className={globalClasses.marginVertical1rem}>
                <div className={globalClasses.centerAlign}>
                  <Button
                    className={globalClasses.marginLeft1rem}
                    color="primary"
                    variant="contained"
                    id="new-store-button"
                    onClick={saveNewStore}
                    disabled={!selectedArticlesData.length}
                  >
                    Proceed
                  </Button>
                </div>
              </div>
              {openDialogForSetAll && openPopUpModal()}
              {showAddProductsPopup && (
                <AddProductsPopup
                  closeAddProductsPopup={closeAddProductsPopup}
                  displaySnackMessages={props.displaySnackMessages}
                  newSelectedRecords={newSelectedRecords}
                  screenName={props.screenName}
                  finalStoreDetailsStateValues={
                    props.finalStoreDetailsStateValues
                  }
                />
              )}
            </div>
          </>
        )}
      </Loader>
      <div className={globalClasses.marginVertical1rem}>
        <div className={globalClasses.centerAlign}>
          <Button
            color="primary"
            variant="outlined"
            id="new-store-button"
            onClick={() => setShowGoBackDialog(true)}
          >
            Back
          </Button>
        </div>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        subHeading={GO_BACK_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            props.goBackToStep2();
            setShowGoBackDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowGoBackDialog(false),
        }}
        variant="error"
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    demandConstraintsScreenLoader:
      inventorysmartReducer.inventorySmartNewStoreDemandConstraintsService
        .demandConstraintsScreenLoader,
    finalStoreDetailsStateValues:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .finalStoreDetailsStateValues,
    demandConstraintsFilterConfig:
      inventorysmartReducer.inventorySmartNewStoreDemandConstraintsService
        .demandConstraintsFilterConfig,
    savedFilterSelection: filterReducer.savedFilterSelection,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "newStoreDemandConstraintsFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    demandConstraintsTableData:
      inventorysmartReducer.inventorySmartNewStoreDemandConstraintsService
        .demandConstraintsTableData,
    editNewStoreData:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .editNewStoreData,
    editDemandConstraints:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .editDemandConstraints,
    sisterStoreHierarchyKey:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.sister_store_mapping_hierarchy,
    subDemandConstraintsTableData:
      inventorysmartReducer.inventorySmartNewStoreDemandConstraintsService
        .subDemandConstraintsTableData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDemandConstraintsScreenLoader: (body) =>
      dispatch(setDemandConstraintsScreenLoader(body)),
    setDemandAndConstraintsTableData: (body) =>
      dispatch(setDemandAndConstraintsTableData(body)),
    fetchDemandAndConstraintsTableData: (body) =>
      dispatch(fetchDemandAndConstraintsTableData(body)),
    setDemandConstraintsFilterConfiguration: (body) =>
      dispatch(setDemandConstraintsFilterConfiguration(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    clearDemandConstraintsStates: (body) =>
      dispatch(clearDemandConstraintsStates(body)),
    getStoreSizeContributionData: (body) =>
      dispatch(getStoreSizeContributionData(body)),
    saveNewStoreDetails: (body) => dispatch(saveNewStoreDetails(body)),
    editDemandAndConstraints: (body) =>
      dispatch(editDemandAndConstraints(body)),
    updateNewStoreDetails: (body) => dispatch(updateNewStoreDetails(body)),
    clearEditNewStoreData: (body) => dispatch(clearEditNewStoreData(body)),
    setEditDemandConstraints: (body) =>
      dispatch(setEditDemandConstraints(body)),
    fetchUpdatedDemandAndConstraints: (body) =>
      dispatch(fetchUpdatedDemandAndConstraints(body)),
    setSubDemandAndConstraintsTableData: (body) =>
      dispatch(setSubDemandAndConstraintsTableData(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DemandConstraints);
