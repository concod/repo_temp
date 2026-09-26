import React from "react";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: pxToRem(8)
  },
  text: {
    flex: "1 1 auto"
  },
  breachIcon: {
    fontSize: pxToRem(16),
    flex: "0 0 auto",
    color: colours.errorInfo
  }
}));

const BreachStatusCell = (props) => {
  const classes = useStyles();
  const { value, data, colDef } = props;
  
  const showBreachIcon = colDef?.extra?.showBreachIcon || false;
  const breachField = colDef?.extra?.breachField || 'isBreach';
  
  const isBreach = typeof showBreachIcon === 'function' 
    ? showBreachIcon(data) 
    : data?.[breachField];
  
  return (
    <div className={classes.container}>
      <span className={classes.text}>
        {value || ""}
      </span>
      {isBreach && (
        <WarningAmberIcon className={classes.breachIcon} />
      )}
    </div>
  );
};

export default BreachStatusCell;
