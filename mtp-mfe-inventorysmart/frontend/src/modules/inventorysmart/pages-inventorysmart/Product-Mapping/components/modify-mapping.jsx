import React, { useEffect, useState, useRef, useMemo } from "react";
import Form from "core/Utils/form/index";
import { TIME_PERIOD_RANGE_PICKER, SET_ALL_FORM } from "./formConstants";
import AddIcon from "@mui/icons-material/Add";
import { Divider, Grid } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Prompt , Modal, Panel} from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import {
  modifyInlineEdits,
  viewStoreTierList,
  modifySetAll,
} from "../services-product-mapping/productMappingService";
import globalStyles from "core/Styles/globalStyles";
import { useDispatch, useSelector } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import { formatMomentDate } from "core/Utils/functions/utils";
import { dateValidationMessage } from "core/Utils/functions/helpers/validation-helpers";
import { hasRangeOverlap } from "./common-functions";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import { isFilterAccessRestricted } from "core/commonComponents/coreComponentScreen/utils";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";
import { getPSMItineraryConfig } from "core/actions/tenantConfigActions";

const useStyles = makeStyles({
  formRow: {
    alignItems: "end",
    marginBottom: "0.5rem",
  },
  timelineRow: {
    backgroundColor: "#f5f6fa",
    padding: "8px 8px 8px 24px",
    borderRadius: "8px",
    gap: "8px",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
  },
  divider: {
    margin: "24px 0",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  requiredStar: {
    color: "red",
    marginLeft: "2px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
  },
  timelineRowCenter: {
    alignItems: "center",
  },
  timelineLabel: {
    fontWeight: 500,
    width: "72px",
    flexShrink: 0,
  },
  deleteIcon: {
    color: "#1F2B4D",
  },
});

const ModifyMappings = (props) => {
  const [filtersLoaded,setFiltersLoaded] = useState(false);
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedProductData, setSelectedProductData] = useState([]);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [showSetAll, setShowSetAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({});
  const [setAllCols, setSetAllCols] = useState({});
  const [sellingTimeline, setSellingTimeline] = useState(null);
  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(
    false
  );
  const [setAllPopUpFields, setsetAllPopUpFields] = useState([]);
  const [modifyPeriodSelectedIds, setModifyPeriodSelectedIds] = useState([]);
  const [setAllSelectedIds, setSetAllSelectedIds] = useState([]);
  const [setAllSellingTimeline, setSetAllSellingTimeline] = useState(null);
  const [setAllTimelineFields, setSetAllTimelineFields] = useState([]);
  const [setAllTimelineData, setSetAllTimelineData] = useState({});
  const [isUnmapClicked, setIsUnmapClicked] = useState(false);
  const [isFilterHidden, setIsFilterHidden] = useState(true);
  const [confirmUnmap, setConfirmUnmap] = useState(false);
  const [metaPayload, setMetaPayload] = useState({});
  const [psmItineraryConfig, setPsmItineraryConfig] = useState({});
  const isEditActionRestricted = useRef(false);
  const modifyTableRef = useRef();
  const dependencyRef = useRef();
  const editedTimePeriodRef = useRef({});
  const editedSellingTimelineRef = useRef({});
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dispatch = useDispatch();
  const enableSellingTimeline = useSelector(
    (state) => state.inventorysmartReducer?.inventorySmartCommonService?.productStoreMappingConfig?.enableSellingTimeline
  );

  const modifyPeriodFormData = useMemo(() => {
    const accessor =
      setAllCols?.accessor?.replace("_", "") || "set_all_style_color_id";
    return {
      [accessor]: modifyPeriodSelectedIds,
      ...(enableSellingTimeline && sellingTimeline
        ? { selling_timeline: sellingTimeline }
        : {}),
    };
  }, [
    setAllCols.accessor,
    modifyPeriodSelectedIds,
    enableSellingTimeline,
    sellingTimeline,
  ]);

  useEffect(() => {
    getInitialData();
    // Fetch PSM itinerary configuration
    getPSMItineraryConfig().then(config => {
      setPsmItineraryConfig(config || {});
    }).catch(error => {
      console.error('Error fetching PSM Itinerary Config:', error);
    });
    let invScreenConfig = JSON.parse(
      localStorage.getItem("inventorysmartScreenConfig")
    );
    if (
      isEmpty(
        invScreenConfig?.inventorysmart_configuration?.drillDown?.hiddenFilter
      )
    ) {
      setIsFilterHidden(false);
      loadFilters();
    } else {
      dependencyRef.current = props.dependencyRef.current;
    }
    onFilter();

    // Cleanup function
    return () => {
      // Cleasnup for local states and references
      modifyTableRef.current = null;
      dependencyRef.current = null;
      resetEdits();
    };
  }, []);

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  // Helper function to check if itinerary should be used
  const shouldUseItinerary = () => {
    // Config is an array, need to access the first item's attribute_value
    const useItineraryValue = psmItineraryConfig?.[0]?.attribute_value?.use_itinerary;
    return useItineraryValue === true;
  };

  // Helper function to get itinerary ID from row data
  const getItineraryId = (row) => {
    return row?.itinerary_id || null;
  };

  // Helper function to transform psa_names to psa_itinerary_pairs for set-all
  const transformToItineraryPairs = (psaNames, selectedRowsData) => {
    if (!shouldUseItinerary() || !psaNames) {
      return psaNames; // Return original for non-Starboard or when null
    }
    
    return selectedRowsData.map(row => ({
      psa_name: row.psa_name,
      itinerary_id: getItineraryId(row)
    }));
  };

  // Helper function to add itinerary_id to rules_updated_list for inline edits
  const addItineraryToRulesList = (rulesList, selectedRowsData) => {
    if (!shouldUseItinerary()) {
      return rulesList;
    }
    
    const allGridData = [];
    if (modifyTableRef.current?.api) {
      modifyTableRef.current.api.forEachNode((node) => {
        allGridData.push(node.data);
      });
    }
    
    return rulesList.map(rule => {
      const rowData = allGridData.find(row => row.psa_name === rule.psa_name);
      return {
        ...rule,
        itinerary_id: getItineraryId(rowData)
      };
    });
  };

  /**
   * @function
   * @description Load excpetion filters using filter name
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping modify rules",
      []
    );
    if (isEmpty(props.psModifyMappingRules)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: "Inventorysmart Configurations",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "psModifyMappingRules",
        filterConfigData,
        "Inventorysmart Configurations"
      );
      dispatch(setFilterConfiguration(filterConfig));
      setFiltersLoaded(true);
    }
  };

  const getInitialData = async () => {
    let agGridcols = await getColumnsAg(
      `table_name=ps_mapping_modify_rules_map`
    )();
    let setAllColumns = await getColumnsAg(
      `table_name=ps_mapping_set_all_fields`
    )();
    prepareSetAllConfig(setAllColumns);
    agGridcols = agGridcols.map((column) => {
      if (column.type === "edit_icon") {
        column.cellRenderer = (params, extraProps) => {
          return (
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.h_100}`}
            >
              <Button
                variant="tertiary"
                id={`modify-time-period-${params.data.psa_name}`}
                size="medium"
                onClick={() => onEdit(params.data.psa_name)}
                disabled={isEditActionRestricted.current}
              >
                Modify Time Period
              </Button>
            </div>
          );
        };
      }
      return column;
    });
    setColumns(agGridcols);
  };

  const prepareSetAllConfig = (configuration) => {
    let newConfg = {};
    const accessorList = [];
    if (!props.isSelectAll) {
      configuration.forEach((config, index) => {
        accessorList.push(config.column_name);
        if (!index) {
          newConfg = { ...config };
        }
      });
      const newAccessor = accessorList.join("~");
      const selectedData = props.selectedProducts.map((data) => {
        const newCol = accessorList.map((col) => data[col]).join("~");
        return {
          ...data,
          accessor: newAccessor,
          [newAccessor]: newCol,
        };
      });
      newConfg.accessor = newAccessor;
      newConfg.column_name = newAccessor;
      setSetAllCols(newConfg);
      setSelectedProductData(selectedData);
    }
  };

  const onFilter = async () => {
    try {
      modifyTableRef.current.api?.refreshServerSideStore({ purge: true });
      modifyTableRef.current.api?.deselectAll(true);
    } catch (error) {
      setShowLoader(false);
    }
  };

  const onFilterDashboardClick = (dependency) => {
    dependencyRef.current = dependency;
    const filterBasedAccessList = fetchDynamicConfigFromTenantReducer(
      "core",
      "mapping_no_edit_access"
    );
    isEditActionRestricted.current = isFilterAccessRestricted(
      filterBasedAccessList,
      dependency
    );
    onFilter();
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    if (
      !Boolean(dependencyRef.current) ||
      dependencyRef.current?.length === 0
    ) {
      setShowLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      const meta = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      const body = {
        filters: dependencyRef.current || [],
        ...meta,
      };
      setMetaPayload(meta);
      const resp = await viewStoreTierList(body);
      setShowLoader(false);
      const dataWithUniqueId = resp.data.data.map(row => ({
        ...row,
        unique_psa_id: `${row.psa_name}_${row.itinerary_id}`
      }));
      return {
        data: dataWithUniqueId,
        totalCount: resp.data.total,
      };
    } catch (error) {
      setShowLoader(false);
      displaySnackMessages("Something went wrong", "error");
      console.error(error);
    }
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRows(selectedRows);
  };

  const onEdit = (id) => {
    setCurrentEditId(id);
    updateFormObject(false, id);
    
    // Load selling timeline if it exists for this edit ID
    if (enableSellingTimeline && editedSellingTimelineRef.current?.[id]) {
      setSellingTimeline(editedSellingTimelineRef.current[id]);
    } else {
      setSellingTimeline(null);
    }

    const currentProduct = selectedProductData.find(
      (item) => item.psa_name === id
    );
    setModifyPeriodSelectedIds(
      currentProduct?.[setAllCols.accessor] ? [currentProduct[setAllCols.accessor]] : []
    );

    setFormKey((prev) => prev + 1);
    setIsModalOpen(true);
  };

  const updateFormObject = (addNewField = false, currentEditId) => {
    const currentDataToEdit =
      currentEditId && editedTimePeriodRef.current?.[currentEditId]
        ? cloneDeep(editedTimePeriodRef.current?.[currentEditId])
        : [];
    const newFieldSet = cloneDeep(TIME_PERIOD_RANGE_PICKER);
    if (!addNewField && currentDataToEdit.length) {
      const newFormData = {};
      const newFormFields = [];
      currentDataToEdit.forEach((data, index) => {
        newFormData[index] = {
          start_date: data[0],
          end_date: data[1],
          eligibility_timeline: [data[0], data[1]],
        };
        newFormFields.push({
          rowId: index,
          fields: newFieldSet,
        });
      });
      setFormData(newFormData);
      setFormFields(newFormFields);
    } else {
      const lastRowId = formFields.length
        ? formFields[formFields.length - 1].rowId
        : 0;
      const newRow = {
        rowId: lastRowId + 1,
        fields: newFieldSet,
      };
      setFormFields([...formFields, newRow]);
    }
  };

  const deleteFormRow = (rowId) => {
    setFormFields((prevState) =>
      prevState.filter((state) => state.rowId !== rowId)
    );
    setFormData((dataStates) => {
      let newDataObj = {};
      Object.keys(dataStates).forEach((state) => {
        if (state != rowId) {
          newDataObj[state] = dataStates[state];
        }
      });
      return newDataObj;
    });
  };

  const resetTimelines = () => {
    // Keep only the first timeline and reset it
    if (formFields.length > 0) {
      setFormFields([formFields[0]]);
      setFormData({});
    }
  };

  const addSetAllTimelineRow = () => {
    const newFieldSet = cloneDeep(TIME_PERIOD_RANGE_PICKER);
    const lastRowId = setAllTimelineFields.length
      ? setAllTimelineFields[setAllTimelineFields.length - 1].rowId
      : 0;
    setSetAllTimelineFields([
      ...setAllTimelineFields,
      { rowId: lastRowId + 1, fields: newFieldSet },
    ]);
  };

  const deleteSetAllTimelineRow = (rowId) => {
    setSetAllTimelineFields((prevState) =>
      prevState.filter((state) => state.rowId !== rowId)
    );
    setSetAllTimelineData((dataStates) => {
      const newDataObj = {};
      Object.keys(dataStates).forEach((state) => {
        if (state != rowId) {
          newDataObj[state] = dataStates[state];
        }
      });
      return newDataObj;
    });
  };

  const resetSetAllTimelines = () => {
    if (setAllTimelineFields.length > 0) {
      const firstRowId = setAllTimelineFields[0].rowId;
      setSetAllTimelineFields([setAllTimelineFields[0]]);
      setSetAllTimelineData({ [firstRowId]: {} });
    }
  };

  const handleSetAllTimelineChange = (data, id, rowId) => {
    const newFormObj = cloneDeep(setAllTimelineData);
    if (data.eligibility_timeline && Array.isArray(data.eligibility_timeline)) {
      newFormObj[rowId] = {
        ...newFormObj[rowId],
        start_date: data.eligibility_timeline[0],
        end_date: data.eligibility_timeline[1],
        eligibility_timeline: data.eligibility_timeline,
      };
    } else {
      newFormObj[rowId] = {
        ...newFormObj[rowId],
        ...data,
      };
    }
    setSetAllTimelineData(newFormObj);
  };

  const getSetAllTimelines = () => {
    let hasValidDates = true;
    const validTimeobject = Object.keys(setAllTimelineData).map((key) => {
      const startDate = formatMomentDate(moment(setAllTimelineData[key].start_date));
      const endDate = formatMomentDate(moment(setAllTimelineData[key].end_date || ""));
      if (
        Object.keys(setAllTimelineData[key]).length === 0 ||
        startDate === "Invalid Date" ||
        endDate === "Invalid Date"
      ) {
        hasValidDates = false;
        displaySnackMessages("Please select valid dates", "error");
        return [];
      }
      const validationMessage = dateValidationMessage(startDate, endDate);
      if (validationMessage.length === 0) {
        return [startDate, endDate];
      }
      hasValidDates = false;
      displaySnackMessages(validationMessage, "error");
      return [];
    });
    if (hasValidDates) {
      return validTimeobject.filter((data) => data.length);
    }
    return false;
  };

  const onSetAllPanelCancel = () => {
    setShowSetAll(false);
    setIsUnmapClicked(false);
    setSetAllSelectedIds([]);
    setSetAllSellingTimeline(null);
    setSetAllTimelineFields([]);
    setSetAllTimelineData({});
  };

  const submitSetAll = async (formattedDependency) => {
    const hasConflicts = isUnmapClicked
      ? false
      : Object.keys(formattedDependency).some((key) => {
          return hasRangeOverlap(formattedDependency[key]);
        });
    if (hasConflicts) {
      displaySnackMessages("Please resolve date conflicts.", "error");
      throw new Error("Please resolve date conflicts.");
    }
    try {
      let resp = {};
      const updatedList =
        isUnmapClicked && props.isSelectAll
          ? [
              {
                rule_code: null,
                validity: null,
              },
            ]
          : Object.keys(formattedDependency).map((key) => {
              return {
                rule_code: props.isSelectAll
                  ? null
                  : selectedProductData.filter(
                      (item) => key === item[setAllCols.accessor]
                    )[0].rule_code,
                validity: isUnmapClicked
                  ? null
                  : formatToDateString(formattedDependency[key]),
                ...(enableSellingTimeline && !isUnmapClicked
                  ? {
                      selling_start_date: setAllSellingTimeline?.[0]
                        ? formatMomentDate(setAllSellingTimeline[0])
                        : null,
                      selling_end_date: setAllSellingTimeline?.[1]
                        ? formatMomentDate(setAllSellingTimeline[1])
                        : null,
                    }
                  : {}),
              };
            });
      const basePsaNames = selectAll ? null : selectedRows.map((row) => row.psa_name);
      const payload = {
        ...(props.isSelectAll || selectAll ? props.dependency : {}),
        store_filters: !isFilterHidden
          ? { filters: dependencyRef.current, ...metaPayload }
          : { ...props.dependency.rule_filters },
        ...(shouldUseItinerary() && basePsaNames
          ? { psa_itinerary_pairs: transformToItineraryPairs(basePsaNames, selectedRows) }
          : { psa_names: basePsaNames }
        ),
        rules_updated_list: updatedList,
      };
      resp = await modifySetAll(payload);
      displaySnackMessages(
        resp.data?.message || "Applied changes successfully",
        "success"
      );
      resetEdits();
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
      throw new Error("Something went wrong");
    }
  };

  const applySetAllFromPanel = async () => {
    // Validate top dropdown selection (style color id) when applicable
    if (!props.isSelectAll && !setAllSelectedIds.length) {
      displaySnackMessages(`Please select ${setAllCols.label}`, "error");
      return;
    }

    const formattedDependency = {};

    if (isUnmapClicked) {
      // Unmap: clear validity for the selected style color ids
      setAllSelectedIds.forEach((id) => {
        formattedDependency[id] = null;
      });
      try {
        await submitSetAll(formattedDependency);
      } catch (error) {
        // error already surfaced via snack
      }
      return;
    }

    const timelines = getSetAllTimelines();
    if (timelines === false) {
      return;
    }

    const hasSellingTimeline = Boolean(
      enableSellingTimeline &&
        setAllSellingTimeline?.[0] &&
        setAllSellingTimeline?.[1]
    );

    if (!timelines.length && !hasSellingTimeline) {
      displaySnackMessages("Please add at least one timeline", "error");
      return;
    }

    if (props.isSelectAll) {
      formattedDependency.isSetAll = timelines;
    } else {
      setAllSelectedIds.forEach((id) => {
        formattedDependency[id] = timelines;
      });
    }

    try {
      await submitSetAll(formattedDependency);
    } catch (error) {
      // error already surfaced via snack
    }
  };

  const onCancel = () => {
    setIsModalOpen(false);
    setFormFields([]);
    setCurrentEditId(null);
    setFormData({});
    setModifyPeriodSelectedIds([]);
  };

  const onApplySave = () => {
    const validFormData = updateFormData();
    if (validFormData) {
      onCancel();
    }
  };

  const updateFormData = () => {
    const updatedTimePeriod = getTimePeriodData();
    if (updatedTimePeriod === false) {
      return false;
    }

    const hasConflicts = hasRangeOverlap(updatedTimePeriod);
    if (hasConflicts) {
      displaySnackMessages("Please reslove conflicting dates", "error");
      return false;
    }

    const hasSellingTimeline = Boolean(
      enableSellingTimeline && sellingTimeline?.[0] && sellingTimeline?.[1]
    );

    if (!updatedTimePeriod.length && !hasSellingTimeline) {
      displaySnackMessages("Please select valid dates", "error");
      return false;
    }
    editedTimePeriodRef.current = {
      ...editedTimePeriodRef.current,
      [currentEditId]: updatedTimePeriod,
    };

    if (enableSellingTimeline && hasSellingTimeline) {
      editedSellingTimelineRef.current = {
        ...editedSellingTimelineRef.current,
        [currentEditId]: sellingTimeline,
      };
    }

    setCurrentEditId(null);
    return true;
  };

  const getTimePeriodData = () => {
    let hasValidDates = true;    
    const validTimeobject = Object.keys(formData).map((key) => {
      let startDate = formatMomentDate(moment(formData[key].start_date));
      let endDate = formatMomentDate(moment(formData[key].end_date || ""));
      if (
        Object.keys(formData[key]).length === 1 ||
        startDate === "Invalid Date" ||
        endDate === "Invalid Date"
      ) {
        displaySnackMessages("Please select valid dates", "error");
        return [];
      }
      let validationMessage = dateValidationMessage(startDate, endDate);
      if (validationMessage.length === 0) {
        return [startDate, endDate];
      } else {
        hasValidDates = false;
        displaySnackMessages(validationMessage, "error");
        return [];
      }
    });
    if (hasValidDates) {
      return validTimeobject.filter((data) => data.length);
    }
    return false;
  };

  const handleChange = (data, id, rowId) => {
    const newFormObj = cloneDeep(formData);
    
    if (data.eligibility_timeline && Array.isArray(data.eligibility_timeline)) {
      newFormObj[rowId] = {
        ...newFormObj[rowId],
        start_date: data.eligibility_timeline[0],
        end_date: data.eligibility_timeline[1],
        eligibility_timeline: data.eligibility_timeline,
      };
    } else {
      newFormObj[rowId] = {
        ...newFormObj[rowId],
        ...data,
      };
    }
    
    setFormData(newFormObj);
  };

  const applyEdits = async () => {
    const rulesList = Object.keys(editedTimePeriodRef.current);
    
    if (!rulesList.length) {
      displaySnackMessages("No changes to save.", "warning");
      return;
    }
    try {
      const baseRulesList = rulesList.map((key) => {
        const rowSellingTimeline = editedSellingTimelineRef.current?.[key];
        return {
          psa_name: key,
          validity: formatToDateString(editedTimePeriodRef.current[key]),
          selling_start_date: rowSellingTimeline?.[0] ? formatMomentDate(rowSellingTimeline[0]) : null,
          selling_end_date: rowSellingTimeline?.[1] ? formatMomentDate(rowSellingTimeline[1]) : null,
        };
      });

      const updatedRulesList = addItineraryToRulesList(baseRulesList, selectedRows);

      const postBody = {
        ...(props.isSelectAll || selectAll ? props.dependency : {}),
        store_filters: !isFilterHidden
          ? { filters: dependencyRef.current, ...metaPayload }
          : { ...props.dependency.rule_filters },
        rule_codes: props.isSelectAll
          ? null
          : selectedProductData.map((prod) => prod.rule_code),
        rules_updated_list: updatedRulesList,
      };
      const resp = await modifyInlineEdits(postBody);
      displaySnackMessages(
        resp.data?.message || "Applied changes successfully",
        "success"
      );
      resetEdits();
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const resetEdits = () => {
    onCancel();
    setSelectedRows([]);
    setShowSetAll(false);
    setSelectAll(false);
    setSetAllSelectedIds([]);
    setSetAllSellingTimeline(null);
    setSetAllTimelineFields([]);
    setSetAllTimelineData({});
    editedTimePeriodRef.current = {};
    editedSellingTimelineRef.current = {};
    setSellingTimeline(null);
    modifyTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  const setAllChanges = async (formattedAttributes) => {
    let ruleList = [];
    if (props.isSelectAll) {
      Object.keys(formattedAttributes || {}).forEach(
        (key) =>
          key.split("_")[2] != undefined &&
          !ruleList.includes(key.split("_")[2]) &&
          ruleList.push(key.split("_")[2])
      );
    } else {
      ruleList = Object.keys(formattedAttributes).filter((attr, index) =>
        attr.includes(setAllCols.accessor.replace("_", ""))
      );
    }
    if (ruleList.length || props.isSelectAll) {
      let formattedDependency = {};
      let validDates = true;
      ruleList.forEach((key) => {
        let ruleIndex = props.isSelectAll ? key : key.split("_").slice(-1);
        if (!isUnmapClicked) {
          (props.isSelectAll ? [key] : formattedAttributes[key]).forEach(
            (rule) => {
              const parsedStartDate = moment(
                formattedAttributes[`start_date_${ruleIndex}`],
                "YYYY-MM-DD",
                true
              );
              const parsedEndDate = moment(
                formattedAttributes[`end_date_${ruleIndex}`],
                "YYYY-MM-DD",
                true
              );
              validDates = parsedStartDate.isValid() && parsedEndDate.isValid();
              if (validDates) {
                formattedDependency[rule] = [
                  ...(formattedDependency[rule]
                    ? formattedDependency[rule]
                    : []),
                  [
                    formatMomentDate(
                      moment(formattedAttributes[`start_date_${ruleIndex}`])
                    ),
                    formatMomentDate(
                      moment(formattedAttributes[`end_date_${ruleIndex}`])
                    ),
                  ],
                ];
              }
            }
          );
        } else {
          formattedAttributes[key].forEach((rule) => {
            formattedDependency[rule] = null;
          });
        }
      });

      if (!validDates) {
        displaySnackMessages("Please enter valid dates.", "error");
        throw new Error("Please enter valid dates.");
      }
      if (props.isSelectAll) {
        let newDependency = [];
        Object.keys(formattedDependency).forEach(
          (key) =>
            (newDependency = [...newDependency, ...formattedDependency[key]])
        );
        formattedDependency = { isSetAll: newDependency };
      }
      await submitSetAll(formattedDependency);
    } else {
      displaySnackMessages(`Please select ${setAllCols.label}`, "error");
      throw new Error(`Please select ${setAllCols.label}`);
    }
  };

  const formatToDateString = (timeperiods) => {
    return timeperiods?.map((subarray) =>
      subarray.map((dateObj) => formatMomentDate(moment(dateObj)))
    );
  };

  const getSetAllFormFields = (setAllFields, isUnmap = false) => {
    return [
      {
        fields: setAllFields.map((field) => {
          if (field.type === "DateTimeField") {
            field.disablePast = true;
          }
          if (field.column_name === "rulecode") {
            return {
              ...field,
              isMulti: true,
              column_name: setAllCols.column_name.replace("_", ""),
              accessor: setAllCols.accessor.replace("_", ""),
              label: setAllCols.label,
              options: selectedProductData.map((details) => ({
                label: details[setAllCols.accessor],
                value: details[setAllCols.accessor],
                id: details[setAllCols.accessor],
              })),
            };
          }
          return field;
        }),
        hideRowLabel: isUnmap,
        addRowLabel: "Add Date",
        id: setAllCols?.accessor?.replace("_", "") || "",
        rowCount: 0,
      },
    ];
  };

  const initSetAllPanelState = () => {
    setSetAllSelectedIds([]);
    setSetAllSellingTimeline(null);
    setSetAllTimelineData({});
    setSetAllTimelineFields([
      { rowId: 0, fields: cloneDeep(TIME_PERIOD_RANGE_PICKER) },
    ]);
  };

  const onSetAllBtnClick = (isUnmap = false) => {
    setIsUnmapClicked(false);
    initSetAllPanelState();
    if (isUnmap || props.isSelectAll) {
      if (props.isSelectAll && !isUnmap) {
        setsetAllPopUpFields(
          getSetAllFormFields(
            cloneDeep(SET_ALL_FORM).filter((col) =>
              ["start_date", "end_date"].includes(col.column_name)
            ),
            true
          )
        );
        setShowSetAll(true);
      } else if (!props.isSelectAll && isUnmap) {
        setIsUnmapClicked(true);
        setsetAllPopUpFields(
          getSetAllFormFields(
            cloneDeep(SET_ALL_FORM).filter(
              (col) => !["start_date", "end_date"].includes(col.column_name)
            ),
            true
          )
        );
        setShowSetAll(true);
      } else {
        setIsUnmapClicked(true);
        setConfirmUnmap(true);
      }
    } else {
      setsetAllPopUpFields(getSetAllFormFields(cloneDeep(SET_ALL_FORM)));
      setShowSetAll(true);
    }
  };

  const getTopRightOptions = () => {
    const options = [];
    if(selectedRows?.length > 0 ){
      options.push(
        <Button
          variant="tertiary"
          id="modifySetAll"
          onClick={() => onSetAllBtnClick(true)}
          disabled={
             isEditActionRestricted.current
          }
        >
          Unmap Set All
        </Button>
      );
      options.push(
        <Button
          variant="tertiary"
          id="modifySetAll"
          onClick={() => onSetAllBtnClick()}
          disabled={
             isEditActionRestricted.current
          }
          className={`${globalClasses.marginLeft1rem}`}
        >
          Set All
        </Button>
      );
    }
    
    return options;
  }

  const renderContent = () => {
        return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
        {!isFilterHidden && filtersLoaded && (
          <CoreComponentScreen
            IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
            showFilterDashboard={true}
            filterConfigKey={"psModifyMappingRules"}
            onApplyFilter={onFilterDashboardClick}
            hideNoDataFound={true}
          />
        )}
        <Loader loader={showLoader || columns.length === 0}>
          <AgGridTable
            columns={columns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            loadTableInstance={(instance) => {
              modifyTableRef.current = instance;
            }}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={"unique_psa_id"}
            onSelectionChanged={onSelectionChanged}
            disableSelectionOnSelectAll={true}
            topRightOptions = {getTopRightOptions()}
          />
        </Loader>
            <Grid
              className={`${globalClasses.bottomButtonsContainer} ${globalClasses.layoutAlignEnd}`}
              gap={2}
            >
          <Button
            variant="secondary"
            id="navigateBack"
            onClick={() => props.closeModify()}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            id="applyEdits"
            onClick={() => {
              applyEdits();
            }}
            disabled={showLoader}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            id="cancelEdit"
            onClick={() => {
              setShowConfirmationDialogue(true);
            }}
            disabled={
              !Boolean(Object.keys(editedTimePeriodRef.current)?.length) ||
              showLoader
            }
          >
            Cancel
          </Button>
            </Grid>
            <Panel
              title={"Modify Time Period"}
              size="large"
              anchor="right"
              width={600}
              onClose={() => onCancel()}
              aria-labelledby="customized-dialog-title"
              open={isModalOpen}
              primaryButtonLabel="Apply"
              secondaryButtonLabel="Cancel"
              onPrimaryButtonClick={() => onApplySave()}
              onSecondaryButtonClick={() => onCancel()}
              primaryButtonProps={{
                disabled: (() => {
                  const hasEligibility = !isEmpty(formData);
                  const hasSellingTimeline = Boolean(
                    enableSellingTimeline &&
                      sellingTimeline?.[0] &&
                      sellingTimeline?.[1]
                  );
                  return enableSellingTimeline
                    ? !(hasEligibility || hasSellingTimeline)
                    : !hasEligibility;
                })(),
              }}
            >
              {(!props.isSelectAll || enableSellingTimeline) && <><Form
                key={formKey}
                fields={[
                  ...(!props.isSelectAll
                    ? [
                      {
                        type: "list",
                        field_type: "list",
                        isMulti: true,
                        accessor: setAllCols?.accessor?.replace("_", "") || "set_all_style_color_id",
                        label: setAllCols?.label || "Style Color ID",
                        column_name: setAllCols?.column_name?.replace("_", "") || "stylecolorid",
                        options: selectedProductData.map((details) => ({
                          label: details[setAllCols.accessor],
                          value: details[setAllCols.accessor],
                          id: details[setAllCols.accessor],
                        })),
                      },
                    ]
                    : []),
                  ...(enableSellingTimeline
                    ? [
                      {
                        type: "rangePicker",
                        field_type: "rangePicker",
                        accessor: "selling_timeline",
                        label: "Selling Timeline",
                        column_name: "selling_timeline",
                      },
                    ]
                    : []),
                ]}
                updateDefaultValue={true}
                handleChange={(change, id) => {
                  const accessor =
                    setAllCols?.accessor?.replace("_", "") ||
                    "set_all_style_color_id";
                  if (id === accessor) {
                    setModifyPeriodSelectedIds(change[id] || []);
                  } else if (id === "selling_timeline") {
                    setSellingTimeline(change[id]);
                  }
                }}
                defaultValues={modifyPeriodFormData}
                formDataFromParent={modifyPeriodFormData}
                layout={"vertical"}
                maxFieldsInRow={enableSellingTimeline && !props.isSelectAll ? 2 : 1}
                addOptionSet={true}
              />
                <Divider className={classes.divider} />
              </>
              }
              <div className={classes.sectionHeader}>
                <span className={classes.sectionTitle}>Eligibility Period{!enableSellingTimeline&&<span className={classes.requiredStar}>*</span>}</span>
                <div className={classes.headerActions}>
                  <Button
                      variant="tertiary"
                      id={`reset`}
                      onClick={() => resetTimelines()}
                    >Reset</Button>
                    <Button
                      variant="secondary"
                      id={`add`}
                      onClick={() => updateFormObject(true)}
                    >Add Timeline</Button>
                </div>
              </div>
              {formFields.map((fieldData, index) => {
                return (
                  <div
                  className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.formRow} ${classes.timelineRow} ${classes.timelineRowCenter}`}
                  key = {index}
                >
                  <span className={classes.timelineLabel}>
                    Timeline {index + 1}
                  </span>
                  <Form
                    handleChange={(change, id) =>
                      handleChange(change, id, fieldData.rowId)
                    }
                    fields={fieldData.fields}
                    updateDefaultValue={false}
                    defaultValues={formData[fieldData.rowId] || {}}
                    layout={"vertical"}
                    maxFieldsInRow={1}
                    addOptionSet={true}
                  ></Form>
                  {index > 0 && (
                    <Button
                      variant="tertiary"
                      id={`remove-${fieldData.rowId}`}
                      icon={<DeleteIcon className={classes.deleteIcon}/>}
                      onClick={() => {
                        deleteFormRow(fieldData.rowId);
                      }}
                    />
                  )}
                </div>
              );
              })}
            </Panel>
            {showSetAll && (
              <Panel
                title={"Set All"}
                size="large"
                anchor="right"
                width={600}
                onClose={() => onSetAllPanelCancel()}
                aria-labelledby="set-all-panel-title"
                open={showSetAll}
                primaryButtonLabel="Apply and Save"
                secondaryButtonLabel="Cancel"
                onPrimaryButtonClick={() => applySetAllFromPanel()}
                onSecondaryButtonClick={() => onSetAllPanelCancel()}
                primaryButtonProps={{
                  disabled: isUnmapClicked
                    ? !setAllSelectedIds.length
                    : (() => {
                        const hasEligibility = Object.values(
                          setAllTimelineData
                        ).some(
                          (row) =>
                            row?.eligibility_timeline?.[0] &&
                            row?.eligibility_timeline?.[1]
                        );
                        const hasSellingTimeline = Boolean(
                          enableSellingTimeline &&
                            setAllSellingTimeline?.[0] &&
                            setAllSellingTimeline?.[1]
                        );
                        return enableSellingTimeline
                          ? !(hasEligibility || hasSellingTimeline)
                          : !hasEligibility;
                      })(),
                }}
              >
                {!props.isSelectAll && (
                  <Form
                    fields={[
                      {
                        type: "list",
                        field_type: "list",
                        isMulti: true,
                        is_required: true,
                        accessor: setAllCols?.accessor?.replace("_", "") || "set_all_style_color_id",
                        label: setAllCols?.label || "Style Color ID",
                        column_name: setAllCols?.column_name?.replace("_", "") || "stylecolorid",
                        options: selectedProductData.map((details) => ({
                          label: details[setAllCols.accessor],
                          value: details[setAllCols.accessor],
                          id: details[setAllCols.accessor],
                        })),
                      },
                      ...(enableSellingTimeline && !isUnmapClicked
                        ? [
                            {
                              type: "rangePicker",
                              field_type: "rangePicker",
                              accessor: "selling_timeline",
                              label: "Selling Timeline",
                              column_name: "selling_timeline",
                            },
                          ]
                        : []),
                    ]}
                    updateDefaultValue={false}
                    defaultValues={{
                      [setAllCols?.accessor?.replace("_", "") || "set_all_style_color_id"]: setAllSelectedIds,
                      ...(enableSellingTimeline && !isUnmapClicked && setAllSellingTimeline
                        ? { selling_timeline: setAllSellingTimeline }
                        : {}),
                    }}
                    handleChange={(change, id) => {
                      const accessor =
                        setAllCols?.accessor?.replace("_", "") ||
                        "set_all_style_color_id";
                      if (id === accessor) {
                        setSetAllSelectedIds(change[id] || []);
                      } else if (id === "selling_timeline") {
                        setSetAllSellingTimeline(change[id]);
                      }
                    }}
                    layout={"vertical"}
                    maxFieldsInRow={enableSellingTimeline ? 2 : 1}
                    addOptionSet={true}
                  />
                )}
                {!isUnmapClicked && (
                  <>
                    <Divider className={classes.divider} />
                    <div className={classes.sectionHeader}>
                      <span className={classes.sectionTitle}>Eligibility Period{!enableSellingTimeline && <span className={classes.requiredStar}>*</span>}</span>
                      <div className={classes.headerActions}>
                        <Button
                          variant="tertiary"
                          id={`set-all-reset`}
                          onClick={() => resetSetAllTimelines()}
                        >Reset</Button>
                        <Button
                          variant="secondary"
                          id={`set-all-add`}
                          onClick={() => addSetAllTimelineRow()}
                        >Add Timeline</Button>
                      </div>
                    </div>
                    {setAllTimelineFields.map((fieldData, index) => {
                      return (
                        <div
                          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.formRow} ${classes.timelineRow} ${classes.timelineRowCenter}`}
                          key={index}
                        >
                          <span className={classes.timelineLabel}>
                            Timeline {index + 1}
                          </span>
                          <Form
                            handleChange={(change, id) =>
                              handleSetAllTimelineChange(change, id, fieldData.rowId)
                            }
                            fields={fieldData.fields}
                            updateDefaultValue={false}
                            defaultValues={setAllTimelineData[fieldData.rowId] || {}}
                            layout={"vertical"}
                            maxFieldsInRow={1}
                            addOptionSet={true}
                          ></Form>
                          {index > 0 && (
                            <Button
                              variant="tertiary"
                              id={`set-all-remove-${fieldData.rowId}`}
                              icon={<DeleteIcon className={classes.deleteIcon}/>}
                              onClick={() => {
                                deleteSetAllTimelineRow(fieldData.rowId);
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </Panel>
        )}
        {showConfirmationDialogue && (
          <Prompt
            isOpen={showConfirmationDialogue}
            title="Discard changes"
            onPrimaryButtonClick={
              () => {
                resetEdits();
                setShowConfirmationDialogue(false);
              }
               }
            onSecondaryButtonClick={
              () => setShowConfirmationDialogue(false)
               }
            primaryButtonLabel="Yes"
            secondaryButtonLabel="No"
            variant="info"
          >
            Are you sure you want to discard the changes?
            </Prompt>
        )}
        {confirmUnmap && (
          <Prompt
            isOpen={confirmUnmap}
            title="Unmap Selected SKU's"
            onPrimaryButtonClick={
              () => {
                setConfirmUnmap(false);
                setAllChanges();
                resetEdits();
              }
               }
            onSecondaryButtonClick={
              () => {
                setConfirmUnmap(false);
                setIsUnmapClicked(false);
              }
               }
            primaryButtonLabel="Yes"
            secondaryButtonLabel="No"
            variant="info"
          >
            Are you sure you want to unmap selected SKU's?
          </Prompt>
        )}
      </div>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
};

export default ModifyMappings;
