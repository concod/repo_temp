import React, { Component } from "react";
import _ from "lodash";
import CalendarHeader from "./Components/CalendarHeader";
import CalendarEventsList from "./Components/CalendarEventsList";
import {
  getCurrent,
  getWeekCount,
  filterEventsforDisplay,
  getQtrMoWkDateMapping,
  getWeekAndQuarterFromMonth,
  getWeekAndMonthFromQuarter,
  getMonthAndQuarterFromWeek,
  geStartAndEndDate,
  getCurrentQuarterMappingForViewType,
} from "./Helpers";
import "./Calendar.scss";

class Calendar extends Component {
  constructor(props) {
    super(props);
    if (!_.isEmpty(props.fiscalCalendar)) {
      const { currYr, currWk, currMo, currQtr, minDate, maxDate } = getCurrent(
        this.props.fiscalCalendar,
        this.props.calMinDate,
        this.props.calMaxDate
      );

      const {
        noOfWks,
        qtrMoWkDateMapping,
        currentDateSelectionMapping,
        totalDaysInView,
      } = this.generateMapping(currYr, currQtr, currMo);

      this.state = {
        calTypToggleVal: props.calendarFrequency || "month",
        currMo,
        noOfWks,
        qtrMoWkDateMapping,
        currentDateSelectionMapping,
        totalDaysInView,
        calViewState: {
          wk: currWk,
          mo: currMo,
          qtr: currQtr,
          yr: currYr,
        },
        minDate,
        maxDate,
      };
    } else {
      this.state = {
        calTypToggleVal: props.calendarFrequency || "month",
        currMo: 0,
        noOfWks: 52,
        calViewState: {},
        qtrMoWkDateMapping: {},
        currentDateSelectionMapping: {},
        totalDaysInView: 0,
      };
    }
  }

  componentDidMount() {
    // Detect if mouse is being used or trackpad
    // If Mouse, the browser renders a different scrollbar which takes up extra space in the scrollable div
    // If Trackpad, the browser renders a sleeker scrollbar that overlays on the scrollable div content
    const elements = document.querySelectorAll(".header-row");
    if (this.props.isTrackingDeviceExternal) {
      // Add overflow-y: hidden from header-row
      elements.forEach((element) => {
        element.classList.add("scroll");
      });
    } else {
      // Add overflow-y: scroll to the header-row class (month/week/day displays)
      elements.forEach((element) => {
        element.classList.remove("scroll");
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.isTrackingDeviceExternal !==
        this.props.isTrackingDeviceExternal ||
      prevProps.eventList !== this.props.eventList
    ) {
      const elements = document.querySelectorAll(".header-row");
      if (this.props.isTrackingDeviceExternal) {
        // Add overflow-y: hidden from header-row
        elements.forEach((element) => {
          element.classList.add("scroll");
        });
      } else {
        // Add overflow-y: scroll to the header-row class (month/week/day displays)
        elements.forEach((element) => {
          element.classList.remove("scroll");
        });
      }
    }

    if (prevProps.calendarFrequency !== this.props.calendarFrequency) {
      if (!_.isEmpty(this.state.qtrMoWkDateMapping)) {
        const {
          currentDateSelectionMapping,
          totalDaysInView,
        } = getCurrentQuarterMappingForViewType({
          headerViewType: this.props.calendarFrequency,
          headerMapping: this.state.qtrMoWkDateMapping,
          currentQuarter: this.state.calViewState.qtr,
          currentMonth: this.state.calViewState.mo,
          fiscalCalendar: this.props.fiscalCalendar,
        });
        this.setState({
          calTypToggleVal: this.props.calendarFrequency,
          currentDateSelectionMapping,
          totalDaysInView,
        });
      } else {
        this.setState({
          calTypToggleVal: this.props.calendarFrequency,
        });
      }
    }

    if (
      !prevProps.calMinDate.isSame(this.props.calMinDate) ||
      !prevProps.calMaxDate.isSame(this.props.calMaxDate) ||
      !_.isEqual(prevProps.fiscalCalendar, this.props.fiscalCalendar)
    ) {
      if (!_.isEmpty(this.props.fiscalCalendar)) {
        const {
          currYr,
          currWk,
          currMo,
          currQtr,
          minDate,
          maxDate,
        } = getCurrent(
          this.props.fiscalCalendar,
          this.props.calMinDate,
          this.props.calMaxDate
        );

        const {
          noOfWks,
          qtrMoWkDateMapping,
          currentDateSelectionMapping,
          totalDaysInView,
        } = this.generateMapping(currYr, currQtr, currMo);

        this.setState({
          currMo,
          noOfWks,
          qtrMoWkDateMapping,
          currentDateSelectionMapping,
          totalDaysInView,
          calViewState: {
            wk: currWk,
            mo: currMo,
            qtr: currQtr,
            yr: currYr,
          },
          minDate,
          maxDate,
        });
      }
    }
  }

  generateMapping = (yr, qtr, mo) => {
    const noOfWks = getWeekCount(yr, this.props.fiscalCalendar);
    const {
      qtrMoWkDateMapping,
      currentDateSelectionMapping,
      totalDaysInView,
    } = getQtrMoWkDateMapping(
      this.props.fiscalCalendar,
      yr,
      qtr,
      mo,
      this.props.calendarFrequency,
      true
    );
    return {
      noOfWks,
      qtrMoWkDateMapping,
      currentDateSelectionMapping,
      totalDaysInView,
    };
  };

  onPrevClick = () => {
    const { calViewState, calTypToggleVal, qtrMoWkDateMapping } = this.state;
    switch (calTypToggleVal) {
      case "week":
        if (calViewState.wk === 1) {
          this.onPrevYrChng();
          return;
        }
        const prevWk = calViewState.wk - 1;
        const { quarterFromWeek, monthFromWeek } = getMonthAndQuarterFromWeek(
          qtrMoWkDateMapping,
          prevWk
        );
        // Check if this is valid for selection
        if (
          this.state.calViewState?.yr > this.state.minDate?.currYr ||
          (this.state.calViewState?.yr == this.state.minDate?.currYr &&
            prevWk >= this.state.minDate?.currWk)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: quarterFromWeek,
            currentMonth: monthFromWeek,
            fiscalCalendar: this.props.fiscalCalendar,
          });
          this.setState({
            calViewState: {
              ...calViewState,
              wk: prevWk,
              mo: monthFromWeek,
              qtr: quarterFromWeek,
            },
            currentDateSelectionMapping,
            totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }

        break;
      case "month":
        if (calViewState.mo === 1) {
          this.onPrevYrChng();
          return;
        }
        const prevMo = calViewState.mo - 1;

        let { quarterFromMonth, weekFromMonth } = getWeekAndQuarterFromMonth(
          qtrMoWkDateMapping,
          prevMo
        );

        // Check if this is valid for selection
        if (
          calViewState?.yr > this.state.minDate?.currYr ||
          (calViewState?.yr == this.state.minDate?.currYr &&
            prevMo >= this.state.minDate?.currMo)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: quarterFromMonth,
            currentMonth: prevMo,
            fiscalCalendar: this.props.fiscalCalendar,
          });
          this.setState({
            calViewState: {
              ...calViewState,
              wk: weekFromMonth,
              mo: prevMo,
              qtr: quarterFromMonth,
            },
            currentDateSelectionMapping,
            totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }
        break;
      case "quarter":
        if (calViewState.qtr === 0) {
          this.onPrevYrChng();
          return;
        }
        const prevQtr = calViewState.qtr - 1;
        let { monthForQuarter, weekForQuarter } = getWeekAndMonthFromQuarter(
          qtrMoWkDateMapping,
          prevQtr
        );
        // Check if this is valid for selection
        if (
          this.state.calViewState?.yr > this.state.minDate?.currYr ||
          (this.state.calViewState?.yr == this.state.minDate?.currYr &&
            prevQtr >= this.state.minDate?.currQtr)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: prevQtr,
            currentMonth: monthForQuarter,
            fiscalCalendar: this.props.fiscalCalendar,
          });
          this.setState({
            calViewState: {
              ...calViewState,
              wk: weekForQuarter,
              mo: monthForQuarter,
              qtr: prevQtr,
            },
            currentDateSelectionMapping,
            totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }
        break;
      case "year":
        this.onPrevYrChng();
        break;

      default:
        break;
    }
  };

  onNxtClick = () => {
    const {
      calViewState,
      calTypToggleVal,
      noOfWks,
      qtrMoWkDateMapping,
    } = this.state;
    switch (calTypToggleVal) {
      case "week":
        if (calViewState.wk === noOfWks) {
          this.onNxtYrChng();
          return;
        }
        const nxtWk = calViewState.wk + 1;

        const { quarterFromWeek, monthFromWeek } = getMonthAndQuarterFromWeek(
          qtrMoWkDateMapping,
          nxtWk
        );

        if (
          this.state.calViewState?.yr < this.state.maxDate?.currYr ||
          (this.state.calViewState?.yr == this.state.maxDate?.currYr &&
            nxtWk <= this.state.maxDate?.currWk)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: quarterFromWeek,
            currentMonth: monthFromWeek,
            fiscalCalendar: this.props.fiscalCalendar,
          });

          this.setState({
            calViewState: {
              ...calViewState,
              wk: nxtWk,
              mo: monthFromWeek,
              qtr: quarterFromWeek,
            },
            currentDateSelectionMapping,
            totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }

        break;
      case "month":
        if (calViewState.mo === 12) {
          this.onNxtYrChng();
          return;
        }
        const nxtMo = calViewState.mo + 1;
        const { quarterFromMonth, weekFromMonth } = getWeekAndQuarterFromMonth(
          qtrMoWkDateMapping,
          nxtMo
        );
        if (
          calViewState?.yr < this.state.maxDate?.currYr ||
          (calViewState?.yr == this.state.maxDate?.currYr &&
            nxtMo <= this.state.maxDate?.currMo)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: quarterFromMonth,
            currentMonth: nxtMo,
            fiscalCalendar: this.props.fiscalCalendar,
          });
          this.setState({
            calViewState: {
              ...calViewState,
              wk: weekFromMonth,
              mo: nxtMo,
              qtr: quarterFromMonth,
            },
            currentDateSelectionMapping: currentDateSelectionMapping,
            totalDaysInView: totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }
        break;
      case "quarter":
        if (calViewState.qtr === 4) {
          this.onNxtYrChng();
          return;
        }
        const nxtQtr = calViewState.qtr + 1;

        let { monthForQuarter, weekForQuarter } = getWeekAndMonthFromQuarter(
          qtrMoWkDateMapping,
          nxtQtr
        );

        if (
          this.state.calViewState?.yr < this.state.maxDate?.currYr ||
          (this.state.calViewState?.yr == this.state.maxDate?.currYr &&
            nxtQtr <= this.state.maxDate?.currQtr)
        ) {
          const {
            currentDateSelectionMapping,
            totalDaysInView,
          } = getCurrentQuarterMappingForViewType({
            headerViewType: this.props.calendarFrequency,
            headerMapping: this.state.qtrMoWkDateMapping,
            currentQuarter: nxtQtr,
            currentMonth: monthForQuarter,
            fiscalCalendar: this.props.fiscalCalendar,
          });
          this.setState({
            calViewState: {
              ...calViewState,
              wk: weekForQuarter,
              mo: monthForQuarter,
              qtr: nxtQtr,
            },
            currentDateSelectionMapping,
            totalDaysInView,
          });
        } else {
          this.props.toastError(
            "Out of selected date range. Please change the dates and filter again to see results."
          );
          return false;
        }
        break;
      case "year":
        this.onNxtYrChng();
        break;

      default:
        break;
    }
  };

  onYrChng = (yr, calViewState) => {
    this.setState({
      calViewState,
      ...this.generateMapping(yr, calViewState.qtr, calViewState.mo),
    });
  };

  onNxtYrChng = () => {
    const nxtYr = this.state.calViewState.yr + 1;
    if (nxtYr <= this.state.maxDate?.currYr) {
      const calViewState = {
        mo: 1,
        wk: 1,
        qtr: 1,
        yr: nxtYr,
      };
      this.onYrChng(nxtYr, calViewState);
    } else {
      this.props.toastError(
        "Out of selected date range. Please change the dates and filter again to see results."
      );
      return false;
    }
  };

  onPrevYrChng = () => {
    const prevYr = this.state.calViewState.yr - 1;
    if (prevYr >= this.state.minDate?.currYr) {
      const calViewState = {
        mo: 12,
        wk: getWeekCount(prevYr, this.props.fiscalCalendar),
        qtr: 4,
        yr: prevYr,
      };
      this.onYrChng(prevYr, calViewState);
    } else {
      this.props.toastError(
        "Out of selected date range. Please change the dates and filter again to see results."
      );
      return false;
    }
  };

  getCalDates = () => {
    const {
      calTypToggleVal,
      calViewState,
      qtrMoWkDateMapping,
      currentDateSelectionMapping,
    } = this.state;
    const { wk, mo, qtr } = calViewState;
    const { minDate, maxDate } = geStartAndEndDate(
      qtrMoWkDateMapping,
      currentDateSelectionMapping,
      qtr,
      mo,
      wk,
      calTypToggleVal
    );
    return { minDate, maxDate };
  };

  render() {
    const {
      calViewState,
      qtrMoWkDateMapping,
      currentDateSelectionMapping,
      totalDaysInView,
    } = this.state;
    const { onCalEventClick, eventList, isLoading } = this.props;
    if (_.isEmpty(qtrMoWkDateMapping)) {
      return "";
    }
    const { minDate: calStDt, maxDate: calEnDt } = this.getCalDates();
    const filteredEvents = filterEventsforDisplay({
      eventList,
      calStDt,
      calEnDt,
    });

    return (
      <div className="calendar-wrapper" id="calendar-wrapper">
        <div
          className="calendar-scroll-container"
          id="calendar-scroll-container"
        >
          <CalendarHeader
            year={calViewState.yr}
            onPrevClick={this.onPrevClick}
            onNxtClick={this.onNxtClick}
            currentDateSelectionMapping={currentDateSelectionMapping}
            totalDaysInView={totalDaysInView}
          />
          <div className="calendar-events-loading-wrapper">
            {isLoading && (
              <div className="loading-text cal-row flex-c-a">Loading...</div>
            )}
            <CalendarEventsList
              filteredEvents={filteredEvents}
              calStDt={calStDt}
              calEnDt={calEnDt}
              onCalEventClick={onCalEventClick}
              isLoading={isLoading}
              getDetailContent={this.props.getDetailContent}
              getEventTileExtraContent={this.props.getEventTileExtraContent}
              currentDateSelectionMapping={currentDateSelectionMapping}
              totalDaysInView={totalDaysInView}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Calendar;
