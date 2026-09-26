import { useState } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import Calendar from "./calendar";
import { makeStyles } from "@mui/styles";
import AdaSelect from "./select";
import { useSelector } from "react-redux";
import ProductSeasonFilters from "./product-season-filters";
import { useTranslation } from "impact-ui-v3";

const DateRangeCompareWith = ({
  loader,
  onDateChange,
  customTopFilterLoading,
  setCustomTopFilterLoading,
  calendarDate,
}) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const showProductSeasonFilters =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showProductSeasonFilters;
  return (
    <LoadingOverlay minHeight={70} loader={customTopFilterLoading || loader}>
      <div className={classes.dateRangeCompareWithContainer}>
        <p className={classes.dateRangeCompareWithLabel}>
          {t("ada.dashboard.dateRangeAndAggregationLevel")}
        </p>
        <div className={classes.dateRangeCompareWithWrapper}>
          <Calendar selectedDate={calendarDate} onDateChange={onDateChange} />
          <AdaSelect
            label={t("ada.dashboard.aggregationLevel")}
            reducerKey="switchTimeLine"
            isMulti={false}
            customClass={classes.selectContainer}
            initialOptions={
              adaReducer?.clientConfig?.attribute_value?.timelineConstants
            }
            isMandatory
          />

          {showProductSeasonFilters && (
            <ProductSeasonFilters
              selectedDate={calendarDate}
              setLoading={setCustomTopFilterLoading}
              adaReducer={adaReducer}
            />
          )}
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default DateRangeCompareWith;

const useStyles = makeStyles((theme) => ({
  dateRangeCompareWithContainer: {},
  dateRangeCompareWithLabel: {
    color: "#0D152C",
    fontSize: "1rem",
    fontWeight: "800",
    lineHeight: "1.5rem",
    marginRight: "0.75rem",
  },
  dateRangeCompareWithWrapper: {
    display: "flex",
    alignItems: "center",
    paddingTop: "10px",
    flexWrap: "wrap",
    gap: "20px",
  },
  selectContainer: {
    margin: "0px",
    "& .ia-select-label-v3": {
      display: "none",
    },
  },
}));
