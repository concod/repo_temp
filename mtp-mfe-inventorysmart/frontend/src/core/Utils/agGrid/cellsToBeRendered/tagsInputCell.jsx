import PropTypes from "prop-types";
import { Autocomplete, TextField } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Chip } from "@mui/material";

const useStyles = makeStyles((theme) => ({
  tagBox: {
    height: "100%",
    display: "flex",
    overflow: "scroll",
    "& .MuiOutlinedInput-root": {
      paddingRight: "14px !important",
    },
  },
  chip: {},
  textField: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100 %",
    },
    "& .MuiOutlinedInput-adornedEnd": {
      padding: "0px",
    },
  },
}));

export default function TagsInput({ ...props }) {
  const classes = useStyles();
  const { selectedTags, placeholder, tags, onBlur, ...other } = props;

  function handleInputChange(event, value) {
    props.handleInputTagChange(event, value);
  }

  return (
    <Autocomplete
      className={classes.tagBox}
      // limitTags={2}
      size="small"
      clearIcon={false}
      options={[]}
      freeSolo
      multiple
      defaultValue={tags}
      onBlur={onBlur}
      onChange={(event, val) => handleInputChange(event, val)}
      renderTags={(value, props) => {
        return value.map((option, index) => (
          <Chip label={option} {...props({ index })} />
        ));
      }}
      renderInput={(params) => {
        return <TextField style={{ padding: "0 !important" }} {...params} />;
      }}
    />
  );
}
TagsInput.defaultProps = {
  tags: [],
};
TagsInput.propTypes = {
  selectedTags: PropTypes.func.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
};
