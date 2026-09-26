import React from "react";
import Tooltip from "@mui/material/Tooltip";

export default function ArrowTooltips({
  title,
  children,
  placement = "right-end",
  isVisible = true,
}) {
  const [open, setOpen] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  return (
    <Tooltip
      open={open && isVisible}
      onClose={handleClose}
      onOpen={handleOpen}
      title={title}
      arrow
      placement={placement}
    >
      {children}
    </Tooltip>
  );
}
