import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import Form from "core/Utils/form";
import moment from "moment";
import { calendarConfig } from "config";
import { RANGE_FILTER_ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  setInventorysmartDatesLoader,
  setSelectedDates,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { validateDateRange } from "../../inventorysmart-utility";
import { formatStringDate } from "core/Utils/functions/utils";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const DateRangeFilter = (props) => {
  const [fiscalCalendarData, setFiscalCalendarData] = useState([]);
  const [dates, setDates] = useState(null);

  const DATE_RANGE_FIELDS = useMemo(
    () => [
      {
        //label not required
        isDisabled: false,
        isMandatory: true,
        displayRow: true,
        setValueOnBlur: true,
        showClearDates: true,
        accessor: "fiscal_date_range",
        field_type: "fiscalCalendar",
        options: fiscalCalendarData,
      },
    ],
    [fiscalCalendarData]
  );

  useEffect(() => {
    const getFiscalCalendarDataAndSetDates = async () => {
      props.setInventorysmartDatesLoader(true);
      /** Cannot select future date, so selecting previous week by default */
      const currentDate = moment();
      const startDate = formatStringDate(currentDate, true, true)
        .subtract(1, "weeks")
        .startOf("week")
        .format("MM-DD-YYYY");

      const financialCalendarData = await getCoreFiscalCalendar();
      moment.updateLocale("en", {
        week: {
          dow: financialCalendarData?.data?.data?.week_start_day || 0,
        },
      });
      setFiscalCalendarData([...financialCalendarData?.data?.data?.data]);

      const fiscalStartDate = financialCalendarData?.data?.data?.data?.find(
        (date) => {
          const formattedDate = formatStringDate(
            date?.calendar_week_start_date,
            true,
            false,
            "MM-DD-YYYY"
          );

          /** Moment isSame does not work with Mozilla Thus Using Or Operator */
          return (
            moment(formattedDate).isSame(startDate) ||
            formattedDate === startDate
          );
        }
      );

      if (
        !props.selectedDates?.fiscalInfoStartDate ||
        !props.selectedDates?.fiscalInfoEndDate
      ) {
        const dates = {
          fiscalInfoStartDate: fiscalStartDate,
          fiscalInfoEndDate: fiscalStartDate,
        };

        setDates(dates);
        props.setSelectedDates(dates);
      }
      props.setInventorysmartDatesLoader(false);
    };

    getFiscalCalendarDataAndSetDates();
  }, []);

  const handleDateChange = (val) => {
    const dateRange = validateDateRange(val, false);
    if (dateRange.isValid) {
      props.setSelectedDates(val);
    } else {
      if (dateRange.error === RANGE_FILTER_ERROR_MESSAGE) {
        if (!val.startDate && !val.endDate) {
          displaySnackMessages(dateRange.error, "error");
        }
      } else {
        displaySnackMessages(dateRange.error, "error");
      }
    }
  };

  const handleFormChange = (data) => {
    const fiscalDateRange = data?.fiscal_date_range;
    if (
      dates?.fiscalInfoEndDate?.fiscal_year_week !==
        fiscalDateRange?.fiscalInfoEndDate?.fiscal_year_week ||
      dates?.fiscalInfoStartDate?.fiscal_year_week !==
        fiscalDateRange?.fiscalInfoStartDate?.fiscal_year_week
    ) {
      setDates(fiscalDateRange);
      handleDateChange(fiscalDateRange);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <>
      <Form
        maxFieldsInRow={1}
        layout={"vertical"}
        handleChange={handleFormChange}
        fields={DATE_RANGE_FIELDS}
        updateDefaultValue={false}
        defaultValues={{ fiscal_date_range: props.selectedDates }}
      ></Form>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedDates:
      store.inventorysmartReducer.inventorySmartDashboardService.selectedDates,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setSelectedDates: (payload) => dispatch(setSelectedDates(payload)),
  setInventorysmartDatesLoader: (payload) =>
    dispatch(setInventorysmartDatesLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DateRangeFilter);
