import React, { useRef, useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import clsx from "clsx";
import { NavLink, useLocation } from "react-router-dom-v5-compat";
import { logoutUser } from "../../actions/authActions";
import { connect } from "react-redux";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import Drawer from "@mui/material/Drawer";
import Tooltip from "@mui/material/Tooltip";
import makeStyles from "@mui/styles/makeStyles";
import withStyles from "@mui/styles/withStyles";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import List from "@mui/material/List";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography
} from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { setPlanSmartLogoutStatus } from "core/actions/sideBarActions";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useKeyboardShortcut from "core/Utils/keyboard-shorcuts";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { MAX_VISIBLE_ICONS } from "./constants";

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
        borderRadius: "0 0.25rem 0.25rem 0"
      }
    },
    "&.Mui-selected": {
      "& span": {
        fontWeight: 600
      }
    }
  }
}))(ListItem);

const useStyles = makeStyles((theme) => ({
  drawer: {
    borderRight: 0,
    width: theme.customVariables.navWidth,
    flexShrink: 0,
    whiteSpace: "nowrap"
  },
  "&a": {
    textDecoration: "none"
  },
  drawerOverlay: {
    position: "absolute"
  },
  drawerOpen: {
    width: theme.customVariables.navWidth,
    overflowX: "hidden",

    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    }),
    "&::-webkit-scrollbar": {
      display: "none" // Hide scrollbar for Webkit browsers (Chrome, Safari)
    },
    "-ms-overflow-style": "none", // Hide scrollbar for Internet Explorer and Edge
    "scrollbar-width": "none" // Hide scrollbar for Firefox
  },
  drawerClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    width: theme.customVariables.closedNavWidth,
    [theme.breakpoints.up("sm")]: {
      width: theme.customVariables.closedNavWidth
    },
    "&::-webkit-scrollbar": {
      display: "none" // Hide scrollbar for Webkit browsers (Chrome, Safari)
    },
    "-ms-overflow-style": "none", // Hide scrollbar for Internet Explorer and Edge
    "scrollbar-width": "none" // Hide scrollbar for Firefox
  },
  listPadding: {
    padding: "0.875rem 1.25rem 0.875rem 1.375rem"
  },
  list: {
    flex: 1,
    padding: 0
  },
  listItemIcon: {
    color: "unset",
    minWidth: "unset",
    width: "1.25rem",

    "& .MuiSvgIcon-root, & svg": {
      // fontSize: "1.25rem",
      width: "1.25rem",
      height: "1.25rem"
    }
  },
  logoutIcon: {
    color: theme.palette.colours.highlightBorder,

    "& .MuiSvgIcon-root": {
      fontSize: "1.5rem"
    }
  },
  logoutText: {
    color: theme.palette.colours.highlightBorder
  },
  keyboardStyle: {
    textDecoration: "none",
    color: theme.palette.background.default
  },
  listItem: {
    color: theme.palette.common.white,
    padding: 0,
    "&.Mui-disabled": {
      "& span, & svg": {
        color: theme.palette.text.disabledText
      }
    }
  },
  listItemText: {
    margin: "0 0 0 2rem",

    "& span": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      font: "normal normal 400 0.875rem/1.25rem Poppins"
    }
  },
  subListItemText: {
    "&:hover": {
      color: theme.palette.primary.light
    }
  },
  listitemSidebar: {
    display: "flex",
    alignItems: "center",
    color: theme.palette.common.white,
    cursor: "pointer"
  },
  sidebarMenu: {
    width: "100%",
    textDecoration: "none"
  },
  sidebarMiddle: {
    display: "flex",
    flex: 1,
    flexDirection: "column"
  },
  menuIcon: {
    color: theme.palette.common.white,
    fontSize: "1.5rem"
  },
  drawerToggler: {
    height: theme.customVariables.headerHeight,
    padding: "1rem 1.375rem 1rem 1.25rem"
  },
  drawerAccordion: {
    cursor: "default",
    backgroundColor: `${theme.palette.primary.dark}`,
    "box-shadow": "none",
    display: "grid",
    // padding: "1rem 0",
    "&.Mui-expanded": {
      margin: 0,
      padding: 0
    },

    "&::before": {
      backgroundColor: "transparent",
      height: 0,
      width: 0
    },

    "& .MuiAccordionSummary-root": {
      color: `${theme.palette.common.white}`,
      border: "0",
      // "padding-left": `${theme.typography.pxToRem(25)}`,

      "&.Mui-expanded .MuiAccordionSummary-content": {
        marginBlock: 0
      },

      "&::before": {
        backgroundColor: "transparent",
        width: 0
      }
    },

    "& .MuiAccordionSummary-expandIconWrapper": {
      color: `${theme.palette.common.white}`,
      padding: "0",
      marginRight: "0rem",

      "& .MuiSvgIcon-root": {
        fontSize: "1rem"
      }
    },
    "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
      transform: "rotate(90deg)",
      "-webkit-transform": "rotate(90deg)",
      "-ms-transform": "rotate(90deg)"
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
        width: 0
      }
    }
  },
  listItemSelected: {
    "&.Mui-selected, & span": {
      color: `${theme.palette.primary.light} !important`,
      fontWeight: 600
    }
  },

  addedMargin: {
    marginLeft: "3.25rem"
  },

  iconRotate: {
    transition: "transform 0.3s ease"
  },
  iconUp: {
    transform: "rotate(180deg)"
  },
  toggleContainer: {
    background: theme.palette.colours.toggleBackground
  },
  divider: {
    border: "0",
    borderBottom: `${theme.typography.pxToRem(1)} solid ${
      theme.palette.colours.dividerColor
    }`,
    maxWidth: "100%",
    margin: "0.75rem 0"
  },
  dividerMargin: {
    margin: "0.75rem 1.375rem"
  },
  keyboardKey: {
    display: "inline-block",
    padding: "0.125rem 0.625rem",
    borderRadius: "0.25rem",
    backgroundColor: theme.palette.common.white,
    color: theme.palette.text.secondary,
    lineHeight: "1.3125rem",
    marginLeft: "1rem"
  },
  additionalTooltipStyle: {
    maxWidth: "none"
  },
  marginLeft_0: {
    marginLeft: "0 !important"
  }
}));

//show shortcut in sidebar tooltip
const KeyboardButton = ({ screenName, appName, keyboardShortcuts }) => {
  const classes = useStyles();
  const shortcut = keyboardShortcuts?.sidebar?.[appName]?.[screenName];

  if (!shortcut) return null;

  const shortcutString = shortcut.join("+");
  return <span className={classes.keyboardKey}>{shortcutString}</span>;
};

const SideBar = ({
  options,
  pathPrefix,
  logoutUser,
  keyboardShortcuts = {},
  props
}) => {
  const wrapperRef = useRef();
  const [isActive, setisActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [selectedItemParentIndex, setSelectedItemParentIndex] = useState(0);
  const [expandedAccordionMiddle, setExpandedAccordionMiddle] = useState("");
  const [expandedAccordionBottom, setExpandedAccordionBottom] = useState("");
  const classes = useStyles({ isDrawerOpen: isActive });
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const toggleSideBarExpansionHandler = () => {
    setisActive((prev) => !prev);
    setExpandedAccordionMiddle("");
    setExpandedAccordionBottom("");
  };

  // Use the custom hook to listen for keyboards shortcut
  const defaultShortcuts = [
    {
      shortcutKey: keyboardShortcuts?.navigation?.toggleLeftPane,
      callback: toggleSideBarExpansionHandler
    },
    {
      shortcutKey: keyboardShortcuts?.navigation?.goToApplicationLandingPage,
      callback: () => {
        const firstNavLinkButton = document.getElementById("sidebar-item-0");
        if (firstNavLinkButton) {
          const navLink = firstNavLinkButton.querySelector("a");
          if (navLink) {
            firstNavLinkButton.click();
            navLink.click();
          }
        }
      }
    }
  ];

  const navLinkShortcutConfig = useMemo(() => {
    const appName = props?.app;
    if (!appName || !keyboardShortcuts || !keyboardShortcuts.sidebar) {
      return [];
    }
    const navItemShortcuts = keyboardShortcuts?.sidebar[appName] || {};
    let navLinkConfig = [];

    Object.keys(navItemShortcuts)?.forEach((screenName) => {
      const shortcut = navItemShortcuts[screenName];
      const navItemIndex = options?.findIndex(
        (option) => option?.screenName === screenName
      );

      if (navItemIndex != -1) {
        const navLinkCallback = () => {
          const navLinkElement = document.querySelector(
            `#sidebar-item-${navItemIndex} a`
          );
          if (navLinkElement) {
            navLinkElement.click();
          }
        };
        navLinkConfig.push({
          shortcutKey: shortcut,
          callback: navLinkCallback
        });
      } else {
        console.error(`No matching option found for nav item: ${shortcut}`);
      }
    });

    return navLinkConfig;
  }, [keyboardShortcuts, props?.app, options]);

  const shortcuts = useMemo(() => {
    return [...defaultShortcuts, ...navLinkShortcutConfig];
  }, [defaultShortcuts, navLinkShortcutConfig]);

  useKeyboardShortcut(shortcuts);

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
  }, [options, location.pathname]);

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
   * handler for Logout Event
   */
  const handleLogout = () => {
    if (props?.displayPlanSmartAlert) {
      dispatch(setPlanSmartLogoutStatus({ status: true, cb: logoutUser }));
    } else {
      logoutUser();
    }
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
        [classes.drawerClose]: !isActive
      })}
      classes={{
        paper: clsx({
          [classes.drawerOpen]: isActive,
          [classes.drawerClose]: !isActive
        })
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
          {options
            ?.slice(0, showMore ? options?.length : MAX_VISIBLE_ICONS)
            ?.map((item, i) => (
              <>
                {item?.isParent ? (
                  <Accordion
                    expanded={isActive && expandedAccordionMiddle === i}
                    onChange={handleChangeMiddleAccordion(i)}
                    key={`accordionMiddle-${i}`}
                    className={classes.drawerAccordion}
                  >
                    <Tooltip
                      title={
                        isActive ? (
                          ""
                        ) : (
                          <React.Fragment>
                            {item.title}
                            <KeyboardButton
                              screenName={item.screenName}
                              appName={props?.app}
                              keyboardShortcuts={keyboardShortcuts}
                            />
                          </React.Fragment>
                        )
                      }
                      arrow
                      placement="right"
                      classes={{
                        tooltip: `${globalClasses.customTooltip} ${classes.marginLeft_0} ${classes.additionalTooltipStyle}`
                      }}
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
                        </AccordionSummary>
                      </StyledListItem>
                    </Tooltip>
                    <AccordionDetails>
                      {item?.childList.map((item, i) => (
                        <ListItem
                          id={`sidebar-item-${i}`}
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
                        title={
                          isActive ? (
                            ""
                          ) : (
                            <React.Fragment>
                              {item.title}
                              <KeyboardButton
                                screenName={item.screenName}
                                appName={props?.app}
                                keyboardShortcuts={keyboardShortcuts}
                              />
                            </React.Fragment>
                          )
                        }
                        arrow
                        placement="right"
                        classes={{
                          tooltip: `${globalClasses.customTooltip} ${classes.additionalTooltipStyle}`
                        }}
                      >
                        <StyledListItem
                          id={`sidebar-item-${i}`}
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
                {/* if there are more icons than "MAX_VISIBLE_ICONS" then at that position(index=MAX_VISIBLE_ICONS-1) add an expand arrow */}
                {i == MAX_VISIBLE_ICONS - 1 &&
                  options?.length > MAX_VISIBLE_ICONS && (
                    <StyledListItem
                      id="showmore-button"
                      className={`${showMore && classes.toggleContainer} ${
                        classes.listItem
                      }`}
                      button
                      onClick={() => {
                        setShowMore((prevValue) => !prevValue);
                      }}
                      disableRipple
                    >
                      <div
                        className={`${classes.sidebarMenu} ${classes.listPadding} ${classes.listitemSidebar} `}
                      >
                        <ListItemIcon
                          className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter}`}
                        >
                          <KeyboardArrowDownIcon
                            className={`${classes.iconRotate} ${
                              showMore && classes.iconUp
                            }`}
                          />
                        </ListItemIcon>
                        {isActive && (
                          <ListItemText
                            className={classes.listItemText}
                            primary={showMore ? "Less" : "More"}
                          />
                        )}
                      </div>
                    </StyledListItem>
                  )}
              </>
            ))}
        </List>
      </div>
      <hr
        className={`${classes.divider} ${isActive && classes.dividerMargin}`}
      />

      {options.map((item, i) => (
        <>
          {item?.isParentBottom && (
            <Accordion
              expanded={isActive && expandedAccordionBottom === i}
              onChange={handleChangeBottomAccordion(i)}
              className={classes.drawerAccordion}
              key={`accordionBottom-${i}`}
            >
              <Tooltip
                title={
                  isActive ? (
                    ""
                  ) : (
                    <React.Fragment>
                      {item.title}
                      <KeyboardButton
                        screenName={item.screenName}
                        appName={props?.app}
                        keyboardShortcuts={keyboardShortcuts}
                      />
                    </React.Fragment>
                  )
                }
                arrow
                placement="right"
                classes={{
                  tooltip: `${globalClasses.customTooltip} ${classes.marginLeft_0} ${classes.additionalTooltipStyle}`
                }}
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
                  </AccordionSummary>
                </StyledListItem>
              </Tooltip>
              <AccordionDetails>
                {item?.childList.map((item, i) => (
                  <ListItem
                    id={`sidebar-item-${i}`}
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
      <div
        className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.cursorPointer} ${classes.listPadding}`}
      >
        <NavLink
          to={pathPrefix + "/plan-smart/tenant-config"}
          id="TenantConfiguration"
        >
          <SettingsIcon
            className={`${classes.listItemIcon} ${globalClasses.layoutAlignCenter} ${classes.listitemSidebar}`}
          />
        </NavLink>
      </div>
      <Tooltip
        title={
          isActive ? (
            ""
          ) : (
            <React.Fragment>
              Logout
              <KeyboardButton
                screenName="Logout"
                appName={props?.app}
                keyboardShortcuts={keyboardShortcuts}
              />
            </React.Fragment>
          )
        }
        arrow
        placement="right"
        classes={{
          tooltip: `${globalClasses.customTooltip} ${classes.additionalTooltipStyle}`
        }}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.cursorPointer} ${classes.listPadding}`}
          onClick={handleLogout}
        >
          <LogoutIcon
            className={`${classes.logoutIcon} ${globalClasses.layoutAlignCenter}`}
          />
          <Typography
            className={`${classes.listItemText} ${classes.logoutText}`}
          >
            Logout
          </Typography>
        </div>
      </Tooltip>
    </Drawer>
  );
};

SideBar.defaultProps = {
  options: [],
  pathPrefix: ""
};

SideBar.propTypes = {
  options: PropTypes.array,
  pathPrefix: PropTypes.string,
  logoutUser: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
  return {
    keyboardShortcuts: state.tenantConfigReducer?.keyboardShortcuts
  };
};

export default connect(mapStateToProps, { logoutUser })(SideBar);
