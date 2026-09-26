import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { setModuleConfigName } from "../../../actions/filterAction";
const useStyles = makeStyles((_theme) => ({
  configNameInputField: {
    width: "100%",
  },
}));
const ConfigName = (props) => {
  const [value, setValue] = useState("");
  const classes = useStyles();
  const onChange = (event) => {
    setValue(event.target.value);
  };

  useEffect(() => {
    props.setConfigName(value);
  }, [value]);
  return (
    <div>
      <Typography gutterBottom={true} variant="h5">
        Enter Configuration Name
      </Typography>

      <TextField
        className={classes.configNameInputField}
        id="outlined-basic"
        variant="outlined"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};
const mapActionsToProps = {
  setConfigName: setModuleConfigName,
};
export default connect(null, mapActionsToProps)(ConfigName);
