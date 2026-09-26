import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { blue } from "@mui/material/colors";

const useStyles = makeStyles(() => ({
  checked: {
    color: `${blue[400]} !important`,
  },
  root: {
    padding: "5px 9px",
  },
  label: {
    fontSize: "0.8rem",
    color: "rgba(0, 0, 0, 0.54)",
    letterSpacing: "0.03333em",
  },
}));

const CustomCheckBox = ({ label, value, checked, onChange, count }) => {
  const classes = useStyles();

  return (
    <FormGroup row>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={onChange}
            name={value + label}
            classes={{
              checked: classes.checked,
              root: classes.root,
            }}
          />
        }
        classes={{
          label: classes.label,
        }}
        label={value + (count ? ` (${count})` : ``)}
      />
    </FormGroup>
  );
};

export default CustomCheckBox;
