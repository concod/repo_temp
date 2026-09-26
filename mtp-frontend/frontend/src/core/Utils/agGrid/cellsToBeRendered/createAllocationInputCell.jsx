import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles(() => ({
    textField: {
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',            
        paddingBottom: 0,
        marginTop: 0,
    }
  }));

const InputCellCreateAllocation = React.memo((props) => {
    
    const [inputValue, setInputValue] = useState(null);
    const classes = useStyles();

    useEffect(() => {
        setInputValue(props.value);
      }, [props.value]);

  return (
    <div>
      <TextField
            variant="outlined"
            type="number"
            className={classes.textField}
            InputProps={{
                inputProps: { 
                    max: 100, min: 0 
                },
            }}
            value={inputValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            disabled={props.disabled}
      />
    </div>
  );
});

export default InputCellCreateAllocation;
