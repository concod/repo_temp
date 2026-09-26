import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import colours from "Styles/colours";

import globalStyles from "Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getCombinedCrossDimensionFiltersData } from "actions/filterAction";
import { addSnack } from "actions/snackbarActions";
import { getColumnsAg } from "actions/tableColumnActions";
import { Prompt } from "impact-ui";
import {
  common,
  ERROR_MESSAGE,
  SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
  SISTER_STORE_COLUMN_VALIDATION_MSG,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  saveNewStoreListDetails,
} from "../../services-assortsmart/New-Store/new-store-details";
import { SEASON_FILTER_FOR_STORE } from "../../constants-assortsmart/stringContants";
import { getSeasonOptions } from "../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";

import {
  fetchFilterConfig,
  fetchFilterOptions,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";

const useStyles = makeStyles(() => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  },
  timePeriodFormContainer: {
    width: "20%",
    marginRight: "1rem",
  },
}));

const SisterStoreMapping = (props) => {
  const [
    sisterStoreMappedColumnConfig,
    setSisterStoreMappedColumnConfig,
  ] = useState([]);
  const [sisterStoreMappedData, setSisterStoreMappedData] = useState([]);
  const [isDataChangedRecently, setIsDataChangedRecently] = useState(false);
  const [newSisterStoreRow, setNewSisterStore] = useState([]);
  const [counter, setCounter] = useState(0);
  const [selectedSisterStoreRows, setSelectedSisterStoreRows] = useState([]);
  const [showDeleteConfirmPopup, setShowDeleteConfirmPopup] = useState(false);
  const [enableSisterStoreView, setEnableSisterStoreView] = useState(false);
  const [timePeriodToggle, setTimePeriodToggle] = useState(true);
  const [sisterStoreTimePeriod, setSisterStoreTimePeriod] = useState({});
  const [sisterStoreDatePicker, setSisterStoreDatePicker] = useState({});

  const [sisterStoreFilterConfig, setSisterStoreFilterConfig] = useState([]);
  const [sisterStoreFilterOptions, setSisterStoreFilterOptions] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [storeGroupConfiguration, setStoreGroupConfiguration] = useState([]);
  const [storeGroupMapping, setStoreGroupMapping] = useState({
    store_groups: [],
    store_group_mapping_date: "",
  });
  const [storeGroupDisableState, setStoreGroupDisableState] = useState(true);
  const [resetClicked, setResetClicked] = useState(false);
  const [hierarchyValidationLoader, setHierarchyValidationLoader] = useState(
    false
  );
  const [
    sisterStoreTableEmptyRowIndex,
    setSisterStoreTableEmptyRowIndex,
  ] = useState([]);

  const [seasonFilterConfig, setSeasonFilterConfig] = useState(
    SEASON_FILTER_FOR_STORE
  );
  const [seasonFilterFormData, setSeasonFilterFormData] = useState({
    season: "",
  });

  const agGridInstance = useRef(null);
  const sisterStoreFilterConfigRef = useRef(null);
  const columnsToIgnoreRef = useRef([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      setHierarchyValidationLoader(true);
      try {
        let sisterStoreTableConfig = await getColumnsAg(
          "table_name=new_assort_store_select_sister"
        )();
        sisterStoreTableConfig = sisterStoreTableConfig.map((item) => {
          if (item.type === "datetime") {
            item.maxDate =
              props.finalStoreDetailsStateValues.other_attributes.store_opening_date;
            item.disabled = disableReservationDateCells;
          }
          return item;
        });
        let filterKeys = [];
        sisterStoreTableConfig.forEach((col) => {
          if (col?.extra?.ignoreFormatting) filterKeys.push(col.column_name);
        });
        columnsToIgnoreRef.current = filterKeys;
        // Dynamically setting table row keys as the hierarchy displayed varies from client to client
        let sisterStoreMappedColumns = sisterStoreTableConfig.map((col) => {
          if (col.type === "datetime") {
            return {
              [col.column_name]:
                props.finalStoreDetailsStateValues.other_attributes
                  .reservation_start_date,
            };
          } else
            return {
              [col.column_name]: "",
              [col.extra.options_column]: [],
            };
        });
        sisterStoreMappedColumns = Object.assign(
          {},
          ...sisterStoreMappedColumns
        );
        let initialSisterStoreMappedColumns = [
          {
            ...sisterStoreMappedColumns,
            key: 0,
          },
        ];
        let newSisterStoreMappedColumns = [
          {
            ...sisterStoreMappedColumns,
            key: 1,
          },
        ];
        setSisterStoreMappedData(initialSisterStoreMappedColumns);
        setNewSisterStore(newSisterStoreMappedColumns);
        setSisterStoreMappedColumnConfig(sisterStoreTableConfig);
        let response = await fetchFilterConfig(
          "Assortsmart New Store Sister Store"
        );
        setSisterStoreFilterConfig(response);
        sisterStoreFilterConfigRef.current = response;
        STORE_GROUP_MAPPING[0].options = [];
        setStoreGroupConfiguration(STORE_GROUP_MAPPING);
        let payload = {
          filters: [],
        };
        let seasonData = await props.getSeasonOptions(payload);
        const mappedSeasonData = seasonData.data.data.map((data) => ({
          value: data.season_code,
          label: data.name,
          id: data.season_code,
          season_end_date: data.season_end_date,
        }));
        seasonFilterConfig[0].options = [...mappedSeasonData];
        seasonFilterConfig[0].initialData = [...mappedSeasonData];
        setSeasonFilterConfig(seasonFilterConfig);
        setHierarchyValidationLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setHierarchyValidationLoader(false);
      }
    };
    //props.storeCodeKeyName &&
    getInitialFilterConfiguration();
  }, []);
  //props.storeCodeKeyName

  const callDropDownUpdateFunc = (columnDropDownValues, obj) => {
    let optionsKey = `${obj.column_name}_options`;
    // For signet - restrict SUB SKU DIVISION drop down options to only one value i.e the channel name from the previous screen
    if (obj.column_name === "product_channel_name") {
      columnDropDownValues[optionsKey] = obj.initialData?.length
        ? obj.initialData.filter(
            (val) =>
              val.value ===
              props.finalStoreDetailsStateValues?.form_attributes?.channel
          )
        : [];
    } else columnDropDownValues[optionsKey] = obj.initialData || [];
    return columnDropDownValues;
  };

  useEffect(() => {
    const getInitialFilterConfigurationValues = async () => {
      if (!isEmpty(sisterStoreFilterConfig)) {
        setHierarchyValidationLoader(true);
        let requiredFilterObjParams = {
          allFilters: cloneDeep(sisterStoreFilterConfig),
          rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
          screenName: props.screenName,
          tenantFilterUamConfig: props.tenantFilterUamConfig,
          enableCrossFiltersConditionally: true,
        };
        const response = await fetchFilterOptions(requiredFilterObjParams);
        // save this response in a state and use it to add a new row when the table is empty after deleting all records
        setSisterStoreFilterOptions(response);
        let columnDropDownValues = {};
        response &&
          response.forEach((obj) => {
            callDropDownUpdateFunc(columnDropDownValues, obj);
          });
        let cloneSisterStoreMappedData = cloneDeep(sisterStoreMappedData);
        cloneSisterStoreMappedData = cloneSisterStoreMappedData.map((item) => {
          return {
            ...item,
            ...columnDropDownValues,
          };
        });
        setSisterStoreMappedData(cloneSisterStoreMappedData);

        let cloneNewSisterStoreRow = cloneDeep(newSisterStoreRow);
        cloneNewSisterStoreRow = cloneNewSisterStoreRow.map((item) => {
          return {
            ...item,
            ...columnDropDownValues,
          };
        });
        setNewSisterStore(cloneNewSisterStoreRow);
        setHierarchyValidationLoader(false);
        agGridInstance.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    };
    getInitialFilterConfigurationValues();
  }, [sisterStoreFilterConfig, props.finalStoreDetailsStateValues]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedSisterStoreRows(selections);
  };

  //to be used in next sprint
  // const prepopulateStepOneValues = (objectToPopulate, flowType) => {
  //   // Pre populate all the state values present
  //   let storeAttrsTimePeriod = objectToPopulate.other_attributes;
  //   setTimePeriodToggle(false);
  //   setSisterStoreDatePicker({
  //     sisterStoreDatePicker: storeAttrsTimePeriod.sister_store_mapping_date,
  //   });
  //   let tableRowAttrs = objectToPopulate.table_row_attributes;
  //   let selectedStoreDeptMapping = [];
  //   tableRowAttrs?.forEach((obj, i) => {
  //     let updatedRowData = {};
  //     obj.forEach((item) => {
  //       if (columnsToIgnoreRef.current.includes(item.attribute_name)) {
  //         // to pre populate date field in vb (modify the condition in future if more number of such cols are added)
  //         updatedRowData[item.attribute_name] = item.values[0];
  //         flowType === "edit" && disableReservationDateCells(updatedRowData);
  //       } else
  //         updatedRowData[item.attribute_name] = mapOptionsValue(item.values);
  //     });
  //     updatedRowData = {
  //       ...sisterStoreMappedData[0],
  //       ...updatedRowData,
  //       key: i,
  //     };
  //     selectedStoreDeptMapping.push(updatedRowData);
  //   });
  //   // works but gets called twice check later to optimise
  //   setSisterStoreMappedData(selectedStoreDeptMapping);
  //   setCounter(tableRowAttrs.length - 1);
  //   // explicitly call cross filter API to fetch and update drop down options
  //   fetchCrossFilterOptions(selectedStoreDeptMapping, flowType);
  //   // call this function as we have to fetch store groups based on hierarchies pre selected in edit cond
  //   fetchStoreGroups(selectedStoreDeptMapping, storeAttrsTimePeriod);
  // };

  const addNewRow = () => {
    // throw a warning message if the latest row in table has empty values
    let latestRecordEntry =
      sisterStoreMappedData[sisterStoreMappedData.length - 1];
    // Filtering out keys that have selected value from the table
    let fieldKeys = Object.keys(latestRecordEntry).filter(
      (val) => val !== "key" && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(latestRecordEntry[key]))) {
      displaySnackMessages("Select the hierarchy and sister store", "warning");
    } else {
      let newCounter = counter + 1;
      setCounter(newCounter);

      let cloneNewSisterStoreRow = cloneDeep(newSisterStoreRow);
      cloneNewSisterStoreRow[0].key = newCounter;

      // add new row to an existing row
      let copyOfExistingMappedData = [...sisterStoreMappedData];
      let newData = [...copyOfExistingMappedData, ...cloneNewSisterStoreRow];
      setSisterStoreMappedData(newData);
      setStoreGroupDisableState(true);
    }
    enableSisterStoreView && setEnableSisterStoreView(false);
  };

  const deleteSelectedSisterRows = () => {
    if (!selectedSisterStoreRows.length) {
      displaySnackMessages("Select at least one row", "warning");
    } else setShowDeleteConfirmPopup(true);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const confirmDeleteRows = () => {
    let rowDataAfterDeleting = sisterStoreMappedData.filter(
      (item) => !selectedSisterStoreRows.some((obj) => obj.key === item.key)
    );
    if (rowDataAfterDeleting.length === 0) {
      let initialRow = setInitialEmptyTableRow();
      setSisterStoreMappedData(initialRow);
      setStoreGroupDisableState(true);
      setCounter(0);
      setCellsToBeDisabled(initialRow);
      setResetClicked(true);
      if (enableSisterStoreView || storeGroupMapping?.store_groups?.length) {
        clearSisterStoreMappings();
      }
    } else {
      let updateSisterStoreKeyOnDelete = rowDataAfterDeleting.map((item, i) => {
        return {
          ...item,
          key: i,
        };
      });
      setCounter(updateSisterStoreKeyOnDelete.length - 1);
      setSisterStoreMappedData(updateSisterStoreKeyOnDelete);
    }
    agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
  };

  const clearSisterStoreMappings = () => {
    let initialRow = setInitialEmptyTableRow();
    setSisterStoreMappedData(initialRow);
    setEnableSisterStoreView(false);
    setSisterStoreTimePeriod([]);
    setSisterStoreDatePicker([]);
    setTimePeriodToggle(true);
    setStoreGroupMapping({ ...storeGroupMapping, store_groups: [] });
    setStoreGroupDisableState(true);
    STORE_GROUP_MAPPING[0].options = [];
    setStoreGroupConfiguration(STORE_GROUP_MAPPING);
    setResetClicked(true);
    setCounter(0);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  /*
     This function is used to check if a duplicate value exists for the same kind of hierarchy combinations selected and prevent the user from selecting any such value,
     so that two diff sister store's cannot be assigned to same combination.
     Note - The hierarchy - l0, l1, l2 values is dynamic from client to client.
  */
  const onChangeSisterStoreValidation = (cellNode, colId, _p_colType, e) => {
    let arr = [];
    agGridInstance.current.api.forEachNode((item) => arr.push(item.data));
    /*
         We skip 0th row index as we don't hv to apply a check on the first row data in the table initially
         arr.length condition is used to check the validation for older rows(previously filled rows) if the number of rows in the table is more than one
      */
    if (arr?.length > 1 && colId === props.storeCodeKeyName) {
      // Same as above - throw a warning msg incase a similar sister store is selected in consecutive rows
      let val = arr
        .map((obj) => obj[props.storeCodeKeyName])
        .filter((item) => item !== "");
      let selectedStores = val.map((store) => store[0]?.value);
      // Adding validation here to not to allow the selection of same hierarchy as per previous rows
      if (selectedStores.includes(e.value)) {
        // incase a value is selected and if we select another value which is a duplicate store code reset the cell to empty
        cellNode.data[props.storeCodeKeyName] = "";
        agGridInstance.current.api.refreshCells({
          columns: [props.storeCodeKeyName],
        });
        displaySnackMessages(SISTER_STORE_COLUMN_VALIDATION_MSG, "warning");
        return false;
      } else return true;
    } else return true;
  };

  const saveStoreDetails = async () => {
    let filters = [];
    sisterStoreMappedData.forEach((row) => {
      //should be made dynamic
      if (row.l0_name) {
        filters.push({
          attribute_name: "l0_name",
          value: row.l0_name.map((data) => data.value),
          operator: "in",
        });
      }
      if (row.l1_name) {
        filters.push({
          attribute_name: "l1_name",
          value: row.l1_name.map((data) => data.value),
          operator: "in",
        });
      }
      if (row.l2_name) {
        filters.push({
          attribute_name: "l2_name",
          value: row.l2_name.map((data) => data.value),
          operator: "in",
        });
      }
      if (row.l3_name) {
        filters.push({
          attribute_name: "l3_name",
          value: row.l3_name.map((data) => data.value),
          operator: "in",
        });
      }
    });
    let payload = {
      ...props.newStoreDetailsFormValues,
      sister_store_code: sisterStoreMappedData?.[0]?.store_code?.[0]?.value,
      opening_date: moment(props.storeOpeningDate?.store_opening_date).format(
        "YYYY-MM-DD"
      ),
      sister_store_mapping_date: seasonFilterFormData.seasonEndDate,
      filters,
    };
    let response = await props.saveNewStoreListDetails(payload);
  };

  const handleChangeSeason = async (updatedFormData, filedType) => {
    if (filedType !== "season") {
      setSeasonFilterFormData(updatedFormData);
    } else {
      let currentSesasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "season_code",
            value: [updatedFormData?.season],
            operator: "=",
          },
        ],
      });
      if (currentSesasonResponse?.data?.status) {
        let seasonEndDate =
          currentSesasonResponse?.data?.data?.[0]?.season_end_date;
        updatedFormData.seasonEndDate = seasonEndDate;
      }
      setSeasonFilterFormData(updatedFormData);
    }
  };

  // to debug and check this why it is needed in vb n not in other clients (Solution working now for all clients)
  const onCellValueChanged = (params) => {
    const { column, node, data, newValue, api } = params;
    // Signet's use case - call cross filter api for product channel name (single select drop down)
    if (column.colId === "product_channel_name" && newValue?.length > 0) {
      let filterKeys = api?.gridOptionsWrapper?.gridOptions?.columnDefs.filter(
        (key) => key?.field !== "Selection" && key?.type !== "datetime"
      );
      callCrossFilterAPIOptions(data, api?.gridOptionsWrapper, filterKeys);
    }
    if (column.colDef.type === "datetime") {
      data[column.colId] = !newValue
        ? ""
        : moment(newValue).format("YYYY-MM-DD"); // add null cond check here
    }
    let cloneRefInstance = cloneDeep(sisterStoreMappedData);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.key === data.key
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setSisterStoreMappedData(cloneRefInstance);
      setIsDataChangedRecently(true);
    }
  };

  const onBlur = async (_e, data, column, isChanged, value, _initialValue) => {
    const { gridOptionsWrapper } = column;
    let arr = [];
    agGridInstance.current?.api?.forEachNode((item) => arr.push(item.data));

    // To disable fetch store groups button unless and until all values in a row are filled
    let colKeysToIgnore = ["key", ...columnsToIgnoreRef.current];
    let fieldKeys = Object.keys(data).filter(
      (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(data[key]))) {
      setStoreGroupDisableState(true);
    } else setStoreGroupDisableState(false);

    let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
      (key) => key?.field !== "Selection" && key?.type !== "datetime"
    );

    if (
      isChanged &&
      column.colId !== props.storeCodeKeyName &&
      column.type !== "datetime"
    ) {
      // Adding await so the table row data(arr) gets updated for checking product hierarchy value duplication on changing cross filters
      await callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
    }

    // Optimization API to display a warning message incase of repetitions of values
    fieldKeys = fieldKeys.filter((key) => key !== props.storeCodeKeyName);
    let emptyCond = fieldKeys.some((key) => isEmpty(data[key]));
    /* 
        Calling the API to check for duplicates when 
        - the number of rows present in the table is more than one AND
        - when all cols (fieldKeys) of the current row are filled with values AND
        - when the current col is not sister store
     */
    if (
      arr?.length > 1 &&
      !emptyCond &&
      isChanged &&
      column.colId !== props.storeCodeKeyName
    ) {
      try {
        setHierarchyValidationLoader(true);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(arr, true),
          application_code: 1,
          changed_rows: [data.key],
        };
        let apiResponse = await props.sisterStoreTableValidation(body);
        if (apiResponse.data?.message === "True") {
          data[column.colId] = "";
          agGridInstance.current.api.refreshCells({
            columns: [column.colId],
          });
          displaySnackMessages(
            SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
            "warning"
          );
          // To disable sister store cell and fetch back all options of the column for which an API is called
          callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
        }
        setHierarchyValidationLoader(false);
      } catch (e) {
        setHierarchyValidationLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }

    // reset selected sister store option n disable the fields
    if (isChanged && !value.length && column.type !== "datetime") {
      data[props.storeCodeKeyName] = "";
      agGridInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [props.storeCodeKeyName],
      });
      setCellsToBeDisabled(data, column);
    }
  };

  return (
    <Loader loader={hierarchyValidationLoader}>
      <div className={globalClasses.marginAround}>
        <div className={classes.alignButtons}>
          <Button
            title="Add New Store"
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => addNewRow()}
          >
            <AddIcon />
          </Button>
          <Button
            className={globalClasses.marginLeft1rem}
            title="Delete"
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => deleteSelectedSisterRows()}
          >
            <DeleteIcon />
          </Button>
        </div>
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={sisterStoreMappedColumnConfig}
            rowdata={sisterStoreMappedData}
            uniqueRowId={"key"}
            rowSelection={"multiple"}
            selectAllHeaderComponent
            hideHeaderCheckboxComponent
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            callBackOnChangeCustomFunction={onChangeSisterStoreValidation}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
        {sisterStoreTableEmptyRowIndex.length > 0 && (
          <Typography variant="h5" color={colours.frolyLight}>
            Note:- The following row numbers have empty values :
            {sisterStoreTableEmptyRowIndex
              .map((item) => ` Row ${item}`)
              .toString()}
          </Typography>
        )}
        {showDeleteConfirmPopup && (
          <>
            <Prompt
              isOpen={showDeleteConfirmPopup}
              title="Delete Selected Rows"
              subHeading="Are you sure you want to delete the selected rows?"
              infoList={[]}
              primaryButtonProps={{
                children: common.__ConfirmBtnText,
                onClick: () => {
                  confirmDeleteRows();
                  setShowDeleteConfirmPopup(false);
                },
              }}
              tertiaryButtonProps={{
                children: common.__RejectBtnText,
                onClick: () => setShowDeleteConfirmPopup(false),
              }}
              variant="error"
            />
          </>
        )}
        <div className={globalClasses.marginVertical2rem}>
          {/* <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Store Group Mapping
          </Typography> */}
          <div className={globalClasses.marginAround}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChangeSeason}
              fields={seasonFilterConfig}
              updateDefaultValue={false}
              defaultValues={seasonFilterFormData}
              labelWidthSpan={2}
              fieldTypeWidthSpan={6}
            ></Form>
          </div>
        </div>
        <div className={globalClasses.centerAlign}>
          <Button
            color="primary"
            variant="outlined"
            id="new-store-button"
            onClick={() => setShowGoBackDialog(true)}
          >
            Back
          </Button>
          <Button
            className={globalClasses.marginLeft1rem}
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => saveStoreDetails()}
            //disabled={!enableSisterStoreView}
          >
            Save
          </Button>
        </div>
        <Prompt
          isOpen={showGoBackDialog}
          title="Go back"
          subHeading={GO_BACK_MESSAGE}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => {
              props.goBackToStep1();
              setShowGoBackDialog(false);
            },
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowGoBackDialog(false),
          }}
          variant="error"
        />
      </div>
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {};
};
const mapActionsToProps = {
  saveNewStoreListDetails,
  getSeasonOptions,
};
export default connect(mapStateToProps, mapActionsToProps)(SisterStoreMapping);
