import { useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import {
  Chip,
  Paper,
  Typography,
  IconButton,
  Grid,
} from "@mui/material";
import {
  fetchEvents,
  deleteEvent,
} from "../../../actions/eventConfigurationActions";
import { connect } from "react-redux";
import { Stack } from "@mui/material";
import { addSnack } from "../../../actions/snackbarActions";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import NorthEastTwoToneIcon from "@mui/icons-material/NorthEastTwoTone";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ConfirmBox from "../../../Utils/confirmPrompt/confirmPopup";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  events: {
    borderRadius: theme.spacing(1),
    transition: "background 0.5s ease-out",

    "&.actionable": {
      background: `linear-gradient(90deg, ${theme.palette.warning.light}, transparent)`,
      backgroundPositionX: "-60rem",
      backgroundRepeat: "no-repeat",
      borderLeft: `0.25rem solid ${theme.palette.warning.main}`,
    },

    "&.informational": {
      background: `linear-gradient(90deg, ${theme.palette.primary.lighter}, transparent)`,
      backgroundPositionX: "-60rem",
      backgroundRepeat: "no-repeat",
      borderLeft: `0.25rem solid ${theme.palette.primary.main}`,
    },

    "& .description": {
      borderRadius: theme.spacing(1),
      background: theme.palette.common.white,
      boxShadow: `inset 0 0 5px 1px rgba(0, 0, 0, 0.15)`,
      padding: theme.spacing(2),
    },

    "& .descriptionText": {
      display: "-webkit-box",
      lineHeight: 1.5,
      "-webkit-line-clamp": 1,
      "-webkit-box-orient": "vertical",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },

    "&:hover": {
      transform: "scale(1.05)",
      transition: "transform 0.2s ease-in, background 0.5s ease-out",
      backgroundPositionX: 0,

      "& .descriptionText": {
        "-webkit-line-clamp": "unset",
      },
    },
  },
}));

const EventConfiguration = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [events, setEvents] = useState([]);
  const [confirmBox, showConfirmBox] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const getEvents = async () => {
    await props.fetchEvents("?application=Workflow Input Center&page=1");
  };
  useEffect(() => {
    getEvents();
  }, []);

  useEffect(() => {
    setEvents(
      props.events.map((item) => {
        item.products = item.product;
        return item;
      })
    );
  }, [props.events]);

  const deleteRequest = (event) => {
    setSelectedEvent(event);
    showConfirmBox(true);
  };

  const handleDelete = async (event) => {
    try {
      await deleteEvent(event.noe_code);
      getEvents();
      props.addSnack({
        message: "Deleted successfully",
        options: {
          variant: "success",
        },
      });
      showConfirmBox(false);
    } catch (err) {
      props.addSnack({
        message: "Unable to delete please try again",
        options: {
          variant: "error",
        },
      });
    }
  };

  const renderEvent = (event) => {
    return (
      // noe_code is the primary key for all the events coming from backend
      <Grid item xs={6}>
        <Paper
          elevation={3}
          key={event.noe_code}
          className={`${globalClasses.paper} ${classes.events} ${
            event.special_classification === "actionable"
              ? "actionable"
              : "informational"
          }`}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            className={globalClasses.marginBottom}
          >
            <Typography variant="h4" component="h6">
              {event.subject}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              {event.special_classification === "actionable" ? (
                <Chip
                  label="Actionable"
                  variant="contained"
                  color="warning"
                  icon={<NorthEastTwoToneIcon />}
                />
              ) : (
                <Chip
                  label="Informational"
                  variant="contained"
                  color="primary"
                  icon={<InfoOutlinedIcon />}
                />
              )}
              <IconButton
                onClick={() => {
                  props.showAddEvent(event);
                }}
                color={`${
                  event.special_classification === "actionable"
                    ? "warning"
                    : "primary"
                }`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => {
                  deleteRequest(event);
                }}
                color={`${
                  event.special_classification === "actionable"
                    ? "warning"
                    : "primary"
                }`}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <div className="description">
            <Typography className="descriptionText">
              {event.description}
            </Typography>
          </div>
        </Paper>
      </Grid>
    );
  };

  return (
    <>
      {confirmBox && (
        <ConfirmBox
          text={"Are you sure you want to delete that event ?"}
          title={"Delete Event"}
          onClose={() => {
            showConfirmBox(false);
          }}
          onConfirm={() => handleDelete(selectedEvent)}
        />
      )}
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        rowSpacing={1}
        columnSpacing={{ xs: 1, sm: 2, md: 3 }}
      >
        {events &&
          events.map((item, key) => {
            return renderEvent(item);
          })}
      </Grid>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    events: state.eventConfigurationReducer.events,
  };
};
const mapActionsToProps = {
  fetchEvents,
  addSnack,
};
export default connect(mapStateToProps, mapActionsToProps)(EventConfiguration);
