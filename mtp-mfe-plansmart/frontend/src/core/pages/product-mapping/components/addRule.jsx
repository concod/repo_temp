import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "impact-ui";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import AgGridTable from "core/Utils/agGrid";
import { useHistory, useLocation } from "react-router-dom";
import { getColumnsAg } from "core/actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import { Container } from "@mui/material";
import { isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { CUSTOM_FILTER } from "./formConstants";
import {
  fetchAvailableRCL,
  fetchRCLFilters,
  saveNewRule,
} from "../services-product-mapping/productMappingService";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  isFilterAccessRestricted,
  getFilterDimensions
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";

const AddRule = (props) => {
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loader, showLoader] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState({});
  const [selectionDepedency, setSelectionDepedency] = useState([]);
  const history = useHistory();
  const globalClasses = globalStyles();
  const tableInstance = useRef();
  const dispatch = useDispatch();
  const { createRuleFilterConfiguration } = useSelector(
    (store) => store.filterReducer.filterDashboardConfiguration
  );
  const [disableActionButtons, setDisableActionButtons] = useState(false);

  useEffect(() => {
    getInitialData();
    return () => {
      showLoader(false);
    }
  }, []);

  /**
   * @function
   * @description Fetch column configuration and rowData for Add Rule Screen
   */
  const getInitialData = async () => {
    showLoader(true);
    try {
      let cols = await getColumnsAg("table_name=rcl_master_info")();
      cols.forEach((column, index) => {
        if (column.column_name === "action") {
          column.onClick = handleSelection;
          column.cellRenderer = (params, extraProps) => {
            return (
              <CellRenderer
                cellData={params}
                column={column}
                extraProps={extraProps}
                actions={null}
              ></CellRenderer>
            );
          };
        }

        if (column.column_name === "selected_level") {
          column.type = "list";
        }
      });
      cols = agGridColumnFormatter(cols);
      const rows = await fetchAvailableRCL(101);
      const modifiedRows = rows.data.data.map((row) => {
        return {
          ...row,
          action: "Add Rule",
        };
      });
      setRowData(modifiedRows);
      setColumns(cols);
      showLoader(false);
    } catch (error) {
      showLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @function
   * @description Fetch all the filter data from different dimansion
   * @param {Number} rcl_code
   */
  const fetchFilter = async (rcl_code) => {
    try {
      showLoader(true);
      if (isEmpty(createRuleFilterConfiguration)) {
        let storeResp = await fetchFilterFieldValues(
          "New Rule Creation PSM",
          []
        );
        let prodResp = await fetchRCLFilters(rcl_code);
        let prodFilters = prodResp.data.data.map((prodObj) => {
          let updatedFilter;
          prodObj.filter_keyword = prodObj.column_name;
          storeResp = storeResp.filter((storeObj) => {
            if (storeObj.column_name === prodObj.column_name) {
              updatedFilter = { ...prodObj, ...storeObj };
              return false;
            }
            return true;
          });
          if (!updatedFilter) {
            return prodObj;
          } else {
            return updatedFilter;
          }
        });

        const allFilters = [...CUSTOM_FILTER, ...prodFilters, ...storeResp];
        const filterConfigData = [
          {
            filterDashboardData: allFilters,
            expectedFilterDimensions: getFilterDimensions(allFilters),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "createRuleFilterConfiguration",
          filterConfigData,
          "ADD RULES",
          []
        );
        dispatch(setFilterConfiguration(filterConfig));
        showLoader(false);
      }
    } catch (error) {
      showLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @function
   * @description Show filters and update local state with selected rule_code
   * @param {Object} data
   */
  const handleSelection = (data) => {
    setSelectedRow(data.cellData.data.rcl_code);
    fetchFilter(data.cellData.data.rcl_code);
    setShowFilters(true);
    showLoader(false);
  };

  /**
   * @function
   * @description Update local dependency state on allDependencies change
   * @param {Object} _dependency
   * @param {Object} _dimension
   * @param {Object} _filters
   * @param {Object} _filterList
   * @param {Object} _selectionDependency
   * @param {Object} allDependencies
   */
  const updateDependencyHandler = async (
    _dependency,
    _dimension,
    _filters,
    _filterList,
    _selectionDependency,
    allDependencies
  ) => {
    updateFilterBasedAccess(allDependencies, true);
    setSelectionDepedency(allDependencies);
  };

  const updateFilterBasedAccess = (
    dependencyList = [],
    filterCheck = false
  ) => {
    const filterBasedAccessList = fetchDynamicConfigFromTenantReducer(
      "core",
      "mapping_no_edit_access"
    );
    if (filterBasedAccessList) {
      const isFilterBasedAccessRestricted = filterCheck
        ? isFilterAccessRestricted(filterBasedAccessList, dependencyList)
        : true;
      setDisableActionButtons(isFilterBasedAccessRestricted);
    }
  };

  /**
   * @function
   * @description Validate users changes and apply changes if valid
   */
  const validateAndSave = async (review = false) => {
    let isValid = checkForMandatoryFields();
    if (!isValid) {
      displaySnackMessages(
        "Please enter/select mandatory field values",
        "error"
      );
    } else {
      applyChanges(review);
    }
  };

  /**
   * @function
   * @description Make API call for Rule Creation and handle success and failure scenarios
   */
  const applyChanges = async (review) => {
    showLoader(true);
    try {
      const productPayload = [],
        storePayload = [],
        custom = [];
      const updatePayload = (dimension, objectToUpdated) => {
        switch (dimension) {
          case "product":
            productPayload.push(objectToUpdated);
            break;
          case "store":
            storePayload.push(objectToUpdated);
            break;
          case "custom":
            custom.push(objectToUpdated.values);
            break;
        }
      };
      selectionDepedency.forEach((dependency) => {
        let formattedObject = { ...dependency };
        if (dependency.extra?.attributes?.length) {
          dependency.extra.attributes.forEach((attr) => {
            formattedObject = {
              ...formattedObject,
              ...attr,
              filter_id: attr.attribute_name,
            };
            updatePayload(attr.dimension, formattedObject);
          });
        } else {
          updatePayload(dependency.dimension, formattedObject);
        }
      });

      const payloadBody = {
        product_filters: productPayload,
        store_filters: storePayload,
        validity: custom,
        rcl_code: selectedRow,
        meta: {
          search: [],
          range: [],
          sort: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
        review: review,
      };
      const resp = await saveNewRule(payloadBody);
      let successMessage =
        "Rule creation will take time, you'll be notified shortly.";
      if (review) {
        successMessage =
          "Preparing rules for review, you'll be notified shortly.";
      }
      showLoader(false);
      displaySnackMessages(
        resp.data.message.length ? resp.data.message : successMessage,
        "success",
        () => {
          history.goBack();
        }
      );
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      showLoader(false);
    }
  };

  /**
   * @function
   * @description Valdate values in dependency against mandatory filters
   * @returns {Boolean}
   */
  const checkForMandatoryFields = () => {
    let filterDashboardData =
      createRuleFilterConfiguration?.filterConfig[0]?.filterDashboardData;
    let mandatoryFilters = filterDashboardData.filter((item) => {
      return item.is_mandatory;
    });
    selectionDepedency.forEach((dependency) => {
      mandatoryFilters = mandatoryFilters.filter((element) => {
        return !(
          element.dimension === dependency.dimension &&
          element.filter_keyword === dependency.filter_id &&
          dependency.values.length &&
          dependency.values.every((item) => item)
        );
      });
    });

    return !mandatoryFilters.length;
  };

  /**
   * @function
   * @description dispatch alerts whenever required
   * @param {String} message
   * @param {String} variance
   */
  const displaySnackMessages = (message, variance, onClose) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
          ...(onClose && { onClose: onClose, autoHideDuration: 3000 }),
        },
      })
    );
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Configuration",
            id: 1,
          },
        ]}
      ></HeaderBreadCrumbs>
      <Container maxWidth={false}>
        {!showFilters ? (
          <>
            <Loader loader={loader}>
              {columns.length > 0 && (
                <AgGridTable
                  rowdata={rowData}
                  columns={columns}
                  selectAllHeaderComponent={false}
                  // hideSelectAllRecords={true}
                  sizeColumnsToFitFlag
                  onGridChanged
                  onRowSelected
                  loadTableInstance={(gridInstance) => {
                    tableInstance.current = gridInstance;
                  }}
                  cacheBlockSize={10}
                  uniqueRowId={"rcl_code"}
                />
              )}
            </Loader>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginVertical1rem}`}
            >
              <Button
                variant="primary"
                id="navigateBack"
                onClick={() => {
                  history.goBack();
                }}
              >
                Back
              </Button>
            </div>
          </>
        ) : (
          <>
            <CoreComponentScreen
              hideNoDataFound
              showFilterDashboard={true}
              filterConfigKey={"createRuleFilterConfiguration"}
              disableFilterModal={true} // props used to render flat structure of filter hierarchy directly on screen
              removeFilterAccordian={true}
              hideFilterActions={true}
              hideSaveFilterSection={true}
              updateDependencyHandler={updateDependencyHandler}
              preventFilterPreselection={true}
            />
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginVertical1rem}`}
            >
              <Button
                variant="primary"
                id="navigateBack"
                onClick={() => {
                  showLoader(false);
                  history.goBack();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                id="reviewAndSaveRules"
                disabled={loader || disableActionButtons}
                onClick={() => validateAndSave(true)}
              >
                Review before Saving
              </Button>
              <Button
                variant="primary"
                id="saveRules"
                disabled={loader || disableActionButtons}
                onClick={() => validateAndSave()}
              >
                Save
              </Button>
            </div>
          </>
        )}
      </Container>
    </>
  );
};

export default AddRule;
