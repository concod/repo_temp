import {
  Paper,
  FormControl,
  FormLabel,
  TextField,
  IconButton,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Search } from "@mui/icons-material";
import { useState } from "react";
const useStyles = makeStyles({
  paperStyle: {
    border: "1px solid #e3ecf4",
    marginTop: 20,
    paddingLeft: 25,
    display: "flex",
    alignItems: "center",
    height: 120,
  },
  formStyle: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  inputStyle: {
    width: "80%",
    marginRight: "10px",
  },
  searchIcon: {
    width: "10%",
    borderRadius: 0,
    backgroundColor: "#41A6F7",
    color: "white",
    "&:hover": {
      background: "#41A6F7",
    },
  },
});
const SearchByPlan = (props) => {
  const classes = useStyles();
  const [searchInput, setsearchInput] = useState("");
  const onChange = (event) => {
    setsearchInput(event.target.value);
  };
  const onClickSearch = () => {
    if (props.searchCallBack) {
      props.searchCallBack(searchInput);
    }
  };
  return (
    <>
      <Paper elevation={0} className={classes.paperStyle}>
        <FormControl className={classes.formStyle} component="fieldset">
          <FormLabel component="legend">Search By Plan Name</FormLabel>
          <TextField
            className={classes.inputStyle}
            hiddenLabel
            size="small"
            id="filled-hidden-label-normal"
            variant="outlined"
            value={searchInput}
            onChange={onChange}
          />
          <IconButton
            variant="contained"
            color="primary"
            onClick={onClickSearch}
            className={classes.searchIcon}
            size="large"
          >
            <Search fontSize="inherit" />
          </IconButton>
        </FormControl>
      </Paper>
    </>
  );
};

export default SearchByPlan;
