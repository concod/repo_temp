import { useEffect, useState } from "react";
import { Button, Select } from "impact-ui-v3";
import DeleteIcon from "@mui/icons-material/Delete";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty } from "lodash";
import Search from "../Search/Search";
import { useSelector, useDispatch } from "react-redux";
import { deleteEvent } from "../services-chatsystem/custom-services-chat-system";
import ChatEventCard from "./ChatEventCard";
import "./ChatStarred.scss";
import { displaySnackMessages } from "core/Utils/utils";

const useStyles = makeStyles((theme) => ({
  heading: {
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: "1.25rem",
    color: colours.darkBlack,
    marginTop: "0.25rem",
    fontFamily: "Manrope",
    "-webkit-line-clamp": 1,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    maxWidth: "106px",
    "& .MuiButtonBase-root.MuiChip-root": {
      marginLeft: pxToRem(10),
    },
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    display: "inline-block",
  },
  subHeading: {
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: pxToRem(15),
    color: colours.darkGrey,
    marginTop: "0.25rem",
    fontFamily: "Manrope",
  },
  input: {
    height: "28px !important",
  },
}));

const dropdownOptions = [
  {
    label: "Channel",
    value: "channel",
  },
  {
    label: "Starred",
    value: "starred",
  },
  {
    label: "Resolved",
    value: "resolved",
  },
];

const ChatEvents = (props) => {
  const classes = useStyles();

  const {
    chatList,
    activeEventId,
    setActiveEvent,
    setActiveEventId,
    currentEventIdRef,
    selectedOption,
    isChannel,
    isResolved,
    handleEvents,
  } = props;
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [pinnedEventsList, setPinnedEventsList] = useState(() => {
    const pinnedEvents = {};
    Object.entries(chatList).forEach(([key, values]) => {
      if (values.pinned) pinnedEvents[key] = values;
    });
    return pinnedEvents;
  });
  const [eventList, setEventList] = useState(() => {
    const normalEvents = {};
    Object.entries(chatList).forEach(([key, values]) => {
      if (!values.pinned) normalEvents[key] = values;
    });
    return normalEvents;
  });

  const { tableName, selectedRowsIDs, uniqueRowId } = useSelector(
    (state) => state.commonChatReducer?.eventsData
  );

  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );

  useEffect(() => {
    const pinnedEvents = {};
    const normalEvents = {};
    Object.entries(chatList).forEach(([key, values]) => {
      if (values.pinned) pinnedEvents[key] = values;
      else normalEvents[key] = values;
    });
    setPinnedEventsList(pinnedEvents);
    setEventList(normalEvents);
  }, [chatList]);

  const handleDropdownChange = (selected) => {
    const data = {
      component_type: tableName,
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
      filter: selected.value === "channel" ? "all" : selected.value,
      components: selectedRowsIDs.map((item) => ({
        component_id: String(item[uniqueRowId]),
      })),
    };
    handleEvents("filter", {
      data,
      tableName,
      uniqueRowId,
      selectedRowsIDs,
      selected,
    });
  };

  const handleCheckboxChange = (event, eventDetails) => {
    if (event.target.checked) {
      setSelectedEvents([...selectedEvents, eventDetails.event_id]);
    } else {
      // To Do the Logic when you have a regular list
      const newEvents = selectedEvents.filter(
        (eventId) => eventId !== eventDetails.event_id
      );
      setSelectedEvents(newEvents);
    }
  };

  const handleDeleteEvents = async () => {
    const response = await deleteEvent({
      event_ids: selectedEvents,
      component_type: tableName,
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
      components: selectedRowsIDs.map((item) => ({
        component_id: String(item[uniqueRowId]),
      })),
    });
    if (response.status) {
      const responseMessage = `${response?.data?.deleted_events}/${
        response?.data?.deleted_events + response?.data?.skipped_events
      } events deleted sucessfully!`;
      displaySnackMessages(responseMessage, "success", dispatch);
      setSelectedEvents([]);
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    const pinnedEvents = {};
    const normalEvents = {};
    if (!value) {
      Object.entries(chatList).forEach(([key, values]) => {
        if (values.pinned) pinnedEvents[key] = values;
        else normalEvents[key] = values;
      });
    } else {
      Object.entries(chatList).forEach(([key, values]) => {
        const eventName = values.event_name.toLowerCase();
        if (eventName?.includes(value?.toLowerCase())) {
          if (values.pinned) pinnedEvents[key] = values;
          else normalEvents[key] = values;
        }
      });
    }
    setPinnedEventsList(pinnedEvents);
    setEventList(normalEvents);
  };

  return (
    <div className="starred-events">
      <header>
        <div className="event-heading">{`Events ${
          isChannel ? `(${Object.keys(chatList).length})` : ""
        }`}</div>

        <Search handleSearch={handleSearch} selectedEvents={selectedEvents} />

        {selectedEvents.length ? (
          <Button
            variant="url"
            icon={<DeleteIcon />}
            size="small"
            onClick={handleDeleteEvents}
          />
        ) : null}
      </header>
      <section>
        <div className="select">
          <Select
            isOpen={isOpen}
            currentOptions={dropdownOptions}
            handleChange={handleDropdownChange}
            // onClearAll={setSelectedOptions}
            isCloseWhenClickOutside
            label=""
            labelOrientation="top"
            name="name"
            placeholder="select.."
            selectedOptions={selectedOption}
            setCurrentOptions={() => {}}
            setIsOpen={setIsOpen}
            setIsSelectAll={() => {}}
            setSelectedOptions={() => {}}
          />
        </div>
        <div className="events">
          {!isEmpty(pinnedEventsList) && (
            <ChatEventCard
              eventsList={pinnedEventsList}
              isResolved={isResolved}
              isChannel={isChannel}
              activeEventId={activeEventId}
              handleCheckboxChange={handleCheckboxChange}
              currentEventIdRef={currentEventIdRef}
              setActiveEvent={setActiveEvent}
              setActiveEventId={setActiveEventId}
              handleEvents={handleEvents}
              classes={classes}
              selectedEvents={selectedEvents}
              tableName={tableName}
              appDetails={appDetails}
            />
          )}
          <ChatEventCard
            eventsList={eventList}
            isResolved={isResolved}
            isChannel={isChannel}
            activeEventId={activeEventId}
            handleCheckboxChange={handleCheckboxChange}
            currentEventIdRef={currentEventIdRef}
            setActiveEvent={setActiveEvent}
            setActiveEventId={setActiveEventId}
            handleEvents={handleEvents}
            classes={classes}
            selectedEvents={selectedEvents}
            tableName={tableName}
            appDetails={appDetails}
          />
        </div>
      </section>
    </div>
  );
};

export default ChatEvents;
