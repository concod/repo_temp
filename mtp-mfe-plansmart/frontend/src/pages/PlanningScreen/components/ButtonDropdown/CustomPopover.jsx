import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import "./CustomPopover.css";

const Popover = ({
  triggerElement,
  triggerRef,
  show,
  setShow,
  children,
  style,
  positionStyle = null,
  tooltipPositionStyle = null,
  tooltip = false
}) => {
  const popoverContentRef = useRef();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: -6, left: 3 });

  const getPosition = () => {
    const positions = {};

    if (
      !triggerRef ||
      !triggerRef.current ||
      !popoverContentRef ||
      !popoverContentRef.current
    )
      return { top: 0, left: 0 };

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverContentRef.current.getBoundingClientRect();

    let top = triggerRect.height;
    let left = -3;
    const tooltipLeft = triggerRect.width / 2;

    if (positionStyle) {
      positions.popover = { ...positionStyle };
      if (tooltipPositionStyle) positions.tooltip = { ...tooltipPositionStyle };
      positions.tooltip = {
        top: Number(positionStyle?.top) - 6,
        left: tooltipLeft
      };
      return positions;
    }

    if (window.innerWidth - triggerRect.right < popoverRect.width) {
      const diff = popoverRect.width - (window.innerWidth - triggerRect.right);
      left = -diff;
    }

    if (window.innerHeight - (triggerRect.bottom + 14) < popoverRect.height) {
      const diff =
        popoverRect.height - (window.innerHeight - triggerRect.bottom);
      top = -diff;
    }

    positions.popover = { top: top + 14, left: left };
    positions.tooltip = { top: top + 8, left: tooltipLeft };

    return positions;
  };

  const handleClickOutside = (event) => {
    if (
      popoverContentRef.current &&
      !popoverContentRef.current.contains(event.target) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target)
    ) {
      setShow(false);
    }
  };

  useLayoutEffect(() => {
    if (show) {
      const positions = getPosition();
      setPosition(positions?.popover);
      setTooltipPosition(positions?.tooltip);
    }
  }, [show]);

  useEffect(() => {
    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  return (
    <>
      <div className="popover-container">
        <div className="popover-trigger-element" onClick={() => setShow(!show)}>
          {triggerElement}
        </div>
        {show && (
          <>
            {tooltip && (
              <div
                className="popover-tooltip"
                style={{ ...tooltipPosition }}
              ></div>
            )}
            <div
              ref={popoverContentRef}
              className="popover-content"
              style={{
                ...style,
                ...position
              }}
            >
              {children}
            </div>
          </>
        )}
      </div>
    </>
  );
};

Popover.propTypes = {
  triggerElement: PropTypes.node.isRequired,
  triggerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  show: PropTypes.bool.isRequired,
  setShow: PropTypes.func.isRequired,
  children: PropTypes.node,
  style: PropTypes.object,
  positionStyle: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number
  }),
  tooltip: PropTypes.bool,
  tooltipPositionStyle: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number
  })
};

Popover.defaultProps = {
  style: {},
  positionStyle: null,
  tooltipPositionStyle: null
};

export default Popover;
