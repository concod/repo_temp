import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import DeleteIcon from "@mui/icons-material/Delete";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import { Prompt } from "impact-ui";
import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";
import {
  DC_LEAD_TIME_COLUMNS,
  ERROR_MESSAGE,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  STORE_DETAILS_TABLE_DATA,
  STORE_OPENING_FORM_CONSTANTS,
  NO_NEW_STORE_VALIDATION_MSG,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  clearEditNewStoreData,
  setEditNewStoreData,
} from "../../../../services-inventorysmart/New-Store/new-store-dashboard";
import {
  clearNewStoreDetails,
  fetchStoreAttributeList,
  getNewStoreDCDetails,
  getNewStoreListDetails,
  getStoreListDetails,
  saveStepOneFinalValues,
  setNewStoreDCDetails,
  setNewStoreDetailsForBackFlow,
  setNewStoreDetailsScreenLoader,
  setNewStoreFilterConfiguration,
  setNewStoreListItems,
} from "../../../../services-inventorysmart/New-Store/new-store-details";
import {
  configureAttributeOptions,
  isActionAllowedOnSubModule,
} from "../../../inventorysmart-utility";

const useStyles = makeStyles(() => ({
  footer: {
    display: "flex",
    justifyContent: "center",
    margin: "1rem",
  },
  setMarginForButtons: {
    marginRight: "1rem",
  },
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
    margin: "1rem",
  },
}));

const StoreDetailsComponent = (props) => {
  const [dcDetailsColumnConfig, setDcDetailsColumnConfig] = useState([]);
  const [dcDetailsData, setDcDetailsData] = useState(STORE_DETAILS_TABLE_DATA);
  const [newDcDetailsRow, setNewDcDetailsRow] = useState([]);
  const [counter, setCounter] = useState(0);
  const [openingDates, setOpeningDates] = useState({
    reservation_start_date: "",
    store_opening_date: "",
  });
  const [listOfNewStores, setListOfNewStores] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [storeDetailsFormConfig, setStoreDetailsFormConfig] = useState([]);
  const [storeDetailsFormValues, setStoreDetailsFormValues] = useState({});
  const [storeOpeningDateFormConfig, setStoreOpeningDateFormConfig] = useState(
    STORE_OPENING_FORM_CONSTANTS
  );
  const [enableValues, setEnableValues] = useState(false);
  const [enableAddDc, setEnableAddDc] = useState(true);
  const [selectedDCRow, setSelectedDCRow] = useState([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  const edit_store_id = props.history.location.state;
  const agGridInstance = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        if (isEmpty(props.editNewStoreData) && !edit_store_id) {
          let listOfStores = await props.getNewStoreListDetails();
          props.setNewStoreListItems(listOfStores.data.data);
        } else {
          let listOfStores = await props.getStoreListDetails(edit_store_id);
          props.setNewStoreListItems(listOfStores.data.data);
        }
        let newStoreDCList = await getColumnsAg(
          "table_name=new_store_dc_lead_time"
        )();
        if (enableValues) {
          newStoreDCList.forEach((item) => {
            if (DC_LEAD_TIME_COLUMNS.includes(item.column_name)) {
              item.disabled = true;
            }
          });
        }
        setDcDetailsColumnConfig(newStoreDCList);
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.displaySnackMessages(ERROR_MESSAGE, "error");
        props.setNewStoreDetailsScreenLoader(false);
      }
    })();
    return () => {
      props.clearNewStoreDetails();
    };
  }, [props.editNewStoreData, edit_store_id, enableValues]);

  useEffect(() => {
    // map labels based on tenant
    if (props.storeOpeningLabels?.length) {
      let storeOpeningConstants = STORE_OPENING_FORM_CONSTANTS.map(
        (item, i) => {
          return {
            ...item,
            label: props.storeOpeningLabels[i],
          };
        }
      );
      setStoreOpeningDateFormConfig(storeOpeningConstants);
    }
  }, [props.storeOpeningLabels]);

  useEffect(() => {
    if (!isEmpty(props.newStoreListItems)) {
      let listNewStores = [...props.newStoreListItems?.new_store_details];
      let storeGroupList =
        !isEmpty(props.newStoreListItems?.store_grade) &&
        Object.keys(props.newStoreListItems?.store_grade);
      setListOfNewStores(listNewStores);
      let newStoreFormConfiguration =
        props.newStoreListItems?.new_store_form_config?.map((config) => {
          if (config.accessor === "store_code") {
            return {
              ...config,
              options: configureAttributeOptions(
                listNewStores.map((store) => store.store_code)
              ),
              isMulti: false,
              isSearchable: true,
              isClearable: false,
            };
          } else if (config.accessor === "store_grade") {
            return {
              ...config,
              options: storeGroupList?.length
                ? configureAttributeOptions(
                    storeGroupList.map((grade) => grade)
                  )
                : [],
              isMulti: false,
              isSearchable: true,
              isClearable: false,
            };
          } else {
            return config;
          }
        });
      if (enableValues) {
        newStoreFormConfiguration = newStoreFormConfiguration?.map((config) => {
          return {
            ...config,
            isDisabled: enableValues,
          };
        });
      }
      setStoreDetailsFormConfig(newStoreFormConfiguration);
      let storeDetailsStateValues = {};
      if (props.newStoreListItems?.new_store_details?.length) {
        Object.keys(props.newStoreListItems?.new_store_details[0]).forEach(
          (key) => {
            storeDetailsStateValues[key] = "";
          }
        );
        setStoreDetailsFormValues(storeDetailsStateValues);
      } else {
        props.displaySnackMessages(NO_NEW_STORE_VALIDATION_MSG, "error");
      }
    }
  }, [props.newStoreListItems, enableValues]);

  useEffect(() => {
    let rowDataArr = [];
    if (props.newStoreDCDetails?.length) {
      if (props.newStoreDCDetails.length === 1) {
        props.newStoreDCDetails?.forEach((item, i) => {
          let updatedRowData = {
            dc: mapOptionsValue(props.newStoreDCDetails),
            key: i,
            dc_options: mapOptionsValue(props.newStoreDCDetails),
            lead_time: item.lead_time,
          };
          rowDataArr.push(updatedRowData);
        });
        setEnableAddDc(true);
      } else {
        props.newStoreDCDetails?.forEach((item, i) => {
          if (i == 0) {
            let updatedRowData = {
              dc: [],
              key: i,
              dc_options: mapOptionsValue(props.newStoreDCDetails),
              lead_time: item.lead_time,
            };
            rowDataArr.push(updatedRowData);
          }
        });
        let newDcRowArr = [
          {
            ...rowDataArr[0],
            key: 1,
          },
        ];
        setNewDcDetailsRow(newDcRowArr);
        setEnableAddDc(false);
      }
      setDcDetailsData(rowDataArr);
    } else {
      setDcDetailsData(STORE_DETAILS_TABLE_DATA);
    }
  }, [props.newStoreDCDetails]);

  useEffect(() => {
    // Wait for all initial calls to be done and then pre populate the fields
    if (listOfNewStores?.length && storeDetailsFormConfig?.length) {
      // to pre populate step 1, when user clicks on go back button in step 2
      if (
        props.screenNameNavigatedFrom &&
        props.screenNameNavigatedFrom === "sister-store-mapping" &&
        !isEmpty(props.saveNewStoreDetailsForBackFlow)
      ) {
        // to prepopulate attribute list filters when user is in edit state and clicks on go back button (restricting from selecting a new store code)
        if (!isEmpty(props.editNewStoreData)) {
          prepopulateStepOneValues(
            props.saveNewStoreDetailsForBackFlow,
            "edit"
          );
        }
        // not restricting the user from selecting a new store code as he is not in edit state
        else {
          prepopulateStepOneValues(
            props.saveNewStoreDetailsForBackFlow,
            "backFlow"
          );
        }
      }
      // edit flow
      if (
        isEmpty(props.screenNameNavigatedFrom) &&
        !isEmpty(props.editNewStoreData) &&
        props.inventorysmartModulesPermission?.inventorysmart_configuration &&
        Object.keys(
          props.inventorysmartModulesPermission?.inventorysmart_configuration
        ).includes("New Store")
      ) {
        let saveStoreCodeToEdit = {
          ...props.editNewStoreData,
          form_attributes: listOfNewStores[0],
        };
        prepopulateStepOneValues(saveStoreCodeToEdit, "edit");
      }
    }
  }, [
    props.screenNameNavigatedFrom, // back flow
    props.saveNewStoreDetailsForBackFlow, // back flow
    listOfNewStores,
    storeDetailsFormConfig,
    props.editNewStoreData, // editflow
    props.inventorysmartModulesPermission,
  ]);

  useEffect(() => {
    if (
      props.inventorysmartModulesPermission?.inventorysmart_configuration &&
      Object.keys(
        props.inventorysmartModulesPermission?.inventorysmart_configuration
      ).includes("New Store")
    ) {
      let enableValues = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
        "edit"
      );
      setEnableValues(!enableValues);
    }
  }, [props.inventorysmartModulesPermission]);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  const prepopulateStepOneValues = (objectToPopulate, flowType) => {
    // Pre populate all the state values present
    let storeAttrsTimePeriod = objectToPopulate.other_attributes;
    let dcAttrs = objectToPopulate.dc_row_attributes;
    let storeDataAttrs = objectToPopulate.form_attributes;
    setOpeningDates({
      reservation_start_date: storeAttrsTimePeriod.reservation_start_date,
      store_opening_date: storeAttrsTimePeriod.store_opening_date,
    });
    // To check this once the flow is complete
    if (flowType === "edit") {
      storeOpeningDateFormConfig[0].disablePast = false;
      storeOpeningDateFormConfig[1].disablePast = false;
      storeOpeningDateFormConfig[0].isDisabled = enableValues;
      storeOpeningDateFormConfig[1].isDisabled = enableValues;
      setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
    }
    setStoreDetailsFormValues(storeDataAttrs);
    fetchInterdependentValues(storeDataAttrs, dcAttrs, storeAttrsTimePeriod);
  };

  const fetchInterdependentValues = async (
    selectedStoreData,
    dcList,
    storeAttrs
  ) => {
    try {
      props.setNewStoreDetailsScreenLoader(true);
      let response = await props.getNewStoreDCDetails(
        selectedStoreData?.channel
      );
      let dcRows = dcList?.map((item, i) => {
        return {
          dc: mapOptionsValue([item]),
          key: i,
          dc_options: mapOptionsValue(response.data?.data),
          lead_time: item.lead_time,
        };
      });
      setDcDetailsData(dcRows);
      if (response.data?.data?.length > 1) {
        let newDcRowArr = [
          {
            ...dcRows[0],
            dc: [],
            lead_time: "",
            key: 1,
          },
        ];
        setNewDcDetailsRow(newDcRowArr);
        setCounter(dcList.length - 1);
        setEnableAddDc(false);
      }
      props.setNewStoreDetailsScreenLoader(false);
    } catch (e) {
      props.setNewStoreDetailsScreenLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const mapOptionsValue = (dc) => {
    return dc.map((item) => {
      return {
        label: item.dc,
        value: item.dc,
        id: item.dc,
      };
    });
  };

  const handleChangeStoreDetails = async (updatedFormData, fieldType) => {
    if (fieldType === "store_code") {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let selectedStoreData =
          props.newStoreListItems?.new_store_details?.filter(
            (store) => store.store_code === updatedFormData.store_code
          )[0];
        let response = await props.getNewStoreDCDetails(
          selectedStoreData?.channel
        );
        props.setNewStoreDCDetails(response.data?.data);
        let cloneStoreDetailsFormValues = cloneDeep(storeDetailsFormValues);
        Object.keys(cloneStoreDetailsFormValues).forEach((key) => {
          if (key === "store_code") {
            cloneStoreDetailsFormValues["store_code"] =
              updatedFormData.store_code;
          } else cloneStoreDetailsFormValues[key] = selectedStoreData[key];
        });
        setStoreDetailsFormValues(cloneStoreDetailsFormValues);
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.setNewStoreDetailsScreenLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else setStoreDetailsFormValues(updatedFormData);
  };

  const handleChangeStoreOpeningDates = (updatedFormData, fieldType) => {
    if (fieldType === "reservation_start_date") {
      // store opening date should be greater than reservation date, hence we pass min starting date to Store opening date
      // all date validations are handled here
      let reservationDateFormatted = new Date(
        updatedFormData.reservation_start_date
      );
      reservationDateFormatted.setDate(reservationDateFormatted.getDate() + 1);
      storeOpeningDateFormConfig[1].minDate = reservationDateFormatted;
      setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
    }
    setOpeningDates(updatedFormData);
  };

  const goToNextStep = () => {
    // Validation to check if all mandatory fields are filled
    let storeDetailsValidation = false;
    let openingDateValidation = false;
    let dcValidation = false;
    storeDetailsValidation = Object.values(storeDetailsFormValues).some((val) =>
      isEmpty(val)
    );
    openingDateValidation =
      isEmpty(openingDates.reservation_start_date) ||
      isEmpty(openingDates.store_opening_date);
    // loop through all rows and set the condition to true or false
    dcValidation = dcDetailsData.map((obj) => {
      if (isEmpty(obj.dc) || !obj.lead_time) return true;
      else return false;
    });
    if (
      storeDetailsValidation ||
      openingDateValidation ||
      dcValidation.includes(true)
    ) {
      props.displaySnackMessages(
        "Please fill in all mandatory fields and select at least one DC",
        "warning"
      );
    } else if (dcValidation.includes(true)) {
      props.displaySnackMessages(
        "Selected DC's lead time should be greater than 0",
        "warning"
      );
    }
    // Save the payload (store details) in reducer and navigate to next state, as the same payload is reused in the consecutive steps
    else {
      let editableStoreAttr = props.newStoreListItems?.new_store_form_config
        ?.filter(
          (config) => !config.isDisabled && config.accessor !== "store_code"
        )
        ?.map((attr) => attr.accessor);
      let storeAttrsList = [];
      Object.keys(storeDetailsFormValues)?.forEach((key) => {
        if (editableStoreAttr.includes(key)) {
          storeAttrsList.push({
            attribute_name: key,
            attribute_value: storeDetailsFormValues[key],
          });
        }
      });

      let body = {
        form_attributes: storeDetailsFormValues,
        other_attributes: {
          reservation_start_date: moment(
            openingDates.reservation_start_date
          ).format("YYYY-MM-DD"),
          store_opening_date: moment(openingDates.store_opening_date).format(
            "YYYY-MM-DD"
          ),
        },
        dc_row_attributes: dcDetailsData
          .filter((obj) => !isEmpty(obj.dc))
          .map((item) => {
            return {
              dc: item.dc[0]?.value,
              lead_time: item?.lead_time,
            };
          }),
        // Editable attributes from store details form
        store_attributes: storeAttrsList,
      };
      props.saveStepOneFinalValues(body);
      let reqBodyForBackFlow = {
        store_code: storeDetailsFormValues?.store_code,
        ...body,
      };
      props.setNewStoreDetailsForBackFlow(reqBodyForBackFlow);
      props.mapSisterStores();
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onChangeDC = (cellNode, colId, _p_colType, e) => {
    let arr = [];
    agGridInstance.current.api.forEachNode((item) => arr.push(item.data));
    // we skip 0th row index as we don't hv to apply a check on the first row data in the table initially
    // if any row node has a dc selected despite the rowIndex perform a check to see if the DC name is already selected
    if (cellNode.rowIndex !== 0 || !isEmpty(cellNode.data.dc)) {
      /* 
        If the selected col is dc from the row data fetch the dc key and extract the selected value.
        For the current row index that we select the values for, tally it against the previous rows with the dc key.
        If you find a match(dc with same name selected in the current row) throw a warning to the user.
      */
      if (colId === "dc") {
        let val = arr.map((obj) => obj.dc).filter((item) => item !== "");
        let selectedDCs = [];
        val.forEach((dc, i) => {
          // Check for duplicate values by comparing with the previously filled rows
          if (i !== cellNode.rowIndex) {
            dc.forEach((sub) => {
              selectedDCs.push(sub.value);
            });
          }
        }); // fetching only 0th index
        let currentDC = e?.value; // single select
        if (selectedDCs.includes(currentDC)) {
          props.displaySnackMessages(
            "This DC is already selected, please select a new DC",
            "warning"
          );
        } else return true;
      }
    } else return true;
  };

  const addNewRow = () => {
    // throw a warning message if the latest row in table has empty values
    let latestRecordEntry = dcDetailsData[dcDetailsData.length - 1];
    if (!latestRecordEntry?.dc?.length || !latestRecordEntry?.lead_time) {
      props.displaySnackMessages("Select a DC and enter lead time", "warning");
    } else {
      let newCounter = counter + 1;
      setCounter(newCounter);

      let cloneNewDCDetailsRow = cloneDeep(newDcDetailsRow);
      cloneNewDCDetailsRow[0].key = newCounter;

      // add new row to an existing row
      let copyOfExistingMappedData = [...dcDetailsData];
      let newData = [...copyOfExistingMappedData, ...cloneNewDCDetailsRow];
      setDcDetailsData(newData);
    }
  };

  const confirmDeleteRows = () => {
    let rowDataAfterDeleting = dcDetailsData.filter(
      (item) => !selectedDCRow.some((obj) => obj.key === item.key)
    );
    if (rowDataAfterDeleting.length === 0) {
      let initialRow = [{ ...dcDetailsData[0], dc: [], key: 0, lead_time: "" }];
      setDcDetailsData(initialRow);
      agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
    } else setDcDetailsData(rowDataAfterDeleting);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (colDef.column_name === "lead_time") {
      data.lead_time = newValue;
      agGridInstance.current.api.refreshCells({
        columns: ["lead_time"],
      });

      let cloneRefInstance = cloneDeep(dcDetailsData);
      const existingIndex = cloneRefInstance.findIndex(
        (obj) => obj.key === data.key
      );
      if (existingIndex !== -1) {
        // Replace the existing object with the new object
        cloneRefInstance[existingIndex] = data;
        setDcDetailsData(cloneRefInstance);
      } else {
        // Push the new object to the state
        setDcDetailsData((prevState) => [...prevState, data]);
      }
    }
  };

  const deletedSelectedDC = () => {
    if (!selectedDCRow.length) {
      props.displaySnackMessages("Select at least one row", "warning");
    } else confirmDeleteRows();
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedDCRow(selections);
  };

  return (
    <Loader loader={props.newStoreDetailsScreenLoader}>
      <div className={globalClasses.marginAround}>
        <Typography variant="h4" className={globalClasses.paddingHorizontal}>
          Store Attributes
        </Typography>
        <div className={globalClasses.marginAround}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            handleChange={handleChangeStoreDetails}
            fields={storeDetailsFormConfig}
            updateDefaultValue={false}
            defaultValues={storeDetailsFormValues}
            labelWidthSpan={2}
            fieldTypeWidthSpan={6}
          ></Form>
        </div>

        <div className={globalClasses.marginVertical2rem}>
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Store Opening Info
          </Typography>
          <div className={globalClasses.marginAround}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChangeStoreOpeningDates}
              fields={storeOpeningDateFormConfig}
              updateDefaultValue={false}
              defaultValues={openingDates}
              labelWidthSpan={2}
              fieldTypeWidthSpan={6}
            ></Form>
          </div>
          <div className={classes.alignButtons}>
            <Button
              title="Add New DC"
              color="primary"
              variant="contained"
              id="new-store-button"
              onClick={() => addNewRow()}
              disabled={enableAddDc}
            >
              <AddIcon />
            </Button>
            <Button
              className={globalClasses.marginLeft1rem}
              title="Delete"
              color="primary"
              variant="contained"
              id="store-details-button"
              onClick={() => deletedSelectedDC()}
              disabled={enableAddDc}
            >
              <DeleteIcon />
            </Button>
          </div>

          <div className={globalClasses.marginAround}>
            <AgGridComponent
              columns={dcDetailsColumnConfig}
              rowdata={dcDetailsData}
              uniqueRowId={"key"}
              loadTableInstance={loadTableInstance}
              callBackOnChangeCustomFunction={onChangeDC}
              sizeColumnsToFitFlag
              onCellValueChanged={onCellValueChanged}
              selectAllHeaderComponent={!enableAddDc}
              hideHeaderCheckboxComponent={!enableAddDc}
              onSelectionChanged={onSelectionChanged}
            />
          </div>
        </div>
        <div className={classes.footer}>
          <Button
            color="primary"
            variant="outlined"
            className={classes.setMarginForButtons}
            onClick={() => setShowGoBackDialog(true)}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => goToNextStep()}
          >
            Next
          </Button>
        </div>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        subHeading={GO_TO_NEW_STORE_DASHBOARD_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            props.history.push({
              pathname: CONFIGURATION,
              state: ADD_NEW_STORE,
            });
            props.clearEditNewStoreData();
            setShowGoBackDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowGoBackDialog(false),
        }}
        variant="error"
      />
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoreDetailsScreenLoader:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreDetailsScreenLoader,
    newStoreListItems:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreListItems,
    newStoreDCDetails:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreDCDetails,
    newStoreFilterConfiguration:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .newStoreFilterConfiguration,
    saveNewStoreDetailsForBackFlow:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .saveNewStoreDetailsForBackFlow,
    editNewStoreData:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .editNewStoreData,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    storeOpeningLabels:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.store_opening_label_constants,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewStoreDetailsScreenLoader: (body) =>
      dispatch(setNewStoreDetailsScreenLoader(body)),
    getNewStoreListDetails: (body) => dispatch(getNewStoreListDetails(body)),
    getNewStoreDCDetails: (body) => dispatch(getNewStoreDCDetails(body)),
    setNewStoreListItems: (body) => dispatch(setNewStoreListItems(body)),
    setNewStoreDCDetails: (body) => dispatch(setNewStoreDCDetails(body)),
    saveStepOneFinalValues: (body) => dispatch(saveStepOneFinalValues(body)),
    fetchStoreAttributeList: (body) => dispatch(fetchStoreAttributeList(body)),
    setNewStoreFilterConfiguration: (body) =>
      dispatch(setNewStoreFilterConfiguration(body)),
    clearNewStoreDetails: (body) => dispatch(clearNewStoreDetails(body)),
    clearEditNewStoreData: (body) => dispatch(clearEditNewStoreData(body)),
    setNewStoreDetailsForBackFlow: (body) =>
      dispatch(setNewStoreDetailsForBackFlow(body)),
    setEditNewStoreData: (body) => dispatch(setEditNewStoreData(body)),
    getStoreListDetails: (body) => dispatch(getStoreListDetails(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDetailsComponent);
