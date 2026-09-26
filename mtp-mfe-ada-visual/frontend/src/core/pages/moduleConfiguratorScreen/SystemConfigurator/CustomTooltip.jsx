import { useState, useEffect, useRef } from "react";
import { Button, Tooltip, Typography } from "@mui/material";
import ListItems from "./ListItems";
import { withStyles } from "@mui/styles";
import { useStyles } from "./styles";
import globalStyles from "core/Styles/globalStyles";

const CustomTooltip = ({ cardSubHeader, tooltipData }) => {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef(null);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const handleClose = (e) => {
    if (open) {
      setOpen(false);
    }
    if (e) {
    e.stopPropagation();
    }
    return null;
  };

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open) {
        // Check if click is on the button (which toggles the tooltip)
        const buttonElement = tooltipRef.current?.querySelector('button');
        const isClickOnButton = buttonElement && buttonElement.contains(event.target);
        
        // Check if click is on any tooltip element (MUI renders tooltips in a portal)
        // Check multiple selectors to catch tooltip elements
        const isClickOnTooltip = 
          event.target.closest('[role="tooltip"]') || 
          event.target.closest('.MuiTooltip-tooltip') ||
          event.target.closest('[data-popper-placement]') ||
          event.target.closest('[class*="MuiTooltip"]');
        
        // Close if click is outside both button and tooltip
        if (!isClickOnButton && !isClickOnTooltip) {
          setOpen(false);
        }
      }
    };

    if (open) {
      // Use a small delay to avoid immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open]);

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
    <div ref={tooltipRef}>
    <TextOnlyTooltip
      open={open}
        onClose={handleClose}
      title={<ListItems handleClose={handleClose} tooltipData={tooltipData} />}
      placement="right-start"
      arrow
        disableHoverListener
        disableFocusListener
        disableTouchListener
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
            setOpen(!open);
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
    </div>
  );
};

export default CustomTooltip;
