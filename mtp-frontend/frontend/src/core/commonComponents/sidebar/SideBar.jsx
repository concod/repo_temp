import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import Drawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import makeStyles from "@mui/styles/makeStyles";
import withStyles from "@mui/styles/withStyles";
import globalStyles from "core/Styles/globalStyles";
import { setPlanSmartLogoutStatus } from "core/actions/sideBarActions";
import clsx from "clsx";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { NavLink, useLocation } from "react-router-dom-v5-compat";
import { logoutUser } from "../../actions/authActions";
import { isEmpty } from "lodash";

const sidebarIcon = (itemIcon, itemTitle) => {
  if (itemIcon instanceof Object) {
    return itemIcon;
  } else {
    return <img className="icon" src={itemIcon} alt={itemTitle} />;
  }
};

const StyledListItem = withStyles((theme) => ({
  root: {
    "&.Mui-selected, &:hover": {
      backgroundColor: theme.palette.primary.main,
      // a pseudo element to create a "left border" but with "top-right" and "bottom-right" border radius
      "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "0.25rem",
        backgroundColor: theme.palette.colours.highlightBorder,
        borderRadius: "0 0.25rem 0.25rem 0",
      },
    },
  },
}))(ListItem);

const useStyles = makeStyles((theme) => ({
  drawer: {
    borderRight: 0,
    width: theme.customVariables.navWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  "&a": {
    textDecoration: "none",
  },
  drawerOverlay: {
    position: "absolute",
  },
  drawerOpen: {
    width: theme.customVariables.navWidth,
    overflowX: "hidden",

    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.customVariables.closedNavWidth,
    [theme.breakpoints.up("sm")]: {
      width: theme.customVariables.closedNavWidth,
    },
  },
  listPadding: {
    padding: "0.875rem 1.25rem 0.875rem 1.375rem",
  },
  list: {
    flex: 1,
    paddingTop: 0,
  },
  listItemIcon: {
    color: "unset",
    minWidth: "unset",
    width: "1.25rem",

    "& .MuiSvgIcon-root": {
      fontSize: "1.25rem",
    },
  },
  listItem: {
    color: theme.palette.common.white,
    padding: 0,
    "&.Mui-disabled": {
      "& span, & svg": {
        color: theme.palette.text.disabledText,
      },
    },
  },
  listItemText: {
    margin: "0 0 0 2rem",

    "& span": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      font: "normal normal 600 0.875rem/normal Poppins",
    },
  },
  subListItemText: {
    "&:hover": {
      color: theme.palette.primary.light,
    },
  },
  listitemSidebar: {
    display: "flex",
    alignItems: "center",
    color: theme.palette.common.white,
    cursor: "pointer",
  },
  sidebarMenu: {
    width: "100%",
    textDecoration: "none",
  },
  sidebarMiddle: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
  },
  menuIcon: {
    color: theme.palette.common.white,
    fontSize: "1.5rem",
  },
  drawerToggler: {
    height: theme.customVariables.headerHeight,
    padding: "1rem 1.375rem 1rem 1.25rem",
  },
  drawerAccordion: {
    cursor: "default",
    backgroundColor: `${theme.palette.primary.dark}`,
    "box-shadow": "none",
    display: "grid",
    // padding: "1rem 0",
    "&.Mui-expanded": {
      margin: 0,
      padding: 0,
    },

    "&::before": {
      backgroundColor: "transparent",
      height: 0,
      width: 0,
    },

    "& .MuiAccordionSummary-root": {
      color: `${theme.palette.common.white}`,
      border: "0",
      // "padding-left": `${theme.typography.pxToRem(25)}`,

      "&.Mui-expanded .MuiAccordionSummary-content": {
        marginBlock: 0,
      },

      "&::before": {
        backgroundColor: "transparent",
        width: 0,
      },
    },

    "& .MuiAccordionSummary-expandIconWrapper": {
      color: `${theme.palette.common.white}`,
      padding: "0",
      marginRight: "0rem",

      "& .MuiSvgIcon-root": {
        fontSize: "1rem",
      },
    },
    "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
      transform: "rotate(90deg)",
      "-webkit-transform": "rotate(90deg)",
      "-ms-transform": "rotate(90deg)",
    },

    "& .MuiAccordionDetails-root": {
      padding: "0",
      color: `${theme.palette.common.white}`,
      backgroundColor: `${theme.palette.primary.dark}`,
      border: "0",
      "& a": {
        // "padding-left": "2rem",
      },
      "&::before": {
        backgroundColor: "transparent",
        width: 0,
      },
    },
  },
  listItemSelected: {
    "&.Mui-selected, & span": {
      color: `${theme.palette.primary.light} !important`,
    },
  },

  addedMargin: {
    marginLeft: "3.25rem",
  },
}));

const SideBar = ({ options, pathPrefix, logoutUser, props }) => {
  const wrapperRef = useRef();
  const [isActive, setisActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [selectedItemParentIndex, setSelectedItemParentIndex] = useState(0);
  const [expandedAccordionMiddle, setExpandedAccordionMiddle] = useState("");
  const [expandedAccordionBottom, setExpandedAccordionBottom] = useState("");
  const classes = useStyles({ isDrawerOpen: isActive });
  const globalClasses = globalStyles();
  const location = useLocation();

  const toggleSideBarExpansionHandler = () => {
    setisActive(!isActive);
    setExpandedAccordionMiddle("");
    setExpandedAccordionBottom("");
  };

  useEffect(() => {
    setSelectedIndex(findCurrentOrder(options));
    const parentIndex = findParentOfSelectedIndex(options, selectedIndex);
    setSelectedItemParentIndex(parentIndex);
    document.addEventListener("mousedown", handleClick, false);
    return () => {
      document.removeEventListener("mousedown", handleClick, false);
    };
  }, []);

  useEffect(() => {
    if (options?.length) {
      setSelectedIndex(findCurrentOrder(options));
      const parentIndex = findParentOfSelectedIndex(options, selectedIndex);
      setSelectedItemParentIndex(parentIndex);
    }
  }, [options,location.pathname]);

  /**
   * @func
   * @desc Find the order for current location in the provided route Options
   * @param {Object} optionList
   */
  const findCurrentOrder = (optionList) => {
    let order;
    optionList.some((option) => {
      if (option.isParent) {
        const childOrder = findCurrentOrder(option.childList);
        if (childOrder) {
          order = childOrder;
          return true;
        }
      } else if (option.link === location.pathname) {
        order = option.order;
        return true;
      }
    });
    return order;
  };

  useEffect(() => {
    props?.setUserPlatformScreen(`${location.pathname.split("/")[2]}`);
  }, [location, selectedIndex]);

  const handleClick = (e) => {
    if (wrapperRef.current.contains(e.target)) {
      return;
    }
    setisActive(false);
    setExpandedAccordionMiddle("");
    setExpandedAccordionBottom("");
  };
  const handleListItemClick = async (_event, order) => {
    props.setActiveScreenName(null);
    sessionStorage.setItem("activeScreenName", null);
    setSelectedIndex(order);
    const parentIndex = findParentOfSelectedIndex(options, order);
    setSelectedItemParentIndex(parentIndex);
  };

  /**
   * openLinkInNewTab will be used to
   * open a url in new tab
   * @param {string} url
   */
  const openLinkInNewTab = (e, url) => {
    e.preventDefault();
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  const findParentOfSelectedIndex = (optionsList, order) => {
    let parentIndex;
    if (optionsList?.length) {
      for (let i = 0; i < optionsList.length; i++) {
        if (optionsList[i]?.isParent) {
          const foundIdx = findParentOfSelectedIndex(
            optionsList[i].childList,
            order
          );
          if (foundIdx || foundIdx === 0) {
            parentIndex = i;
            break;
          }
        } else if (optionsList[i]?.order === order) {
          parentIndex = i;
          break;
        }
      }
    }
    return parentIndex;
  };

  const handleChangeMiddleAccordion = (idx) => (event, newExpanded) => {
    setExpandedAccordionMiddle(newExpanded ? idx : -1);
  };

  const handleChangeBottomAccordion = (idx) => (event, newExpanded) => {
    setExpandedAccordionBottom(newExpanded ? idx : -1);
  };

  return (
    <Drawer
      variant="permanent"
      ref={wrapperRef}
      className={clsx(classes.drawer, classes.drawerOverlay, {
        [classes.drawerOpen]: isActive,
        [classes.drawerClose]: !isActive,
      })}
      classes={{
        paper: clsx({
          [classes.drawerOpen]: isActive,
          [classes.drawerClose]: !isActive,
        }),
      }}
    >
      <div
        className={`${globalClasses.cursorPointer} ${classes.drawerToggler}`}
        onClick={() => toggleSideBarExpansionHandler()}
      >
        {!isActive && <MenuIcon className={classes.menuIcon} />}
        {isActive && <MenuOpenIcon className={classes.menuIcon} />}
      </div>
      <div className={classes.sidebarMiddle}>
        <List className={classes.list}>
          {options.map((item, i) => (
            <>
              {item?.isParent ? (
                <Accordion
                  expanded={isActive && expandedAccordionMiddle === i}
                  onChange={handleChangeMiddleAccordion(i)}
                  key={`accordionMiddle-${i}`}
                  className={classes.drawerAccordion}
                >
                  <StyledListItem
                    key={`listitembutton-${i}`}
                    className={globalClasses.padding_0}
                    selected={selectedItemParentIndex === i}
                    disableRipple
                  >
                    <AccordionSummary
                      expandIcon={<ChevronRightIcon />}
                      aria-controls="panel1a-content"
                      id="panel1a-header"
                      className={`${classes.listPadding} ${globalClasses.flex}`}
                      onClick={() => setisActive(true)}
                    >
                      <Tooltip
                        title={isActive ? "" : item.title}
                        arrow
                        placement="right"
                        classes={{ tooltip: globalClasses.customTooltip }}
                      >
                        <ListItemIcon
                          className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter}`}
                        >
                          {sidebarIcon(item.icon, item.title)}
                        </ListItemIcon>
                      </Tooltip>
                      {isActive && (
                        <ListItemText
                          className={classes.listItemText}
                          primary={item.title}
                        />
                      )}
                    </AccordionSummary>
                  </StyledListItem>
                  <AccordionDetails>
                    {item?.childList.map((item, i) => (
                      <ListItem
                        id={"sidebar-item-" + i}
                        className={classes.listItem}
                        classes={{ selected: classes.listItemSelected }}
                        button
                        key={item.title}
                        selected={selectedIndex === item.order}
                        data-screen={item.title}
                        onClick={(event) =>
                          handleListItemClick(event, item.order)
                        }
                        disabled={item.disabled}
                        disableRipple
                      >
                        <NavLink
                          to={pathPrefix + item.link}
                          className={`${classes.sidebarMenu} ${classes.listPadding}`}
                          id={item.title}
                          disabled={item.disabled}
                        >
                          <div className={classes.listitemSidebar}>
                            {isActive && (
                              <ListItemText
                                className={`${classes.listItemText} ${classes.subListItemText} ${classes.addedMargin}`}
                                primary={item.title}
                              />
                            )}
                          </div>
                        </NavLink>
                      </ListItem>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ) : (
                <>
                  {!item?.isPositionBottom && (
                    <Tooltip
                      title={isActive ? "" : item.title}
                      arrow
                      placement="right"
                      classes={{ tooltip: globalClasses.customTooltip }}
                    >
                      <StyledListItem
                        id={"sidebar-item-" + i}
                        className={classes.listItem}
                        button
                        key={item.title}
                        selected={selectedIndex === item.order}
                        data-screen={item.title}
                        onClick={(event) =>
                          handleListItemClick(event, item.order)
                        }
                        disabled={item.disabled}
                        disableRipple
                      >
                        <NavLink
                          to={pathPrefix + item.link}
                          className={`${classes.sidebarMenu} ${classes.listPadding}`}
                          id={item.title}
                          disabled={item.disabled}
                        >
                          <div className={classes.listitemSidebar}>
                            <ListItemIcon
                              className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter}`}
                            >
                              {sidebarIcon(item.icon, item.title)}
                            </ListItemIcon>

                            {isActive && (
                              <ListItemText
                                className={classes.listItemText}
                                primary={item.title}
                              />
                            )}
                          </div>
                        </NavLink>
                      </StyledListItem>
                    </Tooltip>
                  )}
                </>
              )}
            </>
          ))}
        </List>
      </div>
      {options.map((item, i) => (
        <>
          {item?.isParentBottom && (
            <Accordion
              expanded={isActive && expandedAccordionBottom === i}
              onChange={handleChangeBottomAccordion(i)}
              className={classes.drawerAccordion}
              key={`accordionBottom-${i}`}
            >
              <StyledListItem
                className={globalClasses.padding_0}
                selected={selectedItemParentIndex === i}
                disableRipple
              >
                <AccordionSummary
                  expandIcon={<ChevronRightIcon />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                  className={`${classes.listPadding} ${globalClasses.flex}`}
                  onClick={() => setisActive(true)}
                >
                  <Tooltip
                    title={isActive ? "" : item.title}
                    arrow
                    placement="right"
                    classes={{ tooltip: globalClasses.customTooltip }}
                  >
                    <ListItemIcon
                      className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter}`}
                    >
                      {sidebarIcon(item.icon, item.title)}
                    </ListItemIcon>
                  </Tooltip>
                  {isActive && (
                    <ListItemText
                      className={classes.listItemText}
                      primary={item.title}
                    />
                  )}
                </AccordionSummary>
              </StyledListItem>
              <AccordionDetails>
                {item?.childList.map((item, i) => (
                  <ListItem
                    id={"sidebar-item-" + i}
                    className={classes.listItem}
                    classes={{ selected: classes.listItemSelected }}
                    button
                    key={item.title}
                    selected={selectedIndex === item.order}
                    data-screen={item.title}
                    onClick={
                      item?.openInNewPage
                        ? (event) => openLinkInNewTab(event, item?.link)
                        : (event) =>
                            handleListItemClick(
                              event,
                              item.order,
                              item?.appTitle
                            )
                    }
                    disabled={item.disabled}
                    disableRipple
                  >
                    <NavLink
                      to={item?.openInNewPage ? "#" : pathPrefix + item.link}
                      className={`${classes.sidebarMenu} ${classes.listPadding}`}
                      id={item.title}
                      disabled={item.disabled}
                    >
                      <div className={classes.listitemSidebar}>
                        {isActive && (
                          <ListItemText
                            className={`${classes.listItemText} ${classes.subListItemText} ${classes.addedMargin}`}
                            primary={item.title}
                          />
                        )}
                      </div>
                    </NavLink>
                  </ListItem>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </>
      ))}
      <div className={`${globalClasses.cursorPointer} ${classes.listPadding}`}>
        <div className={classes.listitemSidebar} onClick={() => logoutUser()}>
          <Tooltip
            title={isActive ? "" : "Logout"}
            arrow
            placement="right"
            classes={{ tooltip: globalClasses.customTooltip }}
          >
            <LogoutIcon
              className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter}`}
            />
          </Tooltip>
          <Typography className={classes.listItemText}>Logout</Typography>
        </div>
      </div>
    </Drawer>
  );
};

SideBar.defaultProps = {
  options: [],
  pathPrefix: "",
};

SideBar.propTypes = {
  options: PropTypes.array,
  pathPrefix: PropTypes.string,
  logoutUser: PropTypes.func.isRequired,
};

export default connect(null, { logoutUser })(SideBar);
