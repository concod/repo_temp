import React, { useEffect, useState } from "react";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import CloseIcon from "@mui/icons-material/Close";
import DoneIcon from "@mui/icons-material/Done";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
import makeStyles from "@mui/styles/makeStyles";
const useStyles = makeStyles((theme) => ({
  paperRoot: {
    position: "absolute",
    zIndex: 1,
  },
  success: {
    color: "green",
  },
  failure: {
    color: "red",
  },
}));
//default
//1. MinUpper - 1
//2. MinLower - 1
//3. MinSpl - 0
//4. MinDigits - 0
//5. MinLength - 6
//6. isDigitsAllowed - true
//7. isSplChrsAllowed - false
const Validator = React.forwardRef(({ checklist }, ref) => {
  //Pass a reference of Input tag to this component
  //Using that reference, we dynamically change the UI
  //List of checklist Items ->
  const classes = useStyles();
  return (
    <>
      {document.activeElement === ref.current && (
        <Paper style={{ position: "absolute", zIndex: 1 }} elevation={3}>
          <List>
            {checklist.map((check) => {
              return (
                <>
                  <ListItem
                    classes={{
                      root: check.status ? classes.success : classes.failure,
                    }}
                  >
                    <ListItemIcon>
                      {check.status ? (
                        <DoneIcon className={classes.success} />
                      ) : (
                        <CloseIcon className={classes.failure} />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={check.msg} />
                  </ListItem>
                </>
              );
            })}
          </List>
        </Paper>
      )}
    </>
  );
});

export default Validator;
