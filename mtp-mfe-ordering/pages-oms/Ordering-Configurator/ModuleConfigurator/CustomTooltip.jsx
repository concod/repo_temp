import React, { useState } from "react";
import { Button, Tooltip, Typography } from "@mui/material";
import ListItems from "./ListItems";
import { withStyles } from "@mui/styles";
import { useStyles } from "./styles";
import globalStyles from "core/Styles/globalStyles";

const CustomTooltip = ({ cardSubHeader, tooltipData }) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const handleClose = (e) => {
    if (open) {
      setOpen(false);
    }
    e.stopPropagation();
    return null;
  };

  const TextOnlyTooltip = withStyles((theme) => ({
    tooltip: {
      backgroundColor: theme.palette.common.white,
      padding: "0",
      boxShadow: "0 0.25rem 0.75rem 0 rgba(0, 0, 0, 0.10)",
    },
    arrow: {
      color: theme.palette.colours.tooltipArrow,
    },
  }))(Tooltip);

  return (
    <TextOnlyTooltip
      open={open}
      title={<ListItems handleClose={handleClose} tooltipData={tooltipData} />}
      placement="right-start"
      arrow
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, -14],
              },
            },
          ],
        },
      }}
    >
      <Button
        className={classes.customButton}
        onClick={(e) => {
          setOpen(true);
          e.stopPropagation();
        }}
      >
        <Typography
          className={`${classes.cardSubHeader} ${globalClasses.whiteSpace}`}
        >
          {cardSubHeader}
        </Typography>
      </Button>
    </TextOnlyTooltip>
  );
};

export default CustomTooltip;
