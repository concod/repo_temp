import React, { useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { Tabs, Tab, Typography, Box, Container } from "@mui/material";
import { Switch } from "impact-ui-v3";
import PropTypes from "prop-types";
import NotificationTab from "./notification-tab-inbox";
import { connect } from "react-redux";
import {
  getNotifications,
  onNotificationAction,
  setNotifications,
} from "../../../actions/notificationActions";
import globalStyles from "core/Styles/globalStyles";
import "./noti-styles.scss";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      // hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={0}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme) => ({
  closeSnackBtn: {
    "&:hover": {
      cursor: "pointer",
    },
  },
  noDataBox: {
    textAlign: "center",
    padding: "5rem",
  },
  linkButton: {
    textDecoration: "none",
  },
  footer: {
    textAlign: "center",
    background: theme.palette.background.primary,
    padding: "0.5rem",
  },
}));

const Notification = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [value, setValue] = React.useState(0);
  const [notificationsData, setData] = React.useState([]);
  const tabsName = ["all", "info", "action", "old"];
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  useEffect(() => {
    setData(props.notificationData);
  }, [props.notificationData]);

  return (
    <>
      <Container
        maxWidth={false}
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} noti-container-new`}
      >
        <Typography component="span" variant="h2">
          Notifications
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Switch
            name="checkedB"
            value={!props.dnd}
            onChange={(e) => {
              props.fetchNotifications(
                JSON.stringify({
                  action: "dnd",
                  dnd: !e.target.checked,
                })
              );
            }}
          />
        </Box>
      </Container>
      <Container maxWidth={false}>
        <Tabs
          value={value}
          onChange={handleChange}
          textColor="primary"
          aria-label="simple tabs example"
        >
          <Tab label="All" {...a11yProps(0)} />
          <Tab label="Info" {...a11yProps(1)} />
          <Tab label="Action" {...a11yProps(2)} />
          <Tab label="Old Notification" {...a11yProps(3)} />
        </Tabs>
        {tabsName.map((item, key) => {
          return (
            <TabPanel value={value} index={key}>
              <NotificationTab
                {...props}
                notificationsData={notificationsData}
                characterLimit={props.characterLimit}
                performAction={props.performAction}
                setNotifications={props.setNotifications}
                getNotification={props.getNotification}
                tabName={item}
                notificationCount={props.notificationCount}
                fetchNotifications={props.fetchNotifications}
              ></NotificationTab>
            </TabPanel>
          );
        })}

        {props.notificationData.length === 0 && (
          <div className={classes.noDataBox}>
            There are no notifications available
          </div>
        )}
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    userNotificationTypes: state.notificationReducer.userNotificationTypes,
    notificationData: state.notificationReducer.notificationData,
    notificationCount: state.notificationReducer.notificationCount,
    dnd: state.notificationReducer.dnd,
    websocket: state.notificationReducer.wsClient,
  };
};

const mapActionsToProps = (dispatch) => {
  return {
    getNotification: (pageIndex, pageSize, filterOptions) =>
      dispatch(getNotifications(pageIndex, pageSize, filterOptions)),
    performAction: (notification, action) =>
      dispatch(onNotificationAction(notification, action)),
    setNotifications: (notifications) =>
      dispatch(setNotifications(notifications)),
  };
};

export default connect(mapStateToProps, mapActionsToProps)(Notification);
