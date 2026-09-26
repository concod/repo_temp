import React, { useState } from "react";
import { Button, Container, Typography } from "@mui/material";
import { fetchEvents } from "../../../actions/eventConfigurationActions";
import { connect } from "react-redux";
import AddEvent from "./add-event";
import { addSnack } from "../../../actions/snackbarActions";
import Eventlist from "./events-list";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";

const EventConfiguration = (props) => {
  const globalClasses = globalStyles();

  const [selectedEvents, setSelectedEvents] = useState({});
  const [addEventModal, setAddEventModal] = useState(false);

  const getEvents = async () => {
    await props.fetchEvents("?application=Workflow Input Center&page=1");
  };

  const showAddEvent = (event) => {
    setSelectedEvents(event);
    setAddEventModal(true);
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Event List",
            id: 1,
          },
        ]}
      ></HeaderBreadCrumbs>
      <Container maxWidth={false}>
        <div className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}>
          <Typography component="h2" variant="h3">Event List</Typography>
          <Button
            variant="contained"
            color="primary"
            id="filterBtn"
            onClick={() => {
              setSelectedEvents({});
              setAddEventModal(true);
            }}
          >
            Add Event
          </Button>
        </div>
        {addEventModal && (
          <AddEvent
            defaultData={selectedEvents}
            handleModalClose={() => {
              setAddEventModal(false);
              getEvents();
            }}
          >
            {" "}
          </AddEvent>
        )}
        <Eventlist showAddEvent={showAddEvent}></Eventlist>
      </Container>
    </>
  );
};
const mapActionsToProps = {
  fetchEvents,
  addSnack,
};
export default connect(null, mapActionsToProps)(EventConfiguration);
