import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, cloneDeep } from "lodash";
import moment from "moment";

import globalStyles from "Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";

import {
  STORE_OPENING_FORM_CONSTANTS,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  USER_RESERVE_MANDATORY_FIELDS_MSG,
  RESERVATION_DATE_VALIDATION_MSG,
} from "../../constants-assortsmart/stringContants";

import { CONFIGUTATION_DASHBOARD } from "../../constants-assortsmart/routesContants";

import { getNewStoreListDetails } from "../../services-assortsmart/New-Store/new-store-details";

import { Prompt } from "impact-ui";

import { configureAttributeOptions } from "core/pages/store-grouping/components/common-functions";
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
import { Store } from "modules/assortsmart/constants-assortsmart/stringContants";
import { returnInArrayFormat } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { getCombinedCrossDimensionFiltersData } from "actions/filterAction";
import { useHistory } from "react-router";
import { configureOptions } from "../../pages-assortsmart/Plan-Dashboard/components/common-plan-functions";

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

const StoreDetails = (props) => {
  const history = useHistory();
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
  const [newStoreListItems, setNewStoreListItems] = useState([]);
  const [attributesArray, setAttributesArray] = useState([]);
  const [attributesList, setAttributesList] = useState([]);
  const [isLoading, setIsLoading] = useState([]);
  const globalClasses = globalStyles();
  const classes = useStyles();

  const getFilterDependency = (
    selectedOptions,
    planFields,
    index,
    showDimension
  ) => {
    if (selectedOptions) {
      let dependency = [];
      let isFilterEmpty = false;
      planFields.forEach((key, Idx) => {
        if (
          Store.__Non_Store_Attr_Arr.indexOf(key.accessor) === -1 &&
          selectedOptions[key.accessor] &&
          Idx <= index
        ) {
          if (isEmpty(selectedOptions[key.accessor])) {
            isFilterEmpty = true;
            return [];
          }
          let obj = {
            attribute_name: key.accessor,
            operator: "in",
            values: returnInArrayFormat(selectedOptions[key.accessor]),
            filter_type: key.filter_type || key.type || "cascaded",
            dimension: "store",
          };
          if (showDimension) {
            obj["dimension"] = "store";
          }
          dependency.push(obj);
        }
      });
      if (isFilterEmpty) {
        return [];
      }
      return dependency;
    } else {
      return [];
    }
  };

  const handleAttrsChange = async (
    updatedFormData,
    id,
    updatedStoreAttrFilterConfig,
    storeFilterConfig,
    setStoreAttrFilterConfigSelection,
    setStoreDetailsFormValues,
    attributesList,
    props,
    screen_name
  ) => {
    setIsLoading(true);
    const selectedAttrLvlIndex = Store.__Store_Attr_Info.findIndex((filter) => {
      return filter.column_name === id;
    });
    if (selectedAttrLvlIndex !== -1) {
      Store.__Store_Attr_Info.forEach((filter, idx) => {
        if (idx > selectedAttrLvlIndex) {
          if (!updatedFormData[filter.column_name] && updatedFormData[id]) {
            delete updatedFormData[filter.column_name];
          }
        }
      });
    }
    setStoreDetailsFormValues(updatedFormData);
    props.setNewStoreDetailsFormValues(updatedFormData);
    const Idx = storeFilterConfig.findIndex((filter) => {
      return filter.accessor === id;
    });
    let newdependency = getFilterDependency(
      updatedFormData,
      storeFilterConfig,
      Idx,
      true
    );
    let body = {
      attributes: attributesList,
      filter_type: "cascaded",
      filters: newdependency,
      is_urm_filter: true,
      screen_name: screen_name,
      application_code: 2,
    };
    setStoreAttrFilterConfigSelection([]);
    let filterElementsData = await getCombinedCrossDimensionFiltersData(body)();
    if (filterElementsData?.data?.data) {
      updatedStoreAttrFilterConfig.forEach((updatedData) => {
        Object.keys(filterElementsData?.data?.data).map((key) => {
          if (key === updatedData.accessor) {
            let options = configureOptions(filterElementsData?.data?.data[key]);
            updatedData.initialData = options;
            updatedData.options = options;
          }
          return updatedData;
        });
      });
    }
    setStoreAttrFilterConfigSelection(updatedStoreAttrFilterConfig);
    setIsLoading(false);
    return updatedStoreAttrFilterConfig;
  };

  useEffect(async () => {
    setIsLoading(true);
    let response = await props.getNewStoreListDetails();
    if (response?.data?.status) {
      const newStoreListItems = response?.data?.data;
      setNewStoreListItems(newStoreListItems);
      let listNewStores = newStoreListItems?.new_store_details;
      setListOfNewStores(listNewStores);
      let attributeArray = [],
        screen_name = "AssortDashboard";
      newStoreListItems?.new_store_form_config.forEach((lvl) => {
        if (lvl.dimension === "product" || lvl.dimension === "store") {
          lvl.dimension = lvl.dimension.toLowerCase();
          attributeArray.push(lvl);
        }
      });
      setAttributesArray(attributeArray);
      let attributesList = getfilterAttributeList(attributeArray);
      let body = {
        attributes: attributesList,
        filter_type: "cascaded",
        filters: [],
        is_urm_filter: true,
        screen_name,
        application_code: 2,
      };
      setAttributesList(attributesList);
      let filterElementsData = await getCombinedCrossDimensionFiltersData(
        body
      )();
      let newStoreFormConfiguration = newStoreListItems?.new_store_form_config?.map(
        (config) => {
          if (config.accessor === "store_code") {
            return {
              ...config,
              options: configureAttributeOptions(
                listNewStores.map((store) => store["store_code"])
              ),
              isMulti: false,
              isSearchable: true,
              isClearable: false,
            };
          } else if (config.dimension === "store") {
            let options = configureOptions(
              filterElementsData.data.data[config.accessor]
            );
            return {
              ...config,
              options: options,
              isMulti: false,
              isSearchable: true,
              isClearable: false,
            };
          }
          return {
            ...config,
            //dummy values as API for other fields is not ready once the api is ready will make multiple API calls to fetch option values
            options: configureAttributeOptions(
              listNewStores.map((store) => store["store_code"])
            ),
            isMulti: false,
            isSearchable: true,
            isClearable: false,
          };
        }
      );
      setStoreDetailsFormConfig(newStoreFormConfiguration);
      if (isEmpty(props.newStoreDetailsFormValues)) {
        let storeDetailsStateValues = {};
        if (newStoreListItems?.new_store_details?.length) {
          Object.keys(newStoreListItems?.new_store_details[0]).forEach(
            (key) => {
              storeDetailsStateValues[key] = "";
            }
          );
          setStoreDetailsFormValues(storeDetailsStateValues);
          props.setNewStoreDetailsFormValues(storeDetailsStateValues);
        } else {
          //needs to be called while integrating
          props.displaySnackMessages(NO_NEW_STORE_VALIDATION_MSG, "error");
        }
      }
    }
    setIsLoading(false);
  }, []);
  const handleChangeStoreDetails = async (
    updatedFormData,
    fieldType,
    id,
    field
  ) => {
    let selectedStoreData;
    if (fieldType === "store_code") {
      selectedStoreData = newStoreListItems?.new_store_details?.filter(
        (store) => {
          return store.store_code === updatedFormData.store_code;
        }
      )[0];
      setStoreDetailsFormValues(selectedStoreData);
      props.setNewStoreDetailsFormValues(selectedStoreData);
    }
    if (id.dimension === "store" || id.dimension === "Store") {
      let updatedConfig = await handleAttrsChange(
        updatedFormData,
        id.accessor,
        storeDetailsFormConfig,
        storeDetailsFormConfig,
        setStoreDetailsFormConfig,
        setStoreDetailsFormValues,
        attributesList,
        props,
        "AssortDashboard"
      );
    }
  };

  const handleChangeStoreOpeningDates = (updatedFormData, fieldType) => {
    if (fieldType === "reservation_start_date") {
      // store opening date should be greater than reservation date, hence we pass min starting date to Store opening date
      // all date validations are handled here
      let reservationDateFormatted = new Date(
        updatedFormData.reservation_start_date
      );
      reservationDateFormatted.setDate(reservationDateFormatted.getDate() + 1);
      storeOpeningDateFormConfig[0].minDate = reservationDateFormatted;
      setStoreOpeningDateFormConfig(storeOpeningDateFormConfig);
    }
    props.setStoreOpeningDate(updatedFormData);
    setOpeningDates(updatedFormData, console.log(openingDates));
  };

  const goToNextStep = () => {
    // Validation to check if all mandatory fields are filled
    let storeDetailsValidation = false;
    let openingDateValidation = false;
    storeDetailsValidation = Object.values(storeDetailsFormValues).some((val) =>
      isEmpty(val)
    );
    openingDateValidation = isEmpty(openingDates?.store_opening_date);
    if (storeDetailsValidation || openingDateValidation) {
      props.displaySnackMessages(USER_RESERVE_MANDATORY_FIELDS_MSG, "warning");
    } else if (
      new Date(openingDates.reservation_start_date) >
      new Date(openingDates.store_opening_date)
    ) {
      props.displaySnackMessages(RESERVATION_DATE_VALIDATION_MSG, "warning");
    }
    // Save the payload (store details) in reducer and navigate to next state, as the same payload is reused in the consecutive steps
    else {
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
      };
      props.mapSisterStores();
    }
  };

  return (
    <>
      <Loader loader={isLoading}>
        <div className={globalClasses.marginAround}>
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Store Attributes
          </Typography>
          <div className={globalClasses.marginAround}>
            {storeDetailsFormConfig && (
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={handleChangeStoreDetails}
                fields={storeDetailsFormConfig}
                updateDefaultValue={false}
                defaultValues={props.newStoreDetailsFormValues}
                labelWidthSpan={2}
                fieldTypeWidthSpan={6}
              ></Form>
            )}
          </div>

          <div className={globalClasses.marginVertical2rem}>
            <Typography
              variant="h4"
              className={globalClasses.paddingHorizontal}
            >
              Store Opening Info
            </Typography>
            <div className={globalClasses.marginAround}>
              {storeOpeningDateFormConfig && (
                <Form
                  layout={"vertical"}
                  maxFieldsInRow={5}
                  handleChange={handleChangeStoreOpeningDates}
                  fields={storeOpeningDateFormConfig}
                  updateDefaultValue={false}
                  defaultValues={props.storeOpeningDate}
                  labelWidthSpan={2}
                  fieldTypeWidthSpan={6}
                ></Form>
              )}
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
              history.push({
                pathname: CONFIGUTATION_DASHBOARD,
              });
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
    </>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewStoreDetailsScreenLoader: (body) =>
      dispatch(setNewStoreDetailsScreenLoader(body)),
    getNewStoreListDetails: () => dispatch(getNewStoreListDetails()),
    setNewStoreListItems: (body) => dispatch(setNewStoreListItems(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoreDetails);
