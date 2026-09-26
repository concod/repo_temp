import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Calendar from "./calendar";
import { makeStyles } from "@mui/styles";
import AdaSelect from "./select";
import { useSelector } from "react-redux";

const DateRangeCompareWith = ({ loader, onDateChange, selectedDate }) => {
  const classes = useStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  return (
    <LoadingOverlay minHeight={70} loader={loader}>
      <div className={classes.dateRangeCompareWithContainer}>
        <p className={classes.dateRangeCompareWithLabel}>
          Date range and Aggregation level
        </p>
        <div className={classes.dateRangeCompareWithWrapper}>
          <Calendar selectedDate={selectedDate} onDateChange={onDateChange} />
          <AdaSelect
            label="Aggregation level"
            reducerKey="switchTimeLine"
            isMulti={false}
            customClass={classes.selectContainer}
            initialOptions={
              adaReducer?.clientConfig?.attribute_value?.timelineConstants
            }
            isMandatory
          />
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
  },
  selectContainer: {
    "& .ia-select-label-v3": {
      display: "none",
    },
  },
}));
