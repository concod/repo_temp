import * as React from "react";
import { styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import { uniqueId } from "lodash";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowTooltips from "core/Utils/ArrowTooltips";
import { makeStyles } from "@mui/styles";

const ListItem = styled("li")(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

const ChipsList = ({
  title,
  data,
  handleDelete,
  handleAvatar,
  handleSelected,
  handleToolTipText,
}) => {
  const classes = useStyles();

  return (
    <Paper className={classes.chipContainer} component="ul">
      {title && <span className={classes.title}>{title}</span>}
      {data.map((chip, index) => {
        return (
          <ArrowTooltips title={handleToolTipText(chip)} placement="top">
            <ListItem key={uniqueId()}>
              <Chip
                size="medium"
                onDelete={() => handleDelete(chip)}
                label={
                  <span className={classes.chiplabel}>
                    <span className={classes.chipAvatar}>
                      {handleAvatar(chip, index)}
                    </span>
                    <span onClick={() => handleSelected(chip)}>
                      <AddCircleIcon className={classes.selectIcon} />
                    </span>
                  </span>
                }
              />
            </ListItem>
          </ArrowTooltips>
        );
      })}
    </Paper>
  );
};

export default ChipsList;

const useStyles = makeStyles((theme) => ({
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    listStyle: "none",
    p: 0.5,
    m: 0,
    border: `1px solid ${theme.palette.colours.labelColour}`,
    padding: "10px",
    marginTop: "20px",
  },
  chiplabel: {
    display: "flex",
    alignItems: "center",
    marginTop: "3px",
  },
  chipAvatar: {
    fontSize: "14px",
    color: "rgb(0 0 0 / 63%)",
    marginTop: "-2px",
    marginRight: "4px",
  },
  selectIcon: {
    color: "rgba(0, 0, 0, 0.26)",
    fontSize: 22,
  },
  title: {
    alignSelf: "center",
    marginRight: 10,
  },
}));
