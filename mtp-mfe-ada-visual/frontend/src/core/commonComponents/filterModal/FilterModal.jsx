import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";
import { GlobalStyles, Grid } from "@mui/material";
import { Button } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  filterWrapper: {
    position: (props) => (!props.isModalFixedTop ? "relative" : ""),
    zIndex: 2,
  },
  filtertOverlay: {
    background: theme.palette.action.active,
    height: (props) => {
      return props.isModalFixedTop
        ? `calc(100vh - ${theme.customVariables.headerHeight} - 2rem)`
        : `calc(100vh - ${props.offsetHeight}px - 1rem)`;
    },
    left: 0,
    overflowY: (props) => (props.isModalFixedTop ? "scroll" : "unset"),
    position: "absolute",
    top: 0,
    transition: (props) =>
      `${
        !props.isConfigModal
          ? "transform 400ms ease-in-out, visibility 0s linear 400ms"
          : "none"
      }`,
    transform: "translateY(-150%)",
    visibility: "hidden",
    width: "100%",
    zIndex: 901,

    "& .dropdown-button + div": {
      position: "fixed !important",
      minWidth: "unset !important",
      width: "min(33%, 18.75rem)",
    },
    boxShadow: "0px 0px 3px #00000029",
  },
  modalOpen: {
    top: (props) => {
      return props.isModalFixedTop
        ? `calc(${props.scrollHeight}px + ${
            props.showFilterButton ? 2.5 : 2
          }rem)`
        : "0";
    },
    transform: (props) =>
      `translateY(${
        props.isModalFixedTop ? theme.customVariables.headerHeight : "1rem"
      })`,
    transition: (props) =>
      `${
        !props.isConfigModal
          ? "transform 400ms ease-in-out, visibility 0s linear"
          : "none"
      }`,
    visibility: "visible",
  },
  modalContainer: {
    background: theme.palette.common.white,
    bottom: (props) => `${props.isConfigModal ? "0" : "unset"}`,
    maxHeight: (props) => `${props.isConfigModal ? "unset" : "80%"}`,
    overflowY: (props) => (props.isOverflowVisible ? "visible" : "scroll"),
    right: (props) => `${props.isConfigModal ? "0" : "unset"}`,
    padding: (props) => `${!props.isConfigModal ? "1rem" : "0"}`,
    position: (props) => `${props.isConfigModal ? "absolute" : "static"}`,
    width: (props) => `${props.isConfigModal ? "min(100%, 30rem)" : "100%"}`,
    height: (props) => `${props.isConfigModal ? "auto" : "unset"}`,
  },
  closeText: {
    color: theme.palette.primary.main,
  },
}));

const FilterModal = ({
  open,
  isModalFixedTop,
  isConfigModal,
  closeOnOverlayClick,
  children,
  isOverflowVisible,
  showFilterButton,
}) => {
  const globalClasses = GlobalStyles();

  const [offsetHeight, setOffsetHeight] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const classes = useStyles({
    offsetHeight,
    isModalFixedTop,
    scrollHeight,
    isConfigModal,
    isOverflowVisible,
    showFilterButton,
  });
  const ref = useRef();

  useEffect(() => {
    return () => {
      document.body.classList.remove("modalOpen");
    };
  }, []);

  useEffect(() => {
    if (!isModalFixedTop) {
      document.body.style.overflow = open ? "hidden" : "unset";
      setOffsetHeight(ref.current.offsetTop);
    } else {
      open
        ? document.body.classList.add("modalOpen")
        : document.body.classList.remove("modalOpen");
      setScrollHeight(window.scrollY);
    }
  }, [open]);

  /**
   * @func
   * @desc Handle overlay Click
   */
  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      closeOnOverlayClick();
    }
  };

  return (
    <div className={classes.filterWrapper} ref={ref}>
      <div
        className={`${classes.filtertOverlay} ${open ? classes.modalOpen : ""}`}
        onClick={() => handleOverlayClick()}
      >
        <div
          className={classes.modalContainer}
          onClick={(e) => e.stopPropagation()}
        >
          {!isConfigModal && (
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="stretch"
              className={globalClasses.marginVertical1rem}
            >
              <Grid>
                <h3>Filters</h3>
              </Grid>
              <Grid>
                <Button
                  variant="url"
                  className={classes.closeText}
                  onClick={() => handleOverlayClick()}
                >
                  Close Filter
                </Button>
              </Grid>
            </Grid>
          )}
          <div className={classes.modalContainerBody}>{children}</div>
        </div>
      </div>
    </div>
  );
};

FilterModal.defaultProps = {
  open: false,
  isModalFixedTop: false,
  isConfigModal: false,
};

FilterModal.propTypes = {
  open: PropTypes.bool,
  isModalFixedTop: PropTypes.bool,
  isConfigModal: PropTypes.bool,
  closeOnOverlayClick: PropTypes.func,
};

export default FilterModal;
