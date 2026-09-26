import React, { useEffect, useState } from "react";
import { Panel, Button } from "impact-ui-v3";
import { Divider } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import Select from "core/Utils/select";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import GenericCardsPanel from "../../KPI/GenericCardPanel";
import IAForecastIcon from "assets/IS_icons/IS_IA_forecast.svg";
import AdjustedForecastIcon from "assets/IS_icons/IS_Adjusted_forecast.svg";
import ReviewForecastChart from "./ReviewForecastChart";
import {
  fetchFilterConfig
} from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { getReviewForecastData } from "../../../services-inventorysmart/Create-Allocation/create-allocation-services";
import {isEmpty} from "lodash";

const ReviewForecastPanel = (props) => {
  const { reviewForcastHandler, selectedRows, closePanel, articleKey, showReviewForecast, selectedFilters, epLabel, exlcudeStoreFilter } = props;

  const defaultFilters = [
    { label: articleKey.charAt(0).toUpperCase() + articleKey.slice(1), column_name: articleKey, dimension: "product" },
    { label: "Store Name", is_multiple_selection: true, column_name: "store_name", dimension: "store", type: "cascaded" },
    { label: "SKU", is_multiple_selection: true, column_name: "size", dimension: "product", type: "cascaded" },
  ];

  const [filterConfg, setFilterConfg] = useState();
  const [filters, setFilters] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedArticle, setSelectedArticle] = useState({});
  const [articleOptions, setArticleOptions] = useState([]);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [filterLoader, setFilterLoader] = useState(true);
  const [dataLoader, setDataLoader] = useState(true);
  const [forecastData, setForecastData] = useState({});
  const [cardData, setCardData] = useState(null);


  useEffect(() => {
    let iaForecast = 0;
    let finalForecast = 0;
    if (forecastData?.forecast_data) {
      const { forecast_data, current_week_id } = forecastData;
      // Get all weeks after current_week_id based on object order
      const entries = Object.entries(forecast_data);
      const currentWeekIndex = entries.findIndex(([weekId]) => weekId === current_week_id?.toString());
      const futureWeeks = currentWeekIndex !== -1 ? entries.slice(currentWeekIndex + 1) : entries;
      const finalOrAdjustKey = epLabel ? "final_forecast" : "adj_user_forecast";
      iaForecast = futureWeeks.reduce((acc, [, data]) => acc + (data?.ia_original_forecast ?? 0), 0);
      finalForecast = futureWeeks.reduce((acc, [, data]) => acc + (data?.[finalOrAdjustKey] ?? 0), 0);
    }
    setCardData({
      noSubMetrics: true,
      panelHeader: "Aggregated forecast over next 8 weeks",
      cardData: [{
        label: "IA Forecast",
        value: iaForecast ? iaForecast.toFixed(0) : 0,
        renderIcon: () => <IAForecastIcon />
      },
      {
        label: epLabel ? "Final forecast" : "Adjusted Forecast",
        value: finalForecast ? finalForecast.toFixed(0) : 0,
        renderIcon: () => <AdjustedForecastIcon />
      }]
    })
  }, [forecastData]);


  const classes = useStyles();
  const globalClasses = globalStyles();

  const customClasses = {
    icon_container: classes.icon_container,
    flex: globalClasses.flex
  }

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    const fetchFilters = async () => {
      let filterConfig;
      try {
        const response = await fetchFilterConfig(
          "Inventorysmart Review Forecast Side Panel"
        );

        // Update filter configuration if remote config is available
        filterConfig = response ?? defaultFilters;
        setFilterConfg(filterConfig);
      } catch (e) {
        filterConfig = defaultFilters;
        setFilterConfg(filterConfig);
        handleErrorMessage(e);
        // Continue with default filters on error
      }

      // Create article options from selected rows (common logic)
      let articleOptions = selectedRows.map((item) => {
        const column_name = filterConfig[0].column_name ?? articleKey;
        return {
          label: replaceSpecialCharacter(item[column_name]),
          value: item[column_name],
        };
      });

      // Set article options and trigger initial data fetch (common logic)
      setArticleOptions(articleOptions);
      setSelectedArticle(articleOptions[0]);

      // Wait for next tick to ensure state updates are processed
      setTimeout(() => {
        //Get data for the first article using the correct filter config
        getForecastData(articleOptions[0], filterConfig);
      }, 100);
    };

    if (showReviewForecast) {
      fetchFilters();
    }
  }, [showReviewForecast]);

  useEffect(() => {
    if (selectedArticle?.value) {
      getFiltersData();
    }
  }, [selectedArticle])

  const getFiltersData = async () => {
    setFilterLoader(true);
    try {
      let filters = [{ "values": [selectedArticle.value], "operator": "in", "dimension": "product", "filter_type": "cascaded", "attribute_name": filterConfg[0].column_name, "filter_id": filterConfg[0].column_name }];
      let parentFilters = [];
      if(props.parentFilterDependency?.length > 0 ){
        parentFilters = props.parentFilterDependency.map(item => {
          let filterItem = props.filters.find(filter => filter.column_name === item.attribute_name);
          if(filterItem){
            item = {...item, extra: filterItem.extra};
          }
          if(!isEmpty(item.extra?.["crossDimension"])){
            let dimensionObj = item.extra?.["crossDimension"][0];
            item.attribute_name = dimensionObj.attribute_name;
            item.dimension = dimensionObj.dimension;
            item.filter_id = dimensionObj.attribute_name;
          }
          return item;
        })
      }
      if(props.parentFilterDependency?.length > 0){
        filters = [...filters, ...parentFilters];
      }
      
      const payload = {
        "attributes": filterConfg.slice(1).map(item => ({ "attribute_name": item.column_name, "dimension": item.dimension, "filter_type": item.filter_type })),
        "filter_type": "cascaded",
        "application_code": 1,
        "filters": filters,
      }
      const tenantUamConfig = JSON.parse(localStorage.getItem("tenantUamConfig"));
      if(tenantUamConfig?.filter_uam){
        payload.is_urm_filter = true;
        payload.screen_name = "Allocation";
      }
      const response = await getCombinedCrossDimensionFiltersData(payload)();
      if (response?.data?.status) {
        const filterOptions = {}
        filterConfg.forEach((item, index) => {
          if (index > 0) {
            filterOptions[item.column_name] = response?.data?.data?.[item.column_name]?.map(item => ({ label: replaceSpecialCharacter(item), value: item }));
            // selectedOptions[item.column_name] = filterOptions[item.column_name];
          }
        });
        setFilters(filterOptions);
        // setSelectedOptions(selectedOptions);
      }
      else {
        displaySnackMessages(response.data.message, "error");
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setFilterLoader(false);
    }
  }


  const handleChange = (index, selected, key) => {
    if (index === 0) {
      setSelectedArticle(selected);
    }
    else {
      setSelectedOptions({ ...selectedOptions, [key]: selected });
    }
  };

  const generateFilters = () => {
    return filterConfg?.map((item, index) =>
      <Select
        key={item.column_name}
        options={index === 0 ? (articleOptions || []) : (filters?.[item.column_name] || [])}
        value={index === 0 ? selectedArticle : selectedOptions[item.column_name]}
        isMulti={Boolean(item.is_multiple_selection)}
        isSearchable
        label={item.label}
        placeholder={`Select ${item.label}`}
        onChange={(selected) => handleChange(index, selected, item.column_name)}
        isClearable={false}
      />
    );
  };

  const getForecastData = async (article = selectedArticle, configToUse = filterConfg) => {
    setCurrentArticle(article);
    setDataLoader(true);

    try {
      // Generate the payload in the required format
      const buildDataObject = () => {
        const dataObj = {};

        configToUse.forEach((filter, index) => {
          dataObj[filter.column_name] = [];
          if (index === 0) {
            // First filter is always the article
            dataObj[filter.column_name] = article?.value || "";
          } else {
            // For other filters, use column_name directly as key
            const selectedValues = selectedOptions[filter.column_name];
            if (selectedValues) {
              const values = Array.isArray(selectedValues) ?
                selectedValues.map(item => item.value) :
                [selectedValues.value];

              dataObj[filter.column_name] = values;
            }
          }
        });

        return dataObj;
      };
      const payload = {
        data: buildDataObject(),
        filters: selectedFilters ? selectedFilters
          .filter(filter => filter.values && filter.values.length > 0 && (exlcudeStoreFilter ? filter.dimension?.toLowerCase() == "product" : true))
          .map(filter => ({
            attribute_name: filter.attribute_name,
            dimension: filter.dimension || "product",
            display_type: "dropdown",
            filter_id: filter.attribute_name,
            filter_type: filter.filter_type || "cascaded",
            values: filter.values,
            operator: filter.operator || "in"
          })) : [],
        ia_default_flag: false,
        only_eligible: false,
        mfp: epLabel ? true : false,
        future_week_no: 8,
        past_week_no: 3
      };

      let response = await getReviewForecastData(payload)();
      if (response?.data?.status) {
        setForecastData(response?.data?.data);
      } else {
        displaySnackMessages(response.data.message, "error");
      }
    } catch (error) {
      displaySnackMessages("Failed to fetch forecast data.", "error");
    } finally {
      setDataLoader(false);
    }
  };

  return (
    <Panel
      title="Forecast visualization"
      size="large"
      anchor="right"
      width={900}
      onClose={closePanel}
      aria-labelledby="customized-dialog-title"
      open={showReviewForecast}
      primaryButtonLabel={"Go To ADA Dashboard"}
      onPrimaryButtonClick={reviewForcastHandler}
    >
      <Loader
        loader={filterLoader}
        size="medium"
        text="Loading Filters"
        minHeight={"10vh"}
      ><div
        style={{ alignItems: 'end' }}
        className={`${globalClasses.flexGrow} ${globalClasses.layoutAlignSpaceBetween}`}>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap}`}
          >
            {generateFilters()}
          </div>
          <div>
            <div>
              <Button variant="secondary" onClick={() => getForecastData()}>
                Apply Filter
              </Button>
            </div>
          </div>
        </div>
        <Divider className={globalClasses.marginVertical1rem} />
        <div className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignEnd} ${globalClasses.marginVertical}`}>
          <div style={{ fontFamily: 'Manrope' }}>
            <span>Selected {filterConfg?.[0]?.label}: </span> <span style={{ fontWeight: 700 }}>{currentArticle?.label}</span>
          </div>
        </div>
      </Loader>

      <Loader
        loader={dataLoader}
        size="medium"
        text="Loading Forecast"
        minHeight={"50vh"}
      >
       {cardData && <GenericCardsPanel panelData={cardData} customClasses={customClasses} containerClassName={classes.panelContainer} />}
        <ReviewForecastChart
          epLabel={epLabel}
          data={forecastData}
        />
      </Loader>
    </Panel>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(null, mapDispatchToProps)(React.memo(ReviewForecastPanel));