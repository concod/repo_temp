/* eslint-disable react/prop-types */
import React from "react";
import moment from "moment";
import { Tooltip } from "impact-ui";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import "../Calendar.scss";

const Header = (props) => {
  const getMonthInfo = (month) => {
    const calMonth1 = moment(month?.min_date)?.format("MMMM");
    const calMonth2 = moment(month?.max_date)?.format("MMMM");
    const calendarMonths =
      calMonth1 === calMonth2 ? calMonth1 : calMonth1 + " - " + calMonth2;

    return (
      <Tooltip text={calendarMonths} placement="right">
        <HelpOutlineIcon />
      </Tooltip>
    );
  };
  const getHeaderCellViews = (
    level,
    arg,
    totalDaysInView,
    showLeftNav,
    showRightNav
  ) => {
    const width =
      level === "month"
        ? (100 / totalDaysInView) * arg.daysInMonth + "%"
        : level === "week"
        ? (100 / totalDaysInView) * arg.daysInWeek + "%"
        : 100 / totalDaysInView + "%";
    const displayName =
      level === "month"
        ? arg.name + " - FY " + arg.year
        : level === "week"
        ? arg.name
        : moment(arg).format("D");
    return (
      <div
        className={`header-cell ${
          arg.weekBorder ? "week" : arg.monthBorder ? "month" : "day"
        }`}
        style={{ width }}
      >
        {showLeftNav && (
          <div className="navigation-arrow-left" onClick={props.onPrevClick}>
            <ChevronLeftIcon />
          </div>
        )}

        <div className="header-title-container">
          <span className="header-title">
            {displayName}
            {level === "month" ? getMonthInfo(arg) : null}
          </span>
        </div>
        {showRightNav && (
          <div className="navigation-arrow-right" onClick={props.onNxtClick}>
            <ChevronRightIcon />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="header-row month">
        {props.currentDateSelectionMapping?.months?.map((month, index) => {
          let noOfDaysInMonth = 0;
          month.weeks?.map((week) => {
            noOfDaysInMonth = noOfDaysInMonth + week.days?.length;
          });
          let showLeftNav = index === 0;
          let showRightNav =
            index === props.currentDateSelectionMapping?.months?.length - 1;
          return getHeaderCellViews(
            "month",
            month,
            props.totalDaysInView,
            showLeftNav,
            showRightNav
          );
        })}
      </div>
      <div className="header-row week">
        {props.currentDateSelectionMapping?.months?.map((month) =>
          month.weeks.map((week) => {
            return getHeaderCellViews("week", week, props.totalDaysInView);
          })
        )}
      </div>
      <div className="header-row day">
        {props.currentDateSelectionMapping?.months?.map((month) =>
          month.weeks.map((week) => {
            return week.days?.map((day) => {
              return getHeaderCellViews("day", day, props.totalDaysInView);
            });
          })
        )}
      </div>
    </>
  );
};

export default Header;
