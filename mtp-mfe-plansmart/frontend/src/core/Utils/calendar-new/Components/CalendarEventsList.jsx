/* eslint-disable react/prop-types */
import React from "react";
import {
  getEventLeftSpace,
  getEventWidth,
  getCalendarPlotForEvents,
} from "../Helpers";
import "../Calendar.scss";

const CalendarEvent = ({
  event,
  titleLeft,
  titleWidth,
  onCalEventClick,
  plotDetails,
  getDetailContent,
  getEventTileExtraContent,
}) => {
  const getPageOffset = (elem) => {
    let topOffset = 0;
    if (element) {
      topOffset = elem.getBoundingClientRect().top;

      while (elem != document.documentElement) {
        elem = elem.parentElement;
        topOffset += elem.scrollTop;
      }
    }
    return topOffset;
  };

  let element = document.getElementById("calendar-wrapper");
  var parentWidth = element
    ? element.getBoundingClientRect().width
    : window.screen.width - 50;

  const eventDetailPositionLeft =
    parentWidth * ((titleLeft + 3) / 100) + 272 > parentWidth
      ? parentWidth * (titleLeft / 100) - 262
      : parentWidth * ((titleLeft + 2) / 100);

  // Also adjust the top position if the event is at the bottom of the container
  let eventDetailPositionTop =
    getPageOffset(element) + plotDetails[event.id] * 41 + 235 >
    getPageOffset(element) + 400
      ? plotDetails[event.id] * 41 - 200
      : plotDetails[event.id] * 41;

  return (
    <>
      <div
        className={`event-container ${event.status} ${event.type} ${
          event.isSelected ? "selected" : ""
        }`}
        style={{
          left: `${titleLeft}%`,
          width: `${titleWidth}%`,
          top: `${plotDetails[event.id] * 41}px`,
        }}
        variant="contained"
        onClick={(e) => onCalEventClick({ event, target: e.target })}
      >
        <p className="event-title">
          {getEventTileExtraContent ? getEventTileExtraContent(event) : null}
          <span className="event-title-text">{event.name}</span>
        </p>
      </div>
      <div
        className={`event-detail-container ${event.status} ${event.type} ${
          event.isSelected ? "selected" : ""
        }`}
        style={{
          left: `${eventDetailPositionLeft}px`,
          top: `${eventDetailPositionTop}px`,
        }}
      >
        {getDetailContent(event)}
      </div>
    </>
  );
};

const CalendarEventsList = ({
  filteredEvents,
  calStDt,
  calEnDt,
  onCalEventClick,
  isLoading,
  getDetailContent,
  currentDateSelectionMapping,
  totalDaysInView,
  getEventTileExtraContent,
}) => {
  const calendarPlot = getCalendarPlotForEvents(filteredEvents);

  let plotDetails = {};
  calendarPlot.map((row, index) => {
    row.map((event) => {
      plotDetails[event.id] = index;
    });
  });

  return (
    <div
      id="event-scroll-container"
      className={`event-list-container ${isLoading ? "no-scroll" : ""}`}
    >
      <div className="event-list-container-wrapper">
        {isLoading && <div className="loading" />}
        {filteredEvents.length > 0 &&
          Array.from(
            {
              length: calendarPlot.length < 8 ? 7 : calendarPlot.length,
            },
            (_, index) => index + 1
          ).map(() => (
            <div className="cal-row">
              {currentDateSelectionMapping?.months?.map((month) => {
                return month.weeks.map((week) =>
                  week.days?.map((day) => (
                    <div
                      className={`cal-cell ${
                        day.weekBorder
                          ? "week"
                          : day.monthBorder
                          ? "month"
                          : "day"
                      }`}
                      style={{
                        width: `${100 / totalDaysInView}%`,
                      }}
                    />
                  ))
                );
              })}
            </div>
          ))}
        {filteredEvents.map((event) => {
          const { start_date: eventStDt, end_date: eventEnDt } = event;
          return (
            <CalendarEvent
              event={event}
              onCalEventClick={onCalEventClick}
              titleLeft={getEventLeftSpace({
                eventStDt,
                calStDt,
                totalDaysInView,
              })}
              titleWidth={getEventWidth({
                eventStDt,
                eventEnDt,
                calStDt,
                calEnDt,
                totalDaysInView,
              })}
              totalDaysInView={totalDaysInView}
              plotDetails={plotDetails}
              getDetailContent={getDetailContent}
              getEventTileExtraContent={getEventTileExtraContent}
            />
          );
        })}
        {filteredEvents.length === 0 && (
          <div className="flex-c-a no-content">
            {!isLoading && "No events in the current date range"}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarEventsList;
