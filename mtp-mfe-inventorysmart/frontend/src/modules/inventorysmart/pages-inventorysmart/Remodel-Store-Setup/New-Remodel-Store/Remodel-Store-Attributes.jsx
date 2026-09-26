import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { Prompt, Button, useTranslation } from "impact-ui-v3";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import {Typography,Container } from "@mui/material";
import Form from "core/Utils/form";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import { configureAttributeOptions } from "../../inventorysmart-utility.js";
import {
  NO_NEW_LEGACY_STORE_VALIDATION_MSG,
  REMODEL_RESERVATION_STORE_OPENING_GAP_VALIDATION_MSG,
  FILL_MANDATORY_FIELDS,
  REMODEL_STORE_LEGACY_CLOSING_DATE_VALIDATION,
  REMODEL_STORE_TEMP_OPENING_DATE_VALIDATION,
  REMODEL_STORE_TEMP_OPEN_DATE_MAX_VALIDATION,
  REMODEL_STORE_TEMP_CLOSING_DATE_VALIDATION,
  REMODEL_STORE_RESERVATION_DATE_VALIATION,
  GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE,
  common,
} from "../../../constants-inventorysmart/stringConstants";
import {
  NEW_REMODEL_STORE,
  CONFIGURATION,
} from "../../../constants-inventorysmart/routesConstants";
import {
  setRemodelStoreDetailsForBackFlow,
  setRemodelStoreListDetails,
  fetchRemodelStoreList,
  setRemodelStoreAttributesLoader,
  clearRemodelStoreAttributesDetails,
  fetchRemodelIndividualStoreList,
} from "modules/inventorysmart/services-inventorysmart/Remodel-Store/remodel-store-attributes";
import { formatDate } from "./remodel-store-utils.js";
import { clearRemodelStoreDashboard } from "../../../services-inventorysmart/Remodel-Store/remodel-store-dashboard";
import { replaceSpecialCharacter } from "core/Utils/functions/utils.js";
import {Divider} from "@mui/material";
const useStyles = makeStyles((theme) => ({
  button: {
    margin: `0 ${theme.typography.pxToRem(5)}`,
    "&:nth-of-type(1)": {
      marginLeft: 0,
    },

    "&:last-child()": {
      marginRight: 0,
    },
  },
  divBgColor: {
    backgroundColor: theme.palette.common.white,
    borderRadius: "8px",
  },
  marginBottomDiv: {
    marginBottom: "calc(80px + 3rem)",
  },
  stickyFooter: {
    position: "fixed",
    bottom: "0",
    backgroundColor: "white",
    left: "60px" /* Align with the sidebar width */,
    width: "calc(100% - 60px)",
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
    borderTop: "1px solid #E0E0E0",
    zIndex: 1,
  },
}));

const RemodelStoreAttributesComponent = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const [listOfNewStores, setListOfNewStores] = useState([]);
  const [legacyStoreFormConfig, setLegacyStoreFormConfig] = useState([]);
  const [tempStoreFormConfig, setTempStoreFormConfig] = useState([]);
  const [remodelStoreFormConfig, setRemodelStoreFormConfig] = useState([]);
  const [
    legacyStoreDetailsFormFields,
    setLegacyStoreDetailsFormFields,
  ] = useState({});
  const [tempStoreDetailsFormFields, setTempStoreDetailsFormFields] = useState(
    {}
  );
  const [
    remodelStoreDetailsFormFields,
    setRemodelStoreDetailsFormFields,
  ] = useState({});
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [disableNext, setDisableNext] = useState(false);

  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const edit_store_id = location.state;

  const createFormConfigDynamically = (listNewStores, formConfigList) => {
    let formConfig = formConfigList?.map((config) => {
      if (
        config.accessor === "store_code" ||
        config.accessor === "temp_store_code" ||
        config.accessor === "remodel_store_code"
      ) {
        // make sure options remain unique - create a set TODO later when data is inserted properly
        return {
          ...config,
          options: configureAttributeOptions(
            listNewStores.map((store) => store[config.accessor])
          ),
          isMulti: false,
          isSearchable: true,
          isClearable: false,
        };
      } else if (config.field_type === "DateTimeField") {
        return {
          ...config,
          disablePast: true,
          disableFuture: false,
          minDate: "",
          maxDate: "",
        };
      } else {
        return config;
      }
    });
    return formConfig;
  };

  useEffect(() => {
    const fetchRemodelStoreDetails = async () => {
      props.setRemodelStoreAttributesLoader(true);
      try {
        if (!props.editRemodelStoreData) {
          let response = await props.fetchRemodelStoreList();
          props.setRemodelStoreListDetails(response.data?.data);
        } else {
          // set this for edit flow, new API to be called
          let response = await props.fetchRemodelIndividualStoreList(
            edit_store_id
          );
          props.setRemodelStoreListDetails(response.data?.data);
        }
        props.setRemodelStoreAttributesLoader(false);
      } catch (e) {
        setDisableNext(true);
        props.setRemodelStoreAttributesLoader(false);
        props.handleErrorMessage(e);
      }
    };
    fetchRemodelStoreDetails();
  }, [props.editRemodelStoreData, edit_store_id]);

  useEffect(() => {
    if (!isEmpty(props.remodelStoreListDetails)) {
      if (props.remodelStoreListDetails?.store_details?.length) {
        let listNewStores = [...props.remodelStoreListDetails.store_details];
        setListOfNewStores(listNewStores);
        let legacyStoreFormConfiguration = createFormConfigDynamically(
          listNewStores,
          props.remodelStoreListDetails?.legacy_store_form_config
        );
        setLegacyStoreFormConfig(legacyStoreFormConfiguration);
        let tempStoreFormConfiguration = createFormConfigDynamically(
          listNewStores,
          props.remodelStoreListDetails?.temp_store_form_config
        );
        setTempStoreFormConfig(tempStoreFormConfiguration);
        let remodelStoreFormConfiguration = createFormConfigDynamically(
          listNewStores,
          props.remodelStoreListDetails?.remodel_store_form_config
        );
        setRemodelStoreFormConfig(remodelStoreFormConfiguration);
        setDisableNext(false);
      } else {
        setDisableNext(true);
        props.displaySnackMessages(
          NO_NEW_LEGACY_STORE_VALIDATION_MSG,
          "warning"
        );
      }
    }
  }, [props.remodelStoreListDetails]);

  /**
   * Initializes form fields based on the provided form configuration and saved details.
   *
   * @param {Array} formConfig - The configuration array for the form fields.
   * @param {Object} savedDetails - The object containing saved details for the form fields.
   * @returns {Object} An object representing the initialized form fields.
   */
  const initializeFormFields = (formConfig, savedDetails) => {
    let formFields = {};
    if (formConfig.length) {
      // backflow from step 2 or edit flow - Pre populate the form fields with the saved details
      if (
        (props.screenNameNavigatedFrom === "manage-demand" ||
          !isEmpty(props.remodelStoreDetailsForEditFlow)) &&
        !isEmpty(savedDetails)
      ) {
        formConfig.forEach((form) => {
          formFields[form.accessor] = replaceSpecialCharacter(
            savedDetails[form.accessor]
          );
        });
      }
      // On initial render - Initialize the form fields with empty values
      else {
        formConfig.forEach((form) => {
          formFields[form.accessor] = "";
        });
      }
    }
    return formFields;
  };

  useEffect(() => {
    if (
      isEmpty(legacyStoreDetailsFormFields) &&
      isEmpty(tempStoreDetailsFormFields) &&
      isEmpty(remodelStoreDetailsFormFields) &&
      !isEmpty(legacyStoreFormConfig) &&
      !isEmpty(tempStoreFormConfig) &&
      !isEmpty(remodelStoreFormConfig)
    ) {
      const editFlow = !isEmpty(props.remodelStoreDetailsForEditFlow);
      const initializeFormFieldsData =
        isEmpty(props.saveRemodelStoreDetailsForBackFlow) && editFlow
          ? props.remodelStoreDetailsForEditFlow
          : props.saveRemodelStoreDetailsForBackFlow;
      setLegacyStoreDetailsFormFields(
        initializeFormFields(
          legacyStoreFormConfig,
          initializeFormFieldsData?.legacy_store_details
        )
      );
      setTempStoreDetailsFormFields(
        initializeFormFields(
          tempStoreFormConfig,
          initializeFormFieldsData?.temp_store_details
        )
      );
      setRemodelStoreDetailsFormFields(
        initializeFormFields(
          remodelStoreFormConfig,
          initializeFormFieldsData?.remodel_store_details
        )
      );
    }
  }, [
    legacyStoreFormConfig,
    tempStoreFormConfig,
    remodelStoreFormConfig,
    props.saveRemodelStoreDetailsForBackFlow,
    legacyStoreDetailsFormFields,
    tempStoreDetailsFormFields,
    remodelStoreDetailsFormFields,
    props.remodelStoreDetailsForEditFlow,
  ]);

  const handleChangeLegacyStoreDetails = (updatedFormData, fieldType) => {
    if (fieldType === "store_code") {
      const selectedStore = listOfNewStores.find(
        (store) => store.store_code === updatedFormData.store_code
      );
      if (selectedStore) {
        const updatedLegacyFields = { ...legacyStoreDetailsFormFields };
        Object.keys(updatedLegacyFields).forEach((key) => {
          if (selectedStore[key] !== undefined) {
            updatedLegacyFields[key] = replaceSpecialCharacter(selectedStore[key]);
          }
        });
        setLegacyStoreDetailsFormFields(updatedLegacyFields);

        const updatedTempFields = { ...tempStoreDetailsFormFields };
        Object.keys(updatedTempFields).forEach((key) => {
          if (selectedStore[key] !== undefined) {
            updatedTempFields[key] = replaceSpecialCharacter(selectedStore[key]);
          }
        });
        setTempStoreDetailsFormFields(updatedTempFields);
      }
      // Validation - Temp Effective date should always be lesser than Legacy closing date, we set min date for Legacy closing date as this field is editable and temp effective auto populates and is disabled
      let legacyStoreClosingDateStartValue = new Date(
        selectedStore.temp_store_effective_date
      );
      legacyStoreClosingDateStartValue.setDate(
        legacyStoreClosingDateStartValue.getDate() + 1
      );
      legacyStoreFormConfig[1].minDate = legacyStoreClosingDateStartValue;

      // Set the max value for legacy store closing as based on this we set the min date for Temp Store opening date whose max value is one day prior to remodel effective date
      let legacyStoreClosingDateEndValue = new Date(
        selectedStore.remodel_store_effective_date
      );
      legacyStoreClosingDateEndValue.setDate(
        legacyStoreClosingDateEndValue.getDate() - 2
      );
      legacyStoreFormConfig[1].maxDate = legacyStoreClosingDateEndValue;
      setLegacyStoreFormConfig(legacyStoreFormConfig);

      // Temp Open date should be prior to Remodel Effective date.
      let tempStoreOpeningEndValue = new Date(
        selectedStore.remodel_store_effective_date
      );
      tempStoreOpeningEndValue.setDate(tempStoreOpeningEndValue.getDate() - 1);
      tempStoreFormConfig[2].maxDate = tempStoreOpeningEndValue;

      let tempStoreClosingStartValue = new Date(
        selectedStore.remodel_store_effective_date
      );
      tempStoreClosingStartValue.setDate(
        tempStoreClosingStartValue.getDate() + 1
      );
      tempStoreFormConfig[3].minDate = tempStoreClosingStartValue;

      // Temp closing date should be one day prior to Remodel Open date.
      let tempStoreClosingEndValue = new Date(selectedStore.remodel_open_date);
      tempStoreClosingEndValue.setDate(tempStoreClosingEndValue.getDate() - 1);
      tempStoreFormConfig[3].maxDate = tempStoreClosingEndValue;
      setTempStoreDetailsFormFields((prevState) => ({
        ...prevState,
        temp_store_closing_date: "",
      }));
      setTempStoreFormConfig(tempStoreFormConfig);
    } else {
      // Legacy closing date should be one day prior to Temp Open date. Based on legacy close date, set the min date for Temp Open date field
      if (fieldType === "store_closing_date") {
        let tempStoreOpeningDateStartValue = new Date(
          updatedFormData.store_closing_date
        );
        tempStoreOpeningDateStartValue.setDate(
          tempStoreOpeningDateStartValue.getDate() + 1
        );
        tempStoreFormConfig[2].minDate = tempStoreOpeningDateStartValue;
        setTempStoreFormConfig(tempStoreFormConfig);
        // resetting it as we set a new min Date for tempStoreOpeningDateStartValue in the above line
        setTempStoreDetailsFormFields((prevState) => ({
          ...prevState,
          temp_store_opening_date: "",
        }));
      }
      setLegacyStoreDetailsFormFields(updatedFormData);
    }
  };

  const handleChangeTempStoreDetails = (updatedFormData, fieldType) => {
    setTempStoreDetailsFormFields(updatedFormData);
  };

  const setTempOpeningDateFieldBasedOnRemodelStore = (updatedFormData) => {
    let tempStoreOpeningEndValue = new Date(
      updatedFormData.remodel_store_effective_date
    );
    tempStoreOpeningEndValue.setDate(tempStoreOpeningEndValue.getDate() - 1);
    tempStoreFormConfig[2].maxDate = tempStoreOpeningEndValue;
    setTempStoreDetailsFormFields((prevState) => ({
      ...prevState,
      temp_store_opening_date: "",
    }));
    setTempStoreFormConfig(tempStoreFormConfig);
  };

  const setTempClosingDateFieldBasedOnRemodelStore = (updatedFormData) => {
    let tempStoreClosingStartValue = new Date(
      updatedFormData.remodel_store_effective_date
    );
    tempStoreClosingStartValue.setDate(
      tempStoreClosingStartValue.getDate() + 1
    );
    tempStoreFormConfig[3].minDate = tempStoreClosingStartValue;
    let tempStoreClosingEndValue = new Date(updatedFormData.remodel_open_date);
    tempStoreClosingEndValue.setDate(tempStoreClosingEndValue.getDate() - 1);
    tempStoreFormConfig[3].maxDate = tempStoreClosingEndValue;
    setTempStoreDetailsFormFields((prevState) => ({
      ...prevState,
      temp_store_closing_date: "",
    }));
    setTempStoreFormConfig(tempStoreFormConfig);
  };

  const handleChangeRemodelStoreDetails = (updatedFormData, fieldType) => {
    if (fieldType === "remodel_store_code") {
      const selectedStore = listOfNewStores.find(
        (store) =>
          store.remodel_store_code === updatedFormData.remodel_store_code
      );
      let reservationDateStartValue = new Date(
        selectedStore.remodel_store_effective_date
      );
      reservationDateStartValue.setDate(
        reservationDateStartValue.getDate() + 1
      );
      // min value of reservation date should be one day after remodel effective date
      remodelStoreFormConfig[2].minDate = reservationDateStartValue;
      setRemodelStoreFormConfig(remodelStoreFormConfig);
      updatedFormData.remodel_reservation_start_date = "";
      setRemodelStoreDetailsFormFields(updatedFormData);
      if (selectedStore) {
        const updatedRemodelFields = { ...remodelStoreDetailsFormFields };
        Object.keys(updatedRemodelFields).forEach((key) => {
          if (selectedStore[key] !== undefined) {
            updatedRemodelFields[key] = replaceSpecialCharacter(selectedStore[key]);
          }
        });
        const openDate = new Date(selectedStore?.remodel_open_date);
        const twoWeeksOldDate = new Date(openDate);
        twoWeeksOldDate.setDate(openDate.getDate() - 14);
        const formattedDate = twoWeeksOldDate.toISOString().split("T")[0];
        updatedRemodelFields["remodel_reservation_start_date"] = formattedDate;
        remodelStoreFormConfig[3].minDate = openDate;
        setRemodelStoreFormConfig(remodelStoreFormConfig);
        setRemodelStoreDetailsFormFields(updatedRemodelFields);
        setTempClosingDateFieldBasedOnRemodelStore(selectedStore);
        setTempOpeningDateFieldBasedOnRemodelStore(selectedStore);
      }
    } else {
      if (fieldType === "remodel_reservation_start_date") {
        // store opening date should be greater than reservation date, hence we pass min starting date to Store opening date
        let reservationDateFormatted = new Date(
          updatedFormData.remodel_reservation_start_date
        );
        reservationDateFormatted.setDate(
          reservationDateFormatted.getDate() + 1
        );
        remodelStoreFormConfig[3].minDate = reservationDateFormatted;
        setRemodelStoreFormConfig(remodelStoreFormConfig);
        // resetting it as we set a new min Date for store_opening_date in the above line
        updatedFormData.remodel_open_date = "";
      }
      // Temp closing date should be one day prior to Remodel Open date.
      if (fieldType === "remodel_open_date") {
        setTempClosingDateFieldBasedOnRemodelStore(updatedFormData);
      }
      setRemodelStoreDetailsFormFields(updatedFormData);
    }
  };

  const hasEmptyFields = (formFields) => {
    // Iterate over the keys of the object
    for (let key in formFields) {
      // Check if the value is empty (null, undefined, or empty string)
      if (
        formFields[key] === null ||
        formFields[key] === undefined ||
        formFields[key] === ""
      ) {
        return true;
      }
    }
    return false;
  };

  const goToNextStep = () => {
    // Validations to check for empty fields
    let legacyStoreValidation = false,
      tempStoreValidation = false,
      remodelStoreValidation = false;
    const formatFormFields = (formFields) => {
      let formattedFields = { ...formFields };
      Object.keys(formFields).forEach((key) => {
        if (moment.isMoment(formFields[key])) {
          formattedFields[key] = formatDate(formFields[key]);
        }
      });
      return formattedFields;
    };

    const legacyStoreDetailsFormFieldsFormatted = formatFormFields(
      legacyStoreDetailsFormFields
    );
    const tempStoreDetailsFormFieldsFormatted = formatFormFields(
      tempStoreDetailsFormFields
    );
    const remodelStoreDetailsFormFieldsFormatted = formatFormFields(
      remodelStoreDetailsFormFields
    );
    legacyStoreValidation = hasEmptyFields(
      legacyStoreDetailsFormFieldsFormatted
    );
    tempStoreValidation = hasEmptyFields(tempStoreDetailsFormFieldsFormatted);
    remodelStoreValidation = hasEmptyFields(
      remodelStoreDetailsFormFieldsFormatted
    );
    const reservationDate =
      remodelStoreDetailsFormFieldsFormatted?.remodel_reservation_start_date &&
      new Date(
        remodelStoreDetailsFormFieldsFormatted?.remodel_reservation_start_date
      );
    const storeOpeningDate =
      remodelStoreDetailsFormFieldsFormatted?.remodel_open_date &&
      new Date(remodelStoreDetailsFormFieldsFormatted?.remodel_open_date);
    const timeDifference = storeOpeningDate - reservationDate;
    // Convert the difference from milliseconds to days
    const dayDifference = timeDifference / (1000 * 60 * 60 * 24);
    if (
      legacyStoreValidation ||
      tempStoreValidation ||
      remodelStoreValidation
    ) {
      props.displaySnackMessages(FILL_MANDATORY_FIELDS, "warning");
    } else if (dayDifference > 90) {
      props.displaySnackMessages(
        REMODEL_RESERVATION_STORE_OPENING_GAP_VALIDATION_MSG,
        "warning"
      );
    } else if (
      legacyStoreDetailsFormFieldsFormatted.store_closing_date <
        tempStoreDetailsFormFieldsFormatted.temp_store_effective_date ||
      tempStoreDetailsFormFieldsFormatted.temp_store_opening_date <
        tempStoreDetailsFormFieldsFormatted.temp_store_effective_date
    ) {
      props.displaySnackMessages(
        REMODEL_STORE_LEGACY_CLOSING_DATE_VALIDATION,
        "warning"
      );
    } else if (
      legacyStoreDetailsFormFieldsFormatted.store_closing_date >
      tempStoreDetailsFormFieldsFormatted.temp_store_opening_date
    ) {
      props.displaySnackMessages(
        REMODEL_STORE_TEMP_OPENING_DATE_VALIDATION,
        "warning"
      );
    } else if (
      tempStoreDetailsFormFieldsFormatted.temp_store_opening_date >
      remodelStoreDetailsFormFieldsFormatted.remodel_store_effective_date
    ) {
      props.displaySnackMessages(
        REMODEL_STORE_TEMP_OPEN_DATE_MAX_VALIDATION,
        "warning"
      );
    } else if (
      tempStoreDetailsFormFieldsFormatted.temp_store_closing_date >
        remodelStoreDetailsFormFieldsFormatted.remodel_open_date ||
      tempStoreDetailsFormFieldsFormatted.temp_store_closing_date <
        remodelStoreDetailsFormFieldsFormatted.remodel_store_effective_date
    ) {
      props.displaySnackMessages(
        REMODEL_STORE_TEMP_CLOSING_DATE_VALIDATION,
        "warning"
      );
    } else if (
      remodelStoreDetailsFormFieldsFormatted.remodel_reservation_start_date <
        remodelStoreDetailsFormFieldsFormatted.remodel_store_effective_date ||
      remodelStoreDetailsFormFieldsFormatted.remodel_reservation_start_date >
        remodelStoreDetailsFormFieldsFormatted.remodel_open_date
    ) {
      props.displaySnackMessages(
        REMODEL_STORE_RESERVATION_DATE_VALIATION,
        "warning"
      );
    } else {
      let body = {
        legacy_store_details: legacyStoreDetailsFormFieldsFormatted,
        temp_store_details: tempStoreDetailsFormFieldsFormatted,
        remodel_store_details: remodelStoreDetailsFormFieldsFormatted,
      };
      props.setRemodelStoreDetailsForBackFlow(body);
      // to go to next step
      props.goToManageDemandScreen();
    }
  };

  return (
    <>
    <Loader loader={props.remodelStoreAttributesLoader}>
        {!isEmpty(props.remodelStoreListDetails) && (
          <>
            {disableNext ? (
              <div className={globalClasses.marginAround}>
              <Typography
                variant="h4"
                className={globalClasses.paddingHorizontal}
              >
                No Legacy Stores available to setup Remodel Store
              </Typography>
              </div>
            ) : (
              <>
              <div className={`${globalClasses.evenPaddingAround} ${classes.divBgColor} ${globalClasses.tableWrapper} ${classes.marginBottomDiv}`}>
                   <b>Legacy Store Attributes</b>
                <div className={globalClasses.marginVertical1rem}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={4}
                    handleChange={handleChangeLegacyStoreDetails}
                    fields={legacyStoreFormConfig}
                    updateDefaultValue={false}
                    defaultValues={legacyStoreDetailsFormFields}
                    labelWidthSpan={2}
                    fieldTypeWidthSpan={6}
                  ></Form>
                </div>
                <Divider className={globalClasses.marginVertical2rem} />
                <b>Temp Store Attributes</b>
                <div className={globalClasses.marginVertical1rem}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={4}
                    handleChange={handleChangeTempStoreDetails}
                    fields={tempStoreFormConfig}
                    updateDefaultValue={false}
                    defaultValues={tempStoreDetailsFormFields}
                    labelWidthSpan={2}
                    fieldTypeWidthSpan={6}
                  ></Form>
                </div>
                <Divider className={globalClasses.marginVertical2rem} />
                <b>Remodel Store Attributes</b>
                <div className={globalClasses.marginVertical1rem}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={4}
                    handleChange={handleChangeRemodelStoreDetails}
                    fields={remodelStoreFormConfig}
                    updateDefaultValue={false}
                    defaultValues={remodelStoreDetailsFormFields}
                    labelWidthSpan={2}
                    fieldTypeWidthSpan={6}
                  ></Form>
                </div>
                </div>
              </>
            )}
          </>
        )}
        <Prompt
          isOpen={showGoBackDialog}
          title={t("inventorysmart.goBack")}
          primaryButtonLabel={common.__ConfirmBtnText}
          onPrimaryButtonClick={() => {
              navigate(CONFIGURATION, {
                state: NEW_REMODEL_STORE,
              });
              props.clearRemodelStoreDashboard();
              props.clearRemodelStoreAttributesDetails();
              setShowGoBackDialog(false);
          }}
          secondaryButtonLabel={common.__RejectBtnText}
          onSecondaryButtonClick={() => setShowGoBackDialog(false)}
          handleClose={() => setShowGoBackDialog(false)}
          variant="error"
        >
          {GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE}
       </Prompt>
    </Loader>
      <div className={`${classes.stickyFooter}`}>
        <Button
          variant="tertiary"
          id="store-details-back-button"
          onClick={() => setShowGoBackDialog(true)}
          size="large"
        >
          {"< Back to Configuration"}
        </Button>
        <Button
          variant="primary"
          id="store-details-next-button"
          disabled={disableNext}
          onClick={() => goToNextStep()}
          size="large"
        >
          {"Go to Manage Demand >"}
        </Button>
      </div>

    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    remodelStoreAttributesLoader:
      inventorysmartReducer.remodelStoreAttributesService
        .remodelStoreAttributesLoader,
    saveRemodelStoreDetailsForBackFlow:
      inventorysmartReducer.remodelStoreAttributesService
        .saveRemodelStoreDetailsForBackFlow,
    remodelStoreListDetails:
      inventorysmartReducer.remodelStoreAttributesService
        .remodelStoreListDetails,
    remodelStoreDetailsForEditFlow:
      inventorysmartReducer.inventorySmartRemodelStoreDashboardService
        .remodelStoreDetailsForEditFlow,
    editRemodelStoreData:
      inventorysmartReducer.inventorySmartRemodelStoreDashboardService
        .editRemodelStoreData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setRemodelStoreDetailsForBackFlow: (payload) =>
      dispatch(setRemodelStoreDetailsForBackFlow(payload)),
    setRemodelStoreAttributesLoader: (payload) =>
      dispatch(setRemodelStoreAttributesLoader(payload)),
    setRemodelStoreListDetails: (payload) =>
      dispatch(setRemodelStoreListDetails(payload)),
    fetchRemodelStoreList: () => dispatch(fetchRemodelStoreList()),
    clearRemodelStoreAttributesDetails: () =>
      dispatch(clearRemodelStoreAttributesDetails()),
    fetchRemodelIndividualStoreList: (body) =>
      dispatch(fetchRemodelIndividualStoreList(body)),
    clearRemodelStoreDashboard: () => dispatch(clearRemodelStoreDashboard()),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RemodelStoreAttributesComponent);
