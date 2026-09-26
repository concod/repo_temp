import React, { useEffect, useLayoutEffect, useState } from "react";
import PropTypes from "prop-types";
import { Portal } from "@mui/material";
import { useTranslation } from "impact-ui-v3";
import useStyles from "./kpiStyles";
import { formatValue } from "./kpiUtils";
import IconClose from "assets/impactv3/icon-close.svg";

const isRectInViewport = (rect) =>
  rect.bottom > 0 &&
  rect.top < window.innerHeight &&
  rect.right > 0 &&
  rect.left < window.innerWidth;

const SizeSplitPopover = ({ open, dcData, buttonId, onClose, arrowRefs }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonId) return undefined;

    const updatePosition = () => {
      const buttonEl = arrowRefs.current && arrowRefs.current[buttonId];
      if (!buttonEl) {
        onClose();
        return;
      }
      const rect = buttonEl.getBoundingClientRect();
      if (!isRectInViewport(rect)) {
        onClose();
        return;
      }
      const chipEl = buttonEl.parentElement;
      const chipRect = chipEl ? chipEl.getBoundingClientRect() : rect;
      setPosition({ top: rect.bottom, left: chipRect.left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, buttonId, arrowRefs, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (
        event.target.closest(".popover-content") ||
        Object.values(arrowRefs.current || {}).some(
          (ref) => ref && ref.contains(event.target)
        )
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, arrowRefs]);

  if (!open || !dcData || !dcData.sizeDetails || !dcData.sizeDetails.length) {
    return null;
  }

  return (
    <Portal>
      <div
        className={`popover-content ${classes.sizePopover}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className={classes.popoverInner}>
          <div className={classes.popoverHeader}>
            <span className={classes.popoverTitle}>
              {t("inventorysmart.viewSizes")}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("inventorysmart.close")}
              className={classes.popoverCloseButton}
            >
              <IconClose className={classes.popoverCloseIcon} />
            </button>
          </div>
          <div className={classes.popoverChipWrap}>
            {dcData.sizeDetails.map((size, index) => (
              <div
                key={size.column_name || index}
                className={classes.popoverChip}
              >
                <div className={classes.popoverChipInner}>
                  <span className={classes.popoverChipLabel}>{size.label}</span>
                  <span className={classes.popoverChipValue}>
                    {formatValue(size.value, size.type, size.extra)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
};

SizeSplitPopover.propTypes = {
  open: PropTypes.bool,
  dcData: PropTypes.object,
  buttonId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  arrowRefs: PropTypes.object.isRequired,
};

SizeSplitPopover.defaultProps = {
  open: false,
  dcData: null,
  buttonId: null,
};

export default SizeSplitPopover;
