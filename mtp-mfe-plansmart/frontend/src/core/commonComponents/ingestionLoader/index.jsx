import React from "react";
import BoxStrokeAnimation from "assets/boxStrokeAnimation.svg";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";

const useStyles = makeStyles((theme) => ({
  container: {
    background: "rgba(255, 255, 255, 0.7)",
    height: "100%",
    position: "absolute",
    top: 0,
    width: "100%",
  },
  innerBlock: {
    left: "50%",
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
  },
  image: {
    height: "12rem",
    width: "12rem",
  },
}));

function IngestionLoader() {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div className={classes.container}>
      <div className={`${classes.innerBlock} ${globalClasses.centerAlign} ${globalClasses.flexColumn}`}>
        <BoxStrokeAnimation viewBox="0 0 100 100" className={`${classes.image} ${globalClasses.marginBottom}`}/>
        <Typography variant="body" component="h4">Ingestion in-progress...</Typography>
        <Typography variant="body" component="h4">Please reload page after sometime</Typography>
      </div>
    </div>
  );
}

export default IngestionLoader;
