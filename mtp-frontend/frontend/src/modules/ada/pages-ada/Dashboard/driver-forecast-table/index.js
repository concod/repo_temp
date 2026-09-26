import React, { forwardRef, useEffect, useRef, useState } from "react";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import LoadingOverlay from "core/Utils/Loader/loader";
import { makeStyles } from "@mui/styles";
import { useDispatch, useSelector } from "react-redux";
import {
  chartDataPayload,
  getAllRows,
  isNumber,
  getRowDataPayload,
  resetActiveDeepDive,
} from "modules/ada/utils-ada/utilityFunctions";
import {
  getDriverForecastData,
  setIAInitialDriverForecastData,
  setInitialDriverForecastData,
  uploadDriversBulkData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { successHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import { cloneDeep } from "lodash";
import { binaryClosestIdx } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { Switch } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import { Button as IAButton, Panel } from "impact-ui";

import { useHistoricData } from "./useHistoricData";
import { setAllForecastMultiplierData } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import AllDriverForecastTableWrapper from "./AllDriverForecastTableWrapper";
import DragDropFileUpload from "core/commonComponents/dragDropFileUpload";
import {
  ADA_VISUAL_FILE_UPLOAD_INSTRUCTIONS,
  DOWNLOAD_TEMPLATE_FILENAME,
  DOWNLOAD_TEMPLATE_FILEPATH,
  FISCAL_KEY_MAPPING,
} from "modules/ada/constants-ada/stringContants";
import { driverForecastRowDataTransformer } from "modules/ada/utils-ada/formatData";

export const MIN = 0;
export const MAX = 95;
export const STEP = 5;

const DriverForecast = (props, ref) => {
  let {
    lastEditedDriversRef,
    editHierarchyInstance,
    editHierarchyChildInstance,
    editHierarchyTotalRowInstance,
    editHierarchyGrandChildInstance,
    editHierarchyChildTotalRowInstance,
    allEditedChildRowData,
    allEditedGrandChildRowData,
  } = ref;

  const classes = useStyles();

  const {
    activeKey,
    lastEditedDrivers,
    setLastEditedDrivers,
    allowEdit = true,
    showIAData,
    tabKey,
    id,
    accordionTitle,
  } = props;

  const globalClasses = globalStyles();
  let topGrid = useRef(null);
  let bottomGrid = useRef(null);
  let allDriverForecastRef = useRef(null);
  let promoTypeTableInstance = useRef(null);

  // To check for ForwardLooking Columns, in calculations
  let promoTypeColumnDataRef = useRef(null);

  // To revert to previous selection, if cancel clcked in dialog
  let lastSelectedPromoType = useRef();
  // To check if same value is selected again
  let currentSelectedPromoType = useRef();

  const [isApiSuccess, setIsApiSuccess] = useState(false);

  const [driverForecastLoader, setDriverForecastLoader] = useState(0);
  const [promoTypeRowData, setPromoTypeRowData] = useState([]);
  const [allDriverForecastRowData, setAllDriverForecastRowData] = useState([]);
  const [showPrevious, setShowPrevious] = useState(false);

  // Saving initial data to show on Click of Show Previous
  const [initialPromoTypeRowData, setInitialPromoTypeRowData] = useState([]);
  const [
    initialAllDriverForecastRowData,
    setInitialAllDriverForecastRowData,
  ] = useState([]);

  const dispatch = useDispatch();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const roundOffto5inIAtrue =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.nearest_multiple_of_five_for_ia_tab;

  useHistoricData(
    showIAData,
    allDriverForecastRef,
    initialPromoTypeRowData,
    promoTypeTableInstance,
    initialAllDriverForecastRowData,
    setDriverForecastLoader,
    allDriverForecastRowData,
    isApiSuccess
  );

  const fetchRowData = async (
    week,
    selected_promo_type = {
      label: "% Off",
      value: "promo_percentage",
    },
    promo_percentage = null,
    price_point = null,
    updatedLastEditedDrivers = lastEditedDrivers,
    isPromoWeek // for promo week i.e. RL, we need to call drivers api
  ) => {
    try {
      setDriverForecastLoader((prevState) => prevState + 1);

      const payload = chartDataPayload(adaReducer, null, null, showIAData);

      let rowDataPayload = getRowDataPayload(
        payload,
        updatedLastEditedDrivers,
        adaReducer,
        week,
        selected_promo_type,
        promo_percentage,
        price_point
      );
      rowDataPayload.isForecastSmart =
        adaReducer?.clientConfig?.attribute_value?.isForecastSmart || false;

      if (isPromoWeek) {
        let response = await getDriverForecastData(rowDataPayload);
        let formattedResponse = response?.data?.data || {};
        return formattedResponse;
      } else {
        let response = cloneDeep(
          driverForecastRowDataTransformer(
            adaReducer?.predictedFiscalWeeks,
            cloneDeep(adaReducer?.forecastAttributes),
            showIAData,
            adaReducer
          )
        );

        let formattedResponse = response || {};
        return formattedResponse;
      }
      // let response = await getDriverForecastData(rowDataPayload);
    } catch (error) {
      console.log("🚀 ~ fetchRowData ~ error:", error);
      // errorHandler(dispatch, error);
    } finally {
      setDriverForecastLoader((prevState) => prevState - 1);
    }
  };

  useEffect(() => {
    // will be removed once we do, promo percentage in array
    // driverForecastAllVal & driverForecastVal are there to make sure data resets on tab change of deep dive

    if (!activeKey) {
      return;
    }

    lastSelectedPromoType.current = {};
    currentSelectedPromoType.current = {};
    setIsApiSuccess(false);
    const getData = async () => {
      let formattedResponse = await fetchRowData();

      if (!formattedResponse?.length) {
        // setIsApiSuccss(true);

        return successHandler(dispatch, "No result found");
      }

      formattedResponse.forEach((elem) => {
        let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];
        for (let week of predictedFiscalWeeks) {
          if (!elem[week]) {
            if (elem[week] !== 0) {
              elem[week] = null;
            }
          }
        }
      });

      let totalPromoPercentage = 0;
      let allProductSum = 0;
      let newFormattedResponse = formattedResponse.find(
        (response) => response?.empty_obj === "product_count"
      );

      // In IA tab, we won't round off any values.
      // so, returning the default data from the api
      let isApiResolved =
        Object.keys(adaReducer?.forecastAttributes || {}).length > 0;

      if (!roundOffto5inIAtrue) {
        if (id === "IA") {
          let totalPromoPercentageIA = 0;
          let allProductSumIA = 0;
          for (let week in newFormattedResponse?.product_count) {
            if (typeof Number(week) === "number" && !isNaN(Number(week))) {
              totalPromoPercentageIA +=
                formattedResponse?.[2]?.product_count?.[week] *
                formattedResponse?.[1]?.[week];
              allProductSumIA += formattedResponse?.[2]?.product_count?.[week];
            }
          }
          if (formattedResponse?.[1]) {
            formattedResponse[1]["overall_value"] =
              totalPromoPercentageIA / allProductSumIA;
          }
          //For DG Client - Only "Effective Discount Percentage" is needed
          if (
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.show_only_effective_discount_percentage
          ) {
            setAllDriverForecastRowData([...formattedResponse?.slice(2, 3)]);
            setInitialAllDriverForecastRowData(
              cloneDeep(formattedResponse?.slice(2, 3))
            );
          } else {
            setAllDriverForecastRowData([...formattedResponse?.slice(1)]);
            setInitialAllDriverForecastRowData(
              cloneDeep(formattedResponse?.slice(1))
            );
          }
          setPromoTypeRowData(formattedResponse?.slice(0, 1));
          setInitialPromoTypeRowData(formattedResponse?.slice(0, 1));

          setTimeout(() => {
            setIsApiSuccess(isApiResolved);
          }, 500);
          dispatch(
            setIAInitialDriverForecastData(cloneDeep(formattedResponse?.[1]))
          );
          return;
        }
      }

      // for comparison tab, when user selects Adjusted/Scenario1 IA,
      dispatch(
        setIAInitialDriverForecastData(cloneDeep(formattedResponse?.[1]))
      );
      dispatch(setInitialDriverForecastData(cloneDeep(formattedResponse?.[1])));

      for (let week in newFormattedResponse?.product_count) {
        if (
          typeof Number(week) === "number" &&
          !isNaN(Number(week)) &&
          formattedResponse[1][week] !== undefined
        ) {
          totalPromoPercentage +=
            formattedResponse?.[2]?.product_count?.[week] *
            formattedResponse?.[1]?.[week];

          allProductSum += formattedResponse?.[2]?.product_count?.[week];
          if (formattedResponse[1][week] === null) {
            formattedResponse[1][week] = null;
          } else {
            let val = binaryClosestIdx(
              formattedResponse[1][week],
              MIN,
              MAX,
              STEP
            );
            formattedResponse[1][week] = val;
          }
        }
      }

      const discountValue = binaryClosestIdx(
        totalPromoPercentage / allProductSum,
        MIN,
        MAX,
        STEP
      );

      if (formattedResponse?.[1]?.["overall_value"]) {
        formattedResponse[1]["overall_value"] = discountValue;
      }

      //For DG Client - Only "Effective Discount Percentage" is needed
      if (
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_only_effective_discount_percentage
      ) {
        setAllDriverForecastRowData([...formattedResponse?.slice(2, 3)]);
        setInitialAllDriverForecastRowData(
          cloneDeep(formattedResponse?.slice(2, 3))
        );
      } else {
        setAllDriverForecastRowData([...formattedResponse?.slice(1)]);
        setInitialAllDriverForecastRowData(
          cloneDeep(formattedResponse?.slice(1))
        );
      }

      let driversInitialForecast = formattedResponse?.slice(1);
      setPromoTypeRowData(formattedResponse?.slice(0, 1));
      setInitialPromoTypeRowData(cloneDeep(formattedResponse?.slice(0, 1)));

      //For Upload Features
      let templateRows = driversInitialForecast.map((data) => ({
        drivers: data.drivers,
      }));
      setUploadTemplateRows(templateRows);

      setTimeout(() => {
        setIsApiSuccess(isApiResolved);
      }, 500);
    };

    getData();
  }, [adaReducer?.[id], JSON.stringify(adaReducer?.forecastAttributes)]);

  const onSingleEdit = async (
    selected = { value: "promo_percentage" },
    colData,
    newColId
  ) => {
    let enteredData = colData;
    let effectivePromoRowNode = allDriverForecastRef.current.api.getRowNode(
      "promo_percentage"
    );
    // let effectivePricePointRowNode = allDriverForecastRef.current.api.getRowNode(
    //   "price_point"
    // );

    // let minRowData = allDriverForecastRef.current.api.getRowNode("price_point")
    //   ?.data?.min_price;

    let rowNode = allDriverForecastRef.current.api.getRowNode("value");

    // let minColData = minRowData?.[newColId];

    enteredData = binaryClosestIdx(colData, MIN, MAX, STEP);

    const newDriverData = {
      fiscal_timeperiod_id: newColId,
      price_point: null,
      promo_percentage: enteredData,
      isActive: true,
    };

    const currentDrivers = lastEditedDriversRef?.current || [];

    const existingIndex = currentDrivers.findIndex(
      (driver) => driver.fiscal_timeperiod_id === newColId
    );

    let updatedLastEditedDrivers;

    if (existingIndex !== -1) {
      updatedLastEditedDrivers = currentDrivers.map((driver, index) => {
        if (index === existingIndex) {
          return {
            ...driver,
            promo_percentage: newDriverData.promo_percentage,
            isActive: true,
          };
        }
        return driver;
      });
    } else {
      // 2. Item Does Not Exist: Create a NEW array by spreading the old one
      updatedLastEditedDrivers = [...currentDrivers, newDriverData];
    }

    lastEditedDriversRef.current = cloneDeep(updatedLastEditedDrivers);

    if (adaReducer?.clientConfig?.attribute_value?.client === "Ralph Lauren") {
      const formattedResponse = await fetchRowData(
        newColId,
        selected,
        enteredData,
        null,
        updatedLastEditedDrivers,
        true
      );

      rowNode.setDataValue(newColId, enteredData);
      let promoDiscount = formattedResponse?.[1];
      let effectivePromo = formattedResponse?.[2];
      const updatedDriverForecast = cloneDeep(getAllRows(allDriverForecastRef));

      if (effectivePromoRowNode) {
        for (let key in effectivePromo || {}) {
          if (
            isNumber(key) ||
            adaReducer?.predictedFiscalWeeks?.includes(key)
          ) {
            updatedDriverForecast[1][key] = effectivePromo?.[key];

            if (promoDiscount.hasOwnProperty(key)) {
              updatedDriverForecast[0][key] = binaryClosestIdx(
                promoDiscount?.[key],
                MIN,
                MAX,
                STEP
              );
              rowNode.setDataValue(
                key,
                binaryClosestIdx(promoDiscount?.[key], MIN, MAX, STEP)
              );
            }
          }
        }

        effectivePromoRowNode.setData(updatedDriverForecast?.[1] || {});
      }
    } else {
      rowNode.setDataValue(newColId, enteredData);
      const updatedDriverForecast = cloneDeep(getAllRows(allDriverForecastRef));

      updatedDriverForecast[1][newColId] = enteredData;

      effectivePromoRowNode.setData(updatedDriverForecast?.[1] || {});
    }

    if (colData % STEP !== 0 || colData > MAX) {
      dispatch(
        addSnack({
          message: "Value has been set to closest possible integer",
          options: {
            variant: "info",
          },
        })
      );
    }

    let totalPromoPercentage = 0;
    let allProductSum = 0;

    // let totalPricePoint = 0;
    let updatedPromoData = effectivePromoRowNode?.data;
    // let updatedPPData = effectivePricePointRowNode?.data;
    let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];
    for (let week of predictedFiscalWeeks) {
      if (isNumber(week)) {
        allProductSum += updatedPromoData?.product_count[week];
        totalPromoPercentage +=
          updatedPromoData?.product_count[week] * updatedPromoData[week];
      }
    }
    const overallDiscountValue = totalPromoPercentage / allProductSum;

    if (effectivePromoRowNode) {
      effectivePromoRowNode.setDataValue("overall_value", overallDiscountValue);
      rowNode.setDataValue("overall_value", overallDiscountValue);
    }

    resetActiveDeepDive(
      editHierarchyTotalRowInstance,
      editHierarchyInstance,
      editHierarchyChildInstance,
      editHierarchyGrandChildInstance,
      editHierarchyChildTotalRowInstance,
      allEditedChildRowData,
      allEditedGrandChildRowData,
      adaReducer?.predictedFiscalWeeks
    );

    setLastEditedDrivers((prevState) => {
      let updatedData = cloneDeep(prevState);
      let currColumnIndex = updatedData.findIndex(
        (el) => el?.fiscal_timeperiod_id === newColId
      );
      if (isNumber(currColumnIndex)) {
        updatedData = updatedData.filter((_, i) => i !== currColumnIndex);
        updatedData = updatedData.map((elem) => {
          return { ...elem, isActive: false };
        });
      }
      return [
        ...updatedData,
        {
          fiscal_timeperiod_id: newColId,
          promo_percentage: null,
          price_point: null,
          [selected.value]: enteredData,
          selected_promo_type: selected.value,
          isActive: true,
        },
      ];
    });

    let allDriverForecastData = [];
    allDriverForecastRef.current.api.forEachNode((node) =>
      allDriverForecastData.push(node.data)
    );

    setAllDriverForecastRowData(allDriverForecastData);
  };

  const onBulkEdit = async (
    selected = { value: "promo_percentage" },
    colData
  ) => {
    try {
      const updatedDriverForecast = getAllRows(allDriverForecastRef);
      // const updatedPromoType = getAllRows(promoTypeTableInstance);

      let enteredData = colData;
      let effectivePromoRowNode = allDriverForecastRef.current.api.getRowNode(
        "promo_percentage"
      );
      // let effectivePricePointRowNode = allDriverForecastRef.current.api.getRowNode(
      //   "price_point"
      // );
      // let minRowData = allDriverForecastRef.current.api.getRowNode("price_point")
      //   ?.data?.min_price;

      let rowNode = allDriverForecastRef.current.api.getRowNode("value");

      enteredData = binaryClosestIdx(colData, MIN, MAX, STEP);

      if (colData % STEP !== 0 || colData > MAX) {
        dispatch(
          addSnack({
            message: "Value has been set to closest possible integer",
            options: {
              variant: "info",
            },
          })
        );
      }

      // let pp = selected?.value === "price_point" ? enteredData : null;
      let promoPercentage =
        selected?.value === "promo_percentage" ? enteredData : null;

      let formattedAdjustedPayload = [];

      let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];

      predictedFiscalWeeks?.forEach((elem) => {
        formattedAdjustedPayload.push({
          fiscal_timeperiod_id: +elem,
          promo_percentage: enteredData,
          selected_promo_type: "promo_percentage",
          isActive: true,
        });
      });

      let saveAllDriverForecastPayload = [];

      if (
        adaReducer?.clientConfig?.attribute_value?.client === "Ralph Lauren"
      ) {
        const formattedResponse = await fetchRowData(
          null,
          selected,
          enteredData,
          null,
          formattedAdjustedPayload,
          true
        );
        // rowNode.setDataValue(newColId, enteredData);
        let promoDiscount = formattedResponse?.[1];
        let effectivePromo = formattedResponse?.[2];
        const updatedDriverForecast = cloneDeep(
          getAllRows(allDriverForecastRef)
        );

        if (effectivePromoRowNode) {
          for (let key in effectivePromo || {}) {
            if (
              isNumber(key) ||
              adaReducer?.predictedFiscalWeeks?.includes(key)
            ) {
              updatedDriverForecast[1][key] = effectivePromo?.[key];

              if (promoDiscount.hasOwnProperty(key)) {
                updatedDriverForecast[0][key] = binaryClosestIdx(
                  promoDiscount?.[key],
                  MIN,
                  MAX,
                  STEP
                );
                rowNode.setDataValue(
                  key,
                  binaryClosestIdx(promoDiscount?.[key], MIN, MAX, STEP)
                );
              }

              saveAllDriverForecastPayload.push({
                fiscal_timeperiod_id: key,
                promo_percentage: enteredData,
                selected_promo_type: "promo_percentage",
                isActive: true,
              });
            }
          }

          effectivePromoRowNode.setData(updatedDriverForecast?.[1] || {});

          effectivePromoRowNode.setDataValue("overall_value", enteredData);
          rowNode.setDataValue("overall_value", enteredData);
        }
      } else {
        for (let key of predictedFiscalWeeks) {
          if (isNumber(key)) {
            // effectiveValue[key] = enteredData;
            effectivePromoRowNode.setDataValue(key, enteredData);
            rowNode.setDataValue(key, enteredData);
          }
        }

        effectivePromoRowNode.setDataValue("overall_value", enteredData);
        rowNode.setDataValue("overall_value", enteredData);

        for (let key of adaReducer?.predictedFiscalWeeks) {
          // Proceed if elem is a valid number & is not a cell of historic data

          if (isNumber(key)) {
            saveAllDriverForecastPayload.push({
              fiscal_timeperiod_id: key,
              // promo_percentage: null,
              // price_point: null,
              promo_percentage: enteredData,
              selected_promo_type: "promo_percentage",
              // selected_promo_type: selected.value,
              isActive: true,
            });
            // effectiveValue.overall_value = enteredData;
          }
          // lastSelectedData[key] = effectivePromoType.overall_value;
        }
      }

      if (id !== "IA") {
        dispatch(
          setAllForecastMultiplierData({
            key: id,
            value: {},
          })
        );
      }

      resetActiveDeepDive(
        editHierarchyTotalRowInstance,
        editHierarchyInstance,
        editHierarchyChildInstance,
        editHierarchyGrandChildInstance,
        editHierarchyChildTotalRowInstance,
        allEditedChildRowData,
        allEditedGrandChildRowData,
        adaReducer?.predictedFiscalWeeks
      );

      lastEditedDriversRef.current = cloneDeep(saveAllDriverForecastPayload);

      setLastEditedDrivers(cloneDeep(saveAllDriverForecastPayload));
      // setDriverForecastVal(null);
    } catch (error) {
      console.log("🚀 ~ onBulkEdit ~ error:", error);
    }
  };

  const onDriverForecastValueChange = async (colData, newColId, selected) => {
    if (newColId === "overall_value") {
      onBulkEdit(selected, colData);
    } else {
      onSingleEdit(selected, colData, newColId);
    }
  };

  //Upload feature
  const [isUploadSidepanelOpen, setIsUploadSidepanelOpen] = useState(false);
  const [uploadTemplateHeaders, setUploadTemplateHeaders] = useState([]);
  const [uploadTemplateRows, setUploadTemplateRows] = useState([]);
  const [uploadInstructions, setUploadInstructions] = useState([]);

  const handleCancelUpload = () => {
    setIsUploadSidepanelOpen(false);
  };

  const handleSaveUpload = () => {
    setIsUploadSidepanelOpen(false);
  };

  useEffect(() => {
    let instructionArray = [...ADA_VISUAL_FILE_UPLOAD_INSTRUCTIONS];
    let dateFormat =
      adaReducer?.clientConfig?.attribute_value?.upload_date_format;
    let instruction = `The valid date format for the start date and end date is ${dateFormat}`;
    instructionArray.push(instruction);
    setUploadInstructions(instructionArray);
  }, []);

  return (
    <div className={classes.driverForecastContainer}>
      <CustomAccordion
        label={accordionTitle ? accordionTitle : "Drivers of Forecast"}
      >
        <LoadingOverlay
          loader={driverForecastLoader || adaReducer?.loaderComponentCount}
          isCustomLoader={true}
        >
          {/* Upload Feature - Sidepanel */}
          <div
            className={`${globalClasses.panelWrapper} ${classes.panelContainer}`}
          >
            <Panel
              size="medium"
              isOpen={isUploadSidepanelOpen}
              onClose={handleCancelUpload}
              title="Bulk Promo Upload"
              primaryButtonProps={{
                children: "Save changes",
                onClick: handleSaveUpload,
              }}
              // tertiaryButtonProps={{
              //   children: "Cancel",
              //   onClick: handleCancelUpload,
              // }}
            >
              <DragDropFileUpload
                fileName={DOWNLOAD_TEMPLATE_FILENAME}
                filePath={DOWNLOAD_TEMPLATE_FILEPATH}
                templateHeaders={
                  adaReducer?.clientConfig?.attribute_value?.upload_file_header
                }
                fileValidationList={uploadInstructions}
                uploadBulkData={uploadDriversBulkData}
                acceptedFileTypes={[".xlsx", ".xlsm"]}
                downloadExcelFile={true}
              />
            </Panel>
          </div>

          {tabKey !== "IA" && (
            <div className={classes.customheader}>
              <div
                className={classNames(
                  globalClasses.flexRow,
                  globalClasses.verticalAlignCenter
                )}
              >
                {adaReducer?.clientConfig?.attribute_value
                  ?.show_initial_toggle_button && (
                  <div className={globalClasses.marginHorizontal}>
                    <Switch
                      id="isparent"
                      name="isparent"
                      checked={showPrevious}
                      value={showPrevious}
                      onChange={() => setShowPrevious(!showPrevious)}
                      rightLabel="Show Initial Values"
                    />
                  </div>
                )}

                {adaReducer?.clientConfig?.attribute_value
                  ?.show_upload_button && (
                  <IAButton
                    variant="primary"
                    id="priceUpload"
                    onClick={() => setIsUploadSidepanelOpen(true)}
                  >
                    Price upload
                  </IAButton>
                )}
              </div>
            </div>
          )}

          {/* <PromoTypeTable
            initialPromoTypeRowData={initialPromoTypeRowData}
            showPrevious={showPrevious}
            activeKey={activeKey}
            setDriverForecastLoader={setDriverForecastLoader}
            id={id}
            showIAData={showIAData}
            allowEdit={allowEdit}
            ref={{
              allDriverForecastRef,
              promoTypeTableInstance,
              bottomGrid,
              topGrid,
              lastSelectedPromoType,
              currentSelectedPromoType,
              promoTypeColumnDataRef,
            }}
            promoTypeRowData={promoTypeRowData}
            onDriverForecastValueChange={onDriverForecastValueChange}
            setUploadTemplateHeaders={setUploadTemplateHeaders}
          /> */}
          <AllDriverForecastTableWrapper
            setInitialAllDriverForecastRowData={
              setInitialAllDriverForecastRowData
            }
            setAllDriverForecastRowData={setAllDriverForecastRowData}
            initialAllDriverForecastRowData={initialAllDriverForecastRowData}
            showPrevious={showPrevious}
            activeKey={activeKey}
            setDriverForecastLoader={setDriverForecastLoader}
            id={id}
            showIAData={showIAData}
            allowEdit={allowEdit}
            ref={{
              allDriverForecastRef,
              promoTypeTableInstance,
              bottomGrid,
              topGrid,
            }}
            allDriverForecastRowData={allDriverForecastRowData}
            onDriverForecastValueChange={onDriverForecastValueChange}
            isApiSuccess={isApiSuccess}
            setIsApiSuccess={setIsApiSuccess}
          />
        </LoadingOverlay>
      </CustomAccordion>
    </div>
  );
};

export default forwardRef(DriverForecast);

const useStyles = makeStyles((theme) => ({
  driverForecastContainer: {
    display: "flex",
    flexDirection: "column",
  },
  customheader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    margin: "0.25rem 0 0.75rem",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));
