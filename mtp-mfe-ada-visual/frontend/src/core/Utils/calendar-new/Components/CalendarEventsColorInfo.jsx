import { eventStatusColors } from "../Constants";

export default function CalendarEventsColorInfo() {
  return (
    <div
      className="event-legend"
      style={{ display: "flex", alignItems: "center" }}
    >
      {Object.keys(eventStatusColors).map((status) => (
        <div className="event-legend-content">
          <div
            className="event-legend-content-circle"
            style={{
              backgroundColor: eventStatusColors[status].color,
            }}
          />
          <div
            className="event-legend-content-text"
            style={{
              color: eventStatusColors[status].color,
            }}
          >
            {eventStatusColors[status].label}
          </div>
        </div>
      ))}
    </div>
  );
}
