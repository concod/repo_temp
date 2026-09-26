import {
  Container,
  Grid,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { UNIT_TYPES } from "../../../../config/constants/index";
import { connect } from "react-redux";
import {
  setUnitDefnType,
  setUnitDefnName,
  isNameValid,
  changeNameValidStatus,
} from "../product-unit-definition-service";
import { useCallback, useState } from "react";
import _ from "lodash";
import { useLocation } from "react-router-dom-v5-compat";

const useStyles = makeStyles({
  grid: {
    display: "flex",
    alignItems: "center",
  },
  container: {
    backgroundColor: "white",
    margin: "20px 0px",
    padding: 25,
  },
  input: {
    height: 40,
  },
  errorStyle: {
    color: "red",
  },
  successStyle: {
    color: "green",
  },
});
const UnitDefnSelection = (props) => {
  let location = useLocation();
  const checkStatus = () => {
    return location.pathname.includes("edit");
  };
  const classes = useStyles();
  const [isNameAvailable, setisNameAvailable] = useState(checkStatus());

  const debounceFn = useCallback(
    _.debounce(async (val, Id) => {
      try {
        const res = await props.isNameValid(
          val,
          Id || location.pathname.split("/")[3]
        );
        if (res.data.data.name_available === true) {
          setisNameAvailable(true);
          props.changeNameValidStatus(true);
        } else {
          props.changeNameValidStatus(false);
          setisNameAvailable(false);
        }
      } catch (error) {
        //Error
      }
    }, 1000),
    []
  );
  const onChange = (event) => {
    props.setUnitDefnType(event.target.value);
  };

  const onNameChange = (event) => {
    if (location.pathname.includes("edit")) {
      if (event.target.value === props.editName) {
        setisNameAvailable(true);
        props.changeNameValidStatus(true);
        props.setUnitDefnName(event.target.value);
        return;
      }
    }
    if (event.target.value === "") {
      setisNameAvailable(false);
      props.changeNameValidStatus(false);
    } else {
      debounceFn(event.target.value, props.styleId);
    }
    props.setUnitDefnName(event.target.value);
  };
  return (
    <>
      <Container classes={{ root: classes.container }} maxWidth={false}>
        <Grid container>
          <Grid className={classes.grid} item xs={2}>
            <Typography>Unit Definition: </Typography>
          </Grid>
          <Grid className={classes.grid} item xs={9}>
            <UnitTypes value={props.unit_type} onChange={onChange} />
          </Grid>
          <Grid className={classes.grid} item xs={2}>
            <Typography>Definition Name: </Typography>
          </Grid>
          <Grid item xs={9}>
            {" "}
            <TextField
              id="productUnitDefnNameInp"
              variant="outlined"
              placeholder="enter here"
              value={props.unit_name}
              onChange={onNameChange}
              InputProps={{
                className: classes.input,
              }}
              FormHelperTextProps={{
                classes: {
                  root: !isNameAvailable
                    ? classes.errorStyle
                    : classes.successStyle,
                },
              }}
              helperText={
                props.unit_name === ""
                  ? ""
                  : isNameAvailable
                  ? ""
                  : "*Name already used"
              }
            />
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

const UnitTypes = (props) => {
  return (
    <RadioGroup
      id="productUnitDefnUntTypesGrp"
      value={props.value}
      onChange={props.onChange}
      row
      aria-label="unit-type"
      name="row-radio-buttons-group"
    >
      {UNIT_TYPES.map((type) => {
        return (
          <FormControlLabel
            key={`productUnitDefnUntLabel${type.value}`}
            id={`productUnitDefnUntLabel${type.value}`}
            value={type.value}
            control={
              <Radio
                id={`productUnitDefnUntRadio${type.value}`}
                size="small"
                color="primary"
              />
            }
            label={type.label}
          />
        );
      })}
    </RadioGroup>
  );
};

const mapStateToProps = (state) => {
  return {
    unit_type: state.UnitDefnReducer.unitDefnType,
    unit_name: state.UnitDefnReducer.unitDefnName,
    styleId: state.UnitDefnReducer.selectedStyleId,
    editName: state.UnitDefnReducer.editName,
  };
};

const mapActionsToProps = {
  setUnitDefnType,
  setUnitDefnName,
  isNameValid,
  changeNameValidStatus,
};
export default connect(mapStateToProps, mapActionsToProps)(UnitDefnSelection);
