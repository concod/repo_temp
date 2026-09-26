import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Calendar from "./calendar";
import { makeStyles } from "@mui/styles";
import AdaSelect from "./select";
import { useSelector } from "react-redux";

const DateRangeCompareWith = ({ loader, onDateChange , selectedDate }) => {
  const classes = useStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  return (
    <CustomAccordion
      label="Date range and Aggregation level"
      isMandatory
      defaultExpanded={true}
    >
      <LoadingOverlay minHeight={70} loader={loader}>
        <div className={classes.dateRangeCompareWithWrapper}>
          <Calendar selectedDate={selectedDate} onDateChange={onDateChange}  />
          <AdaSelect
            label="Aggregation level"
            reducerKey="switchTimeLine"
            isMulti={false}
            initialOptions={
              adaReducer?.clientConfig?.attribute_value?.timelineConstants
            }
            isMandatory
          />
        </div>
      </LoadingOverlay>
    </CustomAccordion>
  );
};

export default DateRangeCompareWith;

const useStyles = makeStyles((theme) => ({
  dateRangeCompareWithWrapper: {
    display: "flex",
    alignItems: "center",
  },
}));
