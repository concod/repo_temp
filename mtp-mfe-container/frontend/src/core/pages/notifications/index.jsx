import makeStyles from "@mui/styles/makeStyles";
import Notification from "./components/notifications-model";
import Paper from "@mui/material/Paper";

const useStyles = makeStyles({
  container: {
    padding: "1rem 6rem 4rem 6rem",
  },
});

const NotificationPage = (props) => {
  const classes = useStyles();

  return (
    <>
      <div className={classes.container}>
        <Paper elevation={0}>
          <Notification {...props}></Notification>
        </Paper>
      </div>
    </>
  );
};

export default NotificationPage;
