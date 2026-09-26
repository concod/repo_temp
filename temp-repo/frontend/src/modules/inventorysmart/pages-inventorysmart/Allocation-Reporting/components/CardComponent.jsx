import React from "react";

import { Grid, Typography } from "@mui/material";
import Icon from "@mui/material/Icon";

import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const CardComponent = (props) => {
  const classes = useStyles();

  return (
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="stretch"
      style={{ position: "relative" }}
    >
      <Grid item xs={2}>
        <Icon sx={{ color: `${props.kpiItem.color}` }}>
          {props.kpiItem.icon}
        </Icon>
      </Grid>
      <Grid item xs={10}>
        <Typography variant={"h4"}>{props.kpiItem.label}</Typography>
        <Typography variant={"h3"}>{props.kpiItem.count} </Typography>
      </Grid>
    </Grid>
  );
};

export default CardComponent;
