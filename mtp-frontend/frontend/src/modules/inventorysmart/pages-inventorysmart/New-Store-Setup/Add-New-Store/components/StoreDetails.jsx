import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty, isNumber } from "lodash";
import moment from "moment";
import DeleteIcon from "@mui/icons-material/Delete";
import Divider from '@mui/material/Divider';

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { common, USER_RESERVE_MANDATORY_FIELDS_MSG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";
import {
  DC_LEAD_TIME_COLUMNS,
  ERROR_MESSAGE,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  NO_NEW_STORE_VALIDATION_MSG,
  STORE_DETAILS_TABLE_DATA,
  STORE_OPENING_FORM_CONSTANTS,
  DC_LEAD_TIME_DUPLICATE_VALIDATION_MSG,
  DC_LEAD_TIME_ENTER_VALUES_MSG,
  RESERVATION_DATE_VALIDATION_MSG,
  STORE_OPENING_WITH_INSTORE_FORM,
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
import StoreDetails from "./details";
import { Prompt } from "impact-ui";

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
    // margin: "1rem",
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
  const [colKeysDC, setColKeysDC] = useState([]);
  const [storeDetails, setStoreDetails] = useState([]);

  const globalClasses = globalStyles();
  const classes = useStyles();

  const edit_store_id = props.history.location.state;
  const agGridInstance = useRef(null);

  const { new_store_form_config } = props.newStoreListItems || {};
  const { create: createConfig, newStoreUi } = props.inventorysmart_new_store_setup || {};
  const { step1: step1Config } = createConfig || {};
  const {
    showStoreDetails,
    fieldsHiddenInStoreDetails = [],
    showDateFormWithInstore,
    inStorePriorDays,
    validateDCPriority,
    newFlow,
    skipLeadTimeProcessing = false,
  } = step1Config || {};
  const { min: minInStorePriorDays = 1, max: maxInStorePriorDays = 1 } =
    inStorePriorDays || {};

  useEffect(() => {
    if (showDateFormWithInstore) {
      setStoreOpeningDateFormConfig(STORE_OPENING_WITH_INSTORE_FORM);

      setOpeningDates({
        store_opening_date: "",
        instore_date: "",
        allocation_start_date: "",
      });
    }
  }, [showDateFormWithInstore]);

  useEffect(() => {
    (async () => {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        if (!props.editNewStoreData && !edit_store_id) {
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

        if (newFlow) {
          let colNames = newStoreDCList.map((item) => item.column_name);
          setColKeysDC(colNames);
        }

        setDcDetailsColumnConfig(newStoreDCList);
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.displaySnackMessages(ERROR_MESSAGE, "error");
        props.setNewStoreDetailsScreenLoader(false);
      }
    })();
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
      let newStoreFormConfiguration = props.newStoreListItems?.new_store_form_config
        ?.filter((config) => !showStoreDetails || !config.isDisabled) // While displaying store details component, hide the corresponding form fields
        .map((config) => {
          if (config.accessor === props.storeCodeKeyName) {
            return {
              ...config,
              options: configureAttributeOptions(
                listNewStores.map((store) => store[props.storeCodeKeyName])
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

  const setInitialRowData = () => {
    let dcRowKeys = { key: 0 };

    dcDetailsColumnConfig.forEach((col) => {
      if (col.type === "dynamic-list") {
        dcRowKeys[col.column_name] = "";

        dcRowKeys[col.extra.options_column] = mapOptionsValue(
          props.newStoreDCDetails,
          col.column_name
        );
      } else {
        dcRowKeys[col.column_name] = "";
      }
    });

    return dcRowKeys;
  };

  useEffect(() => {
    if(newFlow) {
      let rowDataArr = [];
      if (props.newStoreDCDetails?.length && dcDetailsColumnConfig?.length) {
        let dcRowKeys = setInitialRowData();
        if (props.newStoreDCDetails.length === 1) {
          let updatedRowData = {
            ...dcRowKeys,
            dc: mapOptionsValue(props.newStoreDCDetails, "dc"),
            lead_time: props.newStoreDCDetails[0]?.lead_time
              ? props.newStoreDCDetails[0]?.lead_time
              : "",
          };
          rowDataArr.push(updatedRowData);
          setEnableAddDc(true);
        } else {
          rowDataArr.push(dcRowKeys);
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
        setDcDetailsData([]);
        setEnableAddDc(false);
      }
    } else {
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
    }
  }, [props.newStoreDCDetails, dcDetailsColumnConfig]);

  useEffect(() => {
    if(newFlow) {
      // Wait for all initial calls to be done and then pre populate the fields
      if (
        listOfNewStores?.length &&
        storeDetailsFormConfig?.length &&
        dcDetailsColumnConfig?.length
      ) {
        // to pre populate step 1, when user clicks on go back button in step 2
        if (
          props.screenNameNavigatedFrom &&
          props.screenNameNavigatedFrom === "sister-store-mapping" &&
          !isEmpty(props.saveNewStoreDetailsForBackFlow)
        ) {
          // to prepopulate attribute list filters when user is in edit state and clicks on go back button (restricting from selecting a new store code)
          if (
            !isEmpty(props.finalStoreDetailsStateValues) &&
            props.editNewStoreData
          ) {
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
          props.editNewStoreData &&
          !isEmpty(props.finalStoreDetailsStateValues) &&
          props.inventorysmartModulesPermission?.inventorysmart_configuration &&
          Object.keys(
            props.inventorysmartModulesPermission?.inventorysmart_configuration
          ).includes("New Store")
        ) {
          let saveStoreCodeToEdit = {
            ...props.finalStoreDetailsStateValues,
            form_attributes: listOfNewStores[0],
          };
          prepopulateStepOneValues(saveStoreCodeToEdit, "edit");
        }
      }
    } else {
      // Wait for all initial calls to be done and then pre populate the fields
      if (listOfNewStores?.length && storeDetailsFormConfig?.length) {
        // to pre populate step 1, when user clicks on go back button in step 2
        if (
          props.screenNameNavigatedFrom &&
          props.screenNameNavigatedFrom === "sister-store-mapping" &&
          !isEmpty(props.saveNewStoreDetailsForBackFlow)
        ) {
          // to prepopulate attribute list filters when user is in edit state and clicks on go back button (restricting from selecting a new store code)
          if (
            !isEmpty(props.finalStoreDetailsStateValues) &&
            props.editNewStoreData
          ) {
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
          props.editNewStoreData &&
          !isEmpty(props.finalStoreDetailsStateValues) &&
          props.inventorysmartModulesPermission?.inventorysmart_configuration &&
          Object.keys(
            props.inventorysmartModulesPermission?.inventorysmart_configuration
          ).includes("New Store")
        ) {
          let saveStoreCodeToEdit = {
            ...props.finalStoreDetailsStateValues,
            form_attributes: listOfNewStores[0],
          };
          prepopulateStepOneValues(saveStoreCodeToEdit, "edit");
        }
      }
    }
  }, [
    props.screenNameNavigatedFrom, // back flow
    props.saveNewStoreDetailsForBackFlow, // back flow
    listOfNewStores,
    storeDetailsFormConfig,
    props.editNewStoreData, // editflow
    props.finalStoreDetailsStateValues, // editflow
    props.inventorysmartModulesPermission,
    dcDetailsColumnConfig,
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

  useEffect(() => {
    // To generate store details component data. Used only if "showStoreDetails" is set

    if (showStoreDetails && new_store_form_config) {
      const filteredFormConfig = new_store_form_config.filter(
        (config) => !fieldsHiddenInStoreDetails.includes(config.accessor)
      );

      const storeDetailsParams = filteredFormConfig
        .sort(
          (config1, config2) =>
            config1.order_of_display - config2.order_of_display
        )
        .map((config) => config.label);
      const storeDetailsParamsMap = {};

      filteredFormConfig.forEach((config) => {
        storeDetailsParamsMap[config.label] = config.accessor;
      });

      const updatedStoreDetails = storeDetailsParams.map((param) => {
        return [param, storeDetailsFormValues[storeDetailsParamsMap[param]]];
      });

      setStoreDetails(updatedStoreDetails);
    }
  }, [showStoreDetails, new_store_form_config, storeDetailsFormValues]);

  useEffect(() => {
    // To calculate instore-date range. Used only if "showDateFormWithInstore" flag is set

    if (showDateFormWithInstore && storeDetailsFormValues.open_date) {
      setOpeningDates((prevOpeningDates) => {
        return {
          ...prevOpeningDates,
          store_opening_date: moment(storeDetailsFormValues.open_date),
        };
      });

      setStoreOpeningDateFormConfig((prevStoreOpeningDateFormConfig) => {
        const instoreDateConfig = prevStoreOpeningDateFormConfig.find(
          (config) => config.accessor === "instore_date"
        );

        if (instoreDateConfig) {
          instoreDateConfig.minDate = moment(
            storeDetailsFormValues.open_date
          ).subtract(minInStorePriorDays, "days");
          instoreDateConfig.maxDate = moment(
            storeDetailsFormValues.open_date
          ).subtract(maxInStorePriorDays, "days");
        }

        return [...prevStoreOpeningDateFormConfig];
      });
    }
  }, [showDateFormWithInstore, storeDetailsFormValues]);

  useEffect(() => {
    // To calculate allocation-start-date range. Used only if "showDateFormWithInstore" flag is set

    if (showDateFormWithInstore) {
      const maxDCLeadTime = dcDetailsData.reduce((max, row) => {
        const parsedValue = parseInt(row.lead_time);

        return Math.max(max, isNaN(parsedValue) ? 0 : parsedValue);
      }, 0);

      if (openingDates.instore_date) {
        setStoreOpeningDateFormConfig((prevStoreOpeningDateFormConfig) => {
          const allocationStartDateConfig = prevStoreOpeningDateFormConfig.find(
            (config) => config.accessor === "allocation_start_date"
          );

          allocationStartDateConfig.minDate = moment(new Date()).add(1, "days");;
          allocationStartDateConfig.maxDate = moment(
            openingDates.instore_date
          ).subtract(maxDCLeadTime, "days");

          return [...prevStoreOpeningDateFormConfig];
        });
      }
    }
  }, [showDateFormWithInstore, openingDates, dcDetailsData]);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  const prepopulateStepOneValues = (objectToPopulate, flowType) => {
    if(newFlow) {
      // Pre populate all the state values present
      let storeAttrsTimePeriod = objectToPopulate.other_attributes;
      let dcAttrs = objectToPopulate.dc_row_attributes;
      let storeDataAttrs = objectToPopulate.form_attributes;

      if (showDateFormWithInstore) {
        setOpeningDates({
          instore_date: moment(storeAttrsTimePeriod.instore_date),
          allocation_start_date: moment(
            storeAttrsTimePeriod.allocation_start_date
          ),
        });
      } else {
        setOpeningDates({
          reservation_start_date: storeAttrsTimePeriod.reservation_start_date,
          store_opening_date: storeAttrsTimePeriod.store_opening_date,
        });
      }

      if (flowType === "edit"  && !showDateFormWithInstore) {
        storeOpeningDateFormConfig[0].isDisabled = enableValues;
        storeOpeningDateFormConfig[1].isDisabled = enableValues;
        setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
      }
      setCounter(dcAttrs.length - 1);
      setStoreDetailsFormValues(storeDataAttrs);
      fetchInterdependentValues(storeDataAttrs, dcAttrs);
    } else {
      // Pre populate all the state values present
      let storeAttrsTimePeriod = objectToPopulate.other_attributes;
      let dcAttrs = objectToPopulate.dc_row_attributes;
      let storeDataAttrs = objectToPopulate.form_attributes;
      setOpeningDates({
        reservation_start_date: storeAttrsTimePeriod.reservation_start_date,
        store_opening_date: storeAttrsTimePeriod.store_opening_date,
      });
      if (flowType === "edit") {
        storeOpeningDateFormConfig[0].isDisabled = enableValues;
        storeOpeningDateFormConfig[1].isDisabled = enableValues;
        setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
      }
      setCounter(dcAttrs.length - 1);
      setStoreDetailsFormValues(storeDataAttrs);
      fetchInterdependentValues(storeDataAttrs, dcAttrs, storeAttrsTimePeriod);
    }
  };

  const fetchInterdependentValues = async (
    selectedStoreData,
    dcList,
    storeAttrs
  ) => {
    if(newFlow) {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let response = await props.getNewStoreDCDetails(
          selectedStoreData?.retail_region
        );
        if (response.data?.data?.length > 1) {
          setEnableAddDc(false);
          props.setNewStoreDCDetails(response.data?.data);
        }
        let dcRows = dcList?.map((item, i) => {
          if (item?.dc_rank) {
            return {
              ...item,
              key: i,
              dc: mapOptionsValue([item], "dc"),
              dc_options: mapOptionsValue(response.data?.data, "dc"),
              dc_rank: mapOptionsValue([item], "dc_rank"),
              dc_rank_options: mapOptionsValue(response.data?.data, "dc_rank"), // to optimize this later
            };
          } else {
            return {
              ...item,
              key: i,
              dc: mapOptionsValue([item], "dc"),
              dc_options: mapOptionsValue(response.data?.data, "dc"),
            };
          }
        });
        setDcDetailsData(dcRows);
        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.setNewStoreDetailsScreenLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let response = await props.getNewStoreDCDetails(
          selectedStoreData?.channel
        );

        if(newFlow) {
          if (response.data?.data?.length > 1) {
            setEnableAddDc(false);
            props.setNewStoreDCDetails(response.data?.data);
          }
          let dcRows = dcList?.map((item, i) => {
            if (item?.dc_rank) {
              return {
                ...item,
                key: i,
                dc: mapOptionsValue([item], "dc"),
                dc_options: mapOptionsValue(response.data?.data, "dc"),
                dc_rank: mapOptionsValue([item], "dc_rank"),
                dc_rank_options: mapOptionsValue(response.data?.data, "dc_rank"), // to optimize this later
              };
            } else {
              return {
                ...item,
                key: i,
                dc: mapOptionsValue([item], "dc"),
                dc_options: mapOptionsValue(response.data?.data, "dc"),
              };
            }
          });
          setDcDetailsData(dcRows);
        } else {
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
        }

        props.setNewStoreDetailsScreenLoader(false);
      } catch (e) {
        props.setNewStoreDetailsScreenLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
  };

  const mapOptionsValue = (dc, key) => {
    if(newFlow) {
      return dc.map((item) => {
        return {
          label: item[key],
          value: item[key],
          id: item[key],
        };
      });
    } else {
      return dc.map((item) => {
        return {
          label: item.dc,
          value: item.dc,
          id: item.dc,
        };
      });
    }
  };

  const handleChangeStoreDetails = async (updatedFormData, fieldType) => {
    if (fieldType === props.storeCodeKeyName) {
      try {
        props.setNewStoreDetailsScreenLoader(true);
        let selectedStoreData =
          props.newStoreListItems?.new_store_details?.filter(
            (store) =>
              store[props.storeCodeKeyName] ===
              updatedFormData[props.storeCodeKeyName]
          )[0];
        let response = await props.getNewStoreDCDetails(
          selectedStoreData?.retail_region
        );
        props.setNewStoreDCDetails(response.data?.data);
        let cloneStoreDetailsFormValues = cloneDeep(storeDetailsFormValues);
        Object.keys(cloneStoreDetailsFormValues).forEach((key) => {
          if (key === props.storeCodeKeyName) {
            cloneStoreDetailsFormValues[props.storeCodeKeyName] =
              updatedFormData[props.storeCodeKeyName];
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
    if(newFlow) {
      // Validation to check if all mandatory fields are filled
      let storeDetailsValidation = false;
      let openingDateValidation = false;
      let dcValidation = false;
      let leadTimeErrFlag = false;
      storeDetailsValidation = Object.values(storeDetailsFormValues).some((val) =>
        isEmpty(val)
      );
      if (showDateFormWithInstore) {
        const datesValidationMap = Object.entries(openingDates).map(
          ([key, val]) => {
            const config = storeOpeningDateFormConfig.find(
              (config) => config.accessor === key
            );

            return [
              config.label,
              isEmpty(val) ||
                (config?.minDate && moment(val).isBefore(config.minDate,"day")) ||
                (config?.maxDate && moment(val).isAfter(config.maxDate)),
            ];
          }
        );

        for (const [label, error] of datesValidationMap) {
          if (error) {
            props.displaySnackMessages(`${label} is invalid`, "warning");

            return;
          }
        }
      } else {
        openingDateValidation =
          isEmpty(openingDates.reservation_start_date) ||
          isEmpty(openingDates.store_opening_date);
      }

      // loop through all rows and set the condition to true or false
      dcValidation = dcDetailsData.map((obj) => {
        let newRow = {};
        colKeysDC.forEach((key) => {
          newRow[key] = obj[key];
        });
        if (validateDCPriority) {
          if (obj?.lead_time === 0) {
            leadTimeErrFlag = true;
            return true
          }
          if (Object.values(newRow).some((data) => !data?.length && !isNumber(data)))
            return true;
          else return false;
        }
        else {
          if (Object.values(newRow).some((data) => !data?.length && data == 0))
            return true;
          else return false;
        }
      });

      if(leadTimeErrFlag){
        props.displaySnackMessages("Lead time cannot be 0", "warning");
        return;
      };

      // To check if DC priorities start with 1 and in sequence. Skip if "dcValidation" has true - empty cell(s)
      if (validateDCPriority && !dcValidation.includes(true)) {
        const dcDetailsDataClone = cloneDeep(dcDetailsData);

        dcDetailsDataClone.sort(
          (dc1, dc2) => dc1.dc_rank[0].value - dc2.dc_rank[0].value
        );

        for (let index = 0; index < dcDetailsDataClone.length; index++) {
          const currentDC = dcDetailsDataClone[index];
          const label = currentDC.dc[0].value;
          const priority = currentDC.dc_rank[0].value;

          if (priority !== index + 1) {
            props.displaySnackMessages(
              `DC priority of ${label} is invalid`,
              "warning"
            );

            return;
          }
        }
      }

      if (
        storeDetailsValidation ||
        openingDateValidation ||
        dcValidation.includes(true)
      ) {
        props.displaySnackMessages(USER_RESERVE_MANDATORY_FIELDS_MSG, "warning");
      } else if (
        new Date(openingDates.reservation_start_date) >
        new Date(openingDates.store_opening_date)
      ) {
        props.displaySnackMessages(RESERVATION_DATE_VALIDATION_MSG, "warning");
      }
      // Save the payload (store details) in reducer and navigate to next state, as the same payload is reused in the consecutive steps
      else {
        let editableStoreAttr = props.newStoreListItems?.new_store_form_config
          ?.filter(
            (config) =>
              !config.isDisabled && config.accessor !== props.storeCodeKeyName
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
          dc_row_attributes: dcDetailsData.map((obj) => {
            let rows = Object.keys(obj).filter(
              (item) => item !== "key" && !item.includes("options")
            );
            let rowObj = {};
            rows.forEach((row) => {
              rowObj[row] = Array.isArray(obj[row])
                ? obj[row][0]?.value
                : obj[row];
            });
            return rowObj;
          }),
          // Editable attributes from store details form
          store_attributes: storeAttrsList,
        };

        if (showDateFormWithInstore) {
          body.other_attributes = {
            store_opening_date: openingDates.store_opening_date.format(
              "YYYY-MM-DD"
            ),
            allocation_start_date: openingDates.allocation_start_date.format(
              "YYYY-MM-DD"
            ),
            instore_date: openingDates.instore_date.format("YYYY-MM-DD"),
          };
        }

        if (
          props.editNewStoreData &&
          !isEmpty(props.finalStoreDetailsStateValues)
        ) {
          // Updating stepper payload with edit data & with changes made on current screen to carry forward the updated values to next step
          let sister_store_mapping_date = "",
            otherAttrsEdit = props.finalStoreDetailsStateValues?.other_attributes;
          sister_store_mapping_date =
            body.other_attributes.store_opening_date ===
            otherAttrsEdit?.store_opening_date
              ? otherAttrsEdit?.sister_store_mapping_date
              : "";
          body = {
            ...body,
            other_attributes: {
              ...props.finalStoreDetailsStateValues?.other_attributes,
              ...body.other_attributes,
              store_group_mapping_date: body.other_attributes.store_opening_date,
              sister_store_mapping_date: sister_store_mapping_date,
            },
            table_row_attributes:
              props.finalStoreDetailsStateValues?.table_row_attributes,
            store_code: props.finalStoreDetailsStateValues?.store_code,
          };
        }
        props.saveStepOneFinalValues(body);
        let reqBodyForBackFlow = {
          store_code: storeDetailsFormValues[props.storeCodeKeyName],
          ...body,
        };
        props.setNewStoreDetailsForBackFlow(reqBodyForBackFlow);
        props.mapSisterStores();
      }
    } else {
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
      } else if (
        new Date(openingDates.reservation_start_date) >
        new Date(openingDates.store_opening_date)
      ) {
        props.displaySnackMessages(RESERVATION_DATE_VALIDATION_MSG, "warning");
      }
      // Save the payload (store details) in reducer and navigate to next state, as the same payload is reused in the consecutive steps
      else {
        let editableStoreAttr = props.newStoreListItems?.new_store_form_config
          ?.filter(
            (config) =>
              !config.isDisabled && config.accessor !== props.storeCodeKeyName
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
        if (
          props.editNewStoreData &&
          !isEmpty(props.finalStoreDetailsStateValues)
        ) {
          // Updating stepper payload with edit data & with changes made on current screen to carry forward the updated values to next step
          let sister_store_mapping_date = "",
            otherAttrsEdit = props.finalStoreDetailsStateValues?.other_attributes;
          sister_store_mapping_date =
            body.other_attributes.store_opening_date ===
            otherAttrsEdit?.store_opening_date
              ? otherAttrsEdit?.sister_store_mapping_date
              : "";
          body = {
            ...body,
            other_attributes: {
              ...props.finalStoreDetailsStateValues?.other_attributes,
              ...body.other_attributes,
              store_group_mapping_date: body.other_attributes.store_opening_date,
              sister_store_mapping_date: sister_store_mapping_date,
            },
            table_row_attributes:
              props.finalStoreDetailsStateValues?.table_row_attributes,
            store_code: props.finalStoreDetailsStateValues?.store_code,
          };
        }
        props.saveStepOneFinalValues(body);
        let reqBodyForBackFlow = {
          store_code: storeDetailsFormValues[props.storeCodeKeyName],
          ...body,
        };
        props.setNewStoreDetailsForBackFlow(reqBodyForBackFlow);
        props.mapSisterStores();
      }
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onChangeDC = async (cellNode, colId, colType, e) => {
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
      if (newFlow) {
        if (colType === "dynamic-list") {
          let val = arr.map((obj) => obj[colId]).filter((item) => item !== "");
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
              DC_LEAD_TIME_DUPLICATE_VALIDATION_MSG,
              "warning"
            );
          } else return true;
        }
      } else {
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
      }
    } else return true;
  };

  const addNewRow = () => {
    if(newFlow) {
      // throw a warning message if the latest row in table has empty values
      let latestRecordEntry = dcDetailsData[dcDetailsData.length - 1];
      let keysToIgnore = Object.keys(latestRecordEntry).filter(
        (item) => item !== "key" && !item.includes("options") 
      );
      if (keysToIgnore.some((key) => latestRecordEntry[key]?.length === 0)) {
        props.displaySnackMessages(DC_LEAD_TIME_ENTER_VALUES_MSG, "warning");
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
    } else {
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
    }
  };

  const confirmDeleteRows = () => {
    if(newFlow) {
      let rowDataAfterDeleting = dcDetailsData.filter(
        (item) => !selectedDCRow.some((obj) => obj.key === item.key)
      );
      if (rowDataAfterDeleting.length === 0) {
        let initialRow = setInitialRowData();
        setDcDetailsData([initialRow]);
        setCounter(0);
      } else {
        let updateDcKeyOnDelete = rowDataAfterDeleting.map((item, i) => {
          return {
            ...item,
            key: i,
          };
        });
        setDcDetailsData(updateDcKeyOnDelete);
        setCounter(updateDcKeyOnDelete.length - 1);
      }
      agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
    } else {
      let rowDataAfterDeleting = dcDetailsData.filter(
        (item) => !selectedDCRow.some((obj) => obj.key === item.key)
      );
      if (rowDataAfterDeleting.length === 0) {
        let initialRow = [{ ...dcDetailsData[0], dc: [], key: 0, lead_time: "" }];
        setDcDetailsData(initialRow);
        setCounter(0);
      } else {
        let updateDcKeyOnDelete = rowDataAfterDeleting.map((item, i) => {
          return {
            ...item,
            key: i,
          };
        });
        setDcDetailsData(updateDcKeyOnDelete);
        setCounter(updateDcKeyOnDelete.length - 1);
      }
      agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
    }
  };

  const updateRowData = (data) => {
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
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;

    if(newFlow) {
      if (colDef.column_name === "lead_time") {
        data.lead_time = +newValue;
        agGridInstance.current.api.refreshCells({
          columns: ["lead_time"],
        });
        updateRowData(data);
      }

      if (
        data?.processing_time !== "" &&
        data.transit_time_og !== "" &&
        !skipLeadTimeProcessing
      ) {
        data.lead_time = +data.processing_time + +data.transit_time_og;
        agGridInstance.current.api.refreshCells({
          columns: ["lead_time"],
        });
        updateRowData(data);
      }
    } else {
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
    } // --
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
        {showStoreDetails && storeDetailsFormValues.retail_facility_code && (
          <StoreDetails data={storeDetails} />
        )}
        <Divider sx={{ my: 5 }} />
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
          <Divider sx={{ my: 5 }} />
          <div className={`${newStoreUi?globalClasses.flexRow : globalClasses.layoutAlignEnd} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginAround}`}>
            {newStoreUi &&
              <div>
                <Typography variant="h4">DC Info</Typography>
              </div>}
          <div className={classes.alignButtons}>
            <Button
              title="Add New DC"
              color="primary"
              variant="contained"
              id="store-details-add-dc-button"
              onClick={() => addNewRow()}
              disabled={enableAddDc || (dcDetailsData?.length >= props.newStoreDCDetails?.length)}
            >
              <AddIcon />
            </Button>
            <Button
              className={globalClasses.marginLeft1rem}
              title="Delete"
              color="primary"
              variant="contained"
              id="store-details-delete-dc-button"
              onClick={() => deletedSelectedDC()}
              disabled={enableAddDc}
            >
              <DeleteIcon />
            </Button>
            </div>
          </div>

          <div className={globalClasses.marginAround}>
            <AgGridComponent
              key={storeDetailsFormValues[props.storeCodeKeyName]}
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
            id="store-details-back-button"
            className={classes.setMarginForButtons}
            onClick={() => setShowGoBackDialog(true)}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            id="store-details-next-button"
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
            props.clearNewStoreDetails();
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
    finalStoreDetailsStateValues:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .finalStoreDetailsStateValues,
    inventorysmart_new_store_setup:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_new_store_setup,
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
