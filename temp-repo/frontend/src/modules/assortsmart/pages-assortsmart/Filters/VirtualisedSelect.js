import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import withStyles from "@mui/styles/withStyles";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    listStyle: "none",
    padding: theme.spacing(0.5),
    margin: 0,
    minHeight: "40px",
  },
}));

const Tag = withStyles((theme) => ({
  root: {
    margin: theme.spacing(0.5),
    backgroundColor: "rgba(0, 126, 255, 0.08)",
    borderRadius: "2px",
    border: "1px solid rgba(0, 126, 255, 0.24)",
    color: "#44677b",
    fontSize: "0.9em",
  },
  deleteIcon: {
    cursor: "pointer",
    color: "#44677b",
  },
}))(Chip);

export default function VirtualisedSelect(props) {
  const classes = useStyles();

  const handleDelete = (dataToDelete) => () => {
    props.onChange(
      props.value.filter(
        (chip) => chip.plan_bud_opt_id !== dataToDelete.plan_bud_opt_id
      )
    );
  };

  return (
    <Paper component="ul" className={classes.root}>
      {props.value?.map((data) => {
        let icon;
        return (
          <li key={data.key}>
            <Tag icon={icon} label={data.label} onDelete={handleDelete(data)} />
          </li>
        );
      })}
    </Paper>
  );
}
