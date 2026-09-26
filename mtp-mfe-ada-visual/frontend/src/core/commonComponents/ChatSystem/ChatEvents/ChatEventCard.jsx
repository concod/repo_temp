import { Avatar, Badge, Checkbox } from "impact-ui-v3";
import { Typography } from "@mui/material";
import MoreButtons from "./MoreButtons";
import ResolvedIcon from "assets/impactv3/resolve.svg";
import moment from "moment";
import "./ChatStarred.scss";

const ChatEventCard = (props) => {
  const {
    eventsList,
    isResolved,
    isChannel,
    activeEventId,
    handleCheckboxChange,
    currentEventIdRef,
    setActiveEvent,
    setActiveEventId,
    handleEvents,
    classes,
    selectedEvents,
    tableName,
    appDetails,
  } = props;
  return Object.entries(eventsList).map(
    ([key, values]) =>
      ((isResolved && values.resolved) || !isResolved) && (
        <div
          className={`starred-card ${activeEventId == key ? "active" : ""} ${
            isChannel ? "channel" : ""
          }`}
        >
          {isChannel && (
            <Checkbox
              checked={selectedEvents.includes(Number(key))}
              withoutFormLabel
              onChange={(event) => {
                handleCheckboxChange(event, values);
              }}
            />
          )}
          <div
            className={`starred-card-clickable ${isChannel ? "channel" : ""}`}
            onClick={() => {
              currentEventIdRef.current = {
                eventId: values.event_id,
                eventName: values.event_name,
              };
              setActiveEvent(values.event_name);
              setActiveEventId(values.event_id);
            }}
          >
            <div className="starred">
              <Avatar size="small" label={values.event_name?.charAt(0)} />
              <div className="event-details">
                <div className="event-name-res">
                  {/* <Tooltip title={values.event_name}> */}
                  <Typography className={classes.heading}>
                    {values.event_name}
                  </Typography>
                  {/* </Tooltip> */}
                  {!isResolved ? (
                    <Badge
                      color="info"
                      label={
                        isChannel
                          ? `${values.comments_count || 0} Replies`
                          : `${values.comments_count || 0} Comment`
                      }
                      onClick={() => {}}
                      variant="stroke"
                    />
                  ) : null}
                  {isResolved && <ResolvedIcon />}
                </div>
                <Typography className={classes.subHeading}>
                  {`Created on ${moment(values.created_at).format("L")}`}
                </Typography>
              </div>
            </div>
            {!isChannel && (
              <MoreButtons
                handleEvents={handleEvents}
                eventName={values.event_name}
                eventId={values.event_id}
                isResolved={isResolved}
                isPinned={values.pinned}
                tableName={tableName}
                appDetails={appDetails}
              />
            )}
          </div>
        </div>
      )
  );
};

export default ChatEventCard;
