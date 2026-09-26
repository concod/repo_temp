import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect, useDispatch } from "react-redux";
import { APP_PLATFORM } from "../../../config/constants";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import Grid from "@mui/material/Grid";
import { Button, Chip, Typography, Container, Paper } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsSharpIcon from "assets/home/setting.svg";
import { logoutUser } from "../../actions/authActions";
import { homePageActions } from "core/actions/homePageActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import ConfirmBox from "./confirmPopup";
import dividerImage from "assets/home/borderImage.png";
import homeBackground from "assets/home/homeBackground.png";
import {
  sideBarActions,
  sideBarDataDispatch,
  sideBarData,
  setActiveUserApp,
} from "core/actions/sideBarActions";
import Loader from "core/Utils/Loader/loader";
import { allPlatformApps } from "config/apps-config";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import { cloneDeep } from "lodash";
import { getSpecificScreenName } from "core/actions/tenantConfigActions";

const useStyles = makeStyles((theme) => ({
  activeApp: {
    borderRadius: "50%",
    bottom: "0.55rem",
    height: "0.75rem",
    position: "absolute",
    right: "0.75rem",
    width: "0.75rem",
  },
  appCardLayout: {
    flexDirection: "column",
  },
  appButton: {
    marginBottom: theme.spacing(2),
    position: "relative",

    "&.MuiButton-root": {
      background: theme.palette.common.white,
      boxShadow: `0 0 0 0.375rem ${theme.palette.colours.homeButtonShadow}`,
      borderRadius: "50%",
      border: `0.375rem solid ${theme.palette.colours.homeButtonBorder}`,
      height: "4.875rem",
      minWidth: "3.625rem",
      width: "4.875rem",

      "&.MuiButton-contained svg:not(.activeApp) *": {
        fill: theme.palette.primary.main,
      },

      "&.active": {
        background: theme.palette.primary.main,
        animation: `$ripple 300ms ${theme.transitions.easing.easeInOut}`,

        "& svg:not(.activeApp) *": {
          fill: theme.palette.common.white,
        },
      },

      "&.hover": {
        background: theme.palette.primary.main,
      },
    },
  },
  appImage: {
    display: "flex",
    alignSelf: "center",

    "& svg": {
      width: "1.75rem",
      height: "1.75rem",
    },
  },
  borderText: {
    display: "inline-block",
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: "inherit",

    "&::after": {
      background: "currentColor",
      borderRadius: theme.shape.borderRadius,
      content: "' '",
      display: "block",
      height: "2px",
      width: "65%",
    },
  },
  bottomSpacing: {
    marginBottom: "3rem",
  },
  cardContainer: {
    boxShadow: "0 0 0.375rem rgba(0, 0, 0, 0.29)",
    cursor: "pointer",
    gap: theme.spacing(2),
    padding: "1.5rem 1rem",
    marginBottom: "1.5rem",
  },
  clientCards: {
    display: "inline-flex",
    justifyContent: "space-around",
    marginBottom: theme.spacing(6),

    "&::before, &::after": {
      alignSelf: "center",
      background: theme.palette.primary.main,
      borderRadius: "50%",
      content: "' '",
      height: theme.spacing(1),
      width: theme.spacing(1),
    },
  },
  clientCardWrapper: {
    "&::before, &:last-child::after": {
      alignSelf: "center",
      background: theme.palette.primary.main,
      content: "' '",
      height: "2px",
      width: theme.spacing(2),
    },
  },
  clientCard: {
    height: "4rem",
    padding: theme.spacing(2),
    position: "relative",
    width: "4rem",
  },
  clientCommenceDate: {
    fontSize: "0.75rem",
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    whiteSpace: "nowrap",
  },
  configContianer: {
    flexDirection: "column",
    padding: "1.5rem 3rem",
  },
  configButton: {
    alignSelf: "flex-end",
    borderRadius: "2rem",
    height: "2.75rem",

    "& .MuiChip-icon": {
      width: "2.5rem",
      height: "2.5rem",
      padding: "0.5rem",
      background: "currentColor",
      borderRadius: "50%",
      marginLeft: "0.125rem",

      "& *": {
        fill: (props) =>
          props.showModal
            ? theme.palette.primary.main
            : theme.palette.common.white,
      },
    },
  },
  configText: {
    fontSize: "1.125rem",
  },
  customDivider: {
    backgroundImage: `linear-gradient(to right, ${theme.palette.primary.main} 50%, rgba(255,255,255,0) 0%)`,
    backgroundPosition: "bottom",
    backgroundSize: "0.875rem 1px",
    backgroundRepeat: "repeat-x",
    height: "2rem",
    position: "relative",
    marginInline: "auto",
    maxWidth: "90%",

    "&::before, &::after": {
      content: "' '",
      backgroundImage: `url(${dividerImage})`,
      backgroundSize: "2rem",
      backgroundRepeat: "no-repeat",
      width: "2rem",
      height: "2rem",
      display: "inline-block",
      position: "absolute",
      top: "50%",
    },

    "&::before": {
      transform: "translateX(-50%)",
      left: 0,
    },

    "&::after": {
      transform: "translateX(50%)",
      right: 0,
    },
  },
  fontWeight600: {
    fontWeight: 600,
  },
  homeBackground: {
    background: `url(${homeBackground})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "107% 65%",
    backgroundSize: "25rem",
  },
  image: {
    width: "2.25rem",
  },
  imageWrapper: {
    border: `2px solid ${theme.palette.background.primary}`,
    borderRadius: "5px",
    padding: theme.typography.pxToRem(20),
  },
  panelDescription: {
    fontWeight: 400,
  },
  positionConfig: {
    bottom: theme.spacing(3),
    position: "fixed",
    right: theme.typography.pxToRem(75),
  },
  releaseNotes: {
    position: "fixed",
    right: theme.typography.pxToRem(75),
    top: `calc(${theme.customVariables.headerHeight} + ${theme.spacing(7)})`,
  },
  styledChip: {
    background: theme.palette.success.light,

    "&.Mui-disabled": {
      background: theme.palette.common.white,
    },
  },
  titleColor: {
    color: theme.palette.textColours.codGray,
  },
  "@keyframes ripple": {
    "0%": {
      borderColor: theme.palette.common.white,
      boxShadow: `0 0 0.5rem 0.5rem ${theme.palette.colours.homeButtonBorder}`,
    },
    "50%": {
      borderColor: theme.palette.colours.homeButtonShadow,
      boxShadow: `0 0 0.5rem 0.5rem ${theme.palette.common.white}`,
    },
    "100%": {
      borderColor: theme.palette.colours.homeButtonBorder,
      boxShadow: `0 0 0.5rem 0.5rem ${theme.palette.colours.homeButtonShadow}`,
    },
  },
}));

const HomePage = (props) => {
  const [mappedApp, setMappedApp] = useState({});
  const [showloader, setLoader] = useState(true);
  const [confirmBox, showConfirmBox] = useState(false);
  const [activeElement, setActiveElement] = useState("");
  const [showModal, setShowModal] = useState(false);
  // const [appClients, setAppClients] = useState();
  const classes = useStyles({ showModal });
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  const dispatch = useDispatch();

  /**
   * @func
   * @desc Update active, mapped and store state to access user application
   * @param {Array} filteredApp
   * @returns {Boolean}
   */
  const updateFilteredApp = async (filteredApp) => {
    if (!filteredApp.length) {
      return false;
    }
    let screenArray;
    let appName;

    if (props.userScreenData[filteredApp[0].title]?.screens) {
      screenArray = props.userScreenData[filteredApp[0].title].screens;
      appName = props.userScreenData[filteredApp[0].title]?.appName;
    } else {
      const screenData = await sideBarData(filteredApp[0].title);

      /**
       * Structure of the api has changed to make screen accessible based on roles and screns assigned to a user
       * Default Value is "All", in case a user hasn't been given an access to a particular app, it comes as blank object and Home page fails to load
       */
      screenData?.data?.data?.data?.length > 0
        ? screenData?.data?.data?.data?.forEach((e) => {
            appName = e.users.app.toLowerCase();
            screenArray = e.users.screen.map((item) => item.name);
          })
        : (screenArray = ["All"]);
      dispatch(
        sideBarDataDispatch({
          [filteredApp[0].title]: { screens: screenArray, appName },
        })
      );
    }
    filteredApp[0].mapped =
      appName === filteredApp[0].title && Boolean(screenArray.length);
    filteredApp[0].active = true;

    if (filteredApp[0]?.title === "ada") handleAdaDashboard(filteredApp);

    return true;
  };

  /**
   * @func
   * @desc Handles ADA Dashboard for clients
   * @param {{Array} filteredApp
   */

  const handleAdaDashboard = async (filteredApp) => {
    if (
      props.userScreenData?.ada?.screens?.length > 1 &&
      props.userScreenData?.ada?.screens?.includes("MFP ADA Dashboard")
    ) {
      filteredApp[0].url = filteredApp[0]?.layout[0]?.link;
    } else {
      let screen = filteredApp[0]?.layout;
      screen.shift();
      screen[0].order = 1;
      filteredApp[0].layout = screen;
      filteredApp[0].url = screen[0]?.link;
    }
  };

  /**
   * @func
   * @desc Run everytime active application list is updated and update local state
   */
  useEffect(async () => {
    setLoader(true);
    // const activeClients = cloneDeep(clientInfo);
    let clientName = localStorage.getItem("CLIENT_NAME");
    if (!clientName) {
      //fetch clientname
      let tenantData = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "client_name",
      });
      if (tenantData?.data?.status) {
        clientName =
          tenantData?.data?.data[0]?.attribute_value?.value || "vera_bradley";
      }
      localStorage.setItem("CLIENT_NAME", clientName);
    }
    //show/hide configurator option through TAM
    let platformAppsConfig = allPlatformApps.config?.filter((app) => {
      if(app.title === "module configurator"){
        if(props?.showModuleConfigurator){
          return true
        }
        else {
          return false;
        }
      }
      return true;
    }).map((app) => app);
    allPlatformApps.config = platformAppsConfig;
    const platformApplications = cloneDeep(allPlatformApps);
    let platformApps = filterApps(platformApplications, clientName);
    if (props.userAppData) {
      setLoader(true);
      await Promise.all(
        props.userAppData.map(async (appName) => {
          for (const key of Object.keys(platformApps)) {
            const filteredApp = platformApps[key].filter(
              (app) => app.title === appName.toLowerCase()
            );
            const updateFilteredAppConst = await updateFilteredApp(filteredApp);

            if (updateFilteredAppConst) {
              break;
            }
          }
        })
      );

      setMappedApp({
        ...platformApps,
      });
      // setAppClients({ ...activeClients });
      setLoader(false);
    } else {
      setMappedApp(platformApps);
      // setAppClients({ ...activeClients });
    }

    setLoader(false);
  }, [props.userAppData, props?.userScreenData?.ada]);

  /**
   * @func
   * @desc Temporary data to filter and view client based applications
   * @param {Object} platformApps
   * @param {String} clientName
   * @returns
   */
  const filterApps = (platformApps, clientName) => {
    if (clientName.length) {
      let apps = platformApps.featuredApp.filter((app) => {
        return !(
          (clientName === "vera_bradley" && app.title === "pricesmart") ||
          (clientName !== "vera_bradley" && app.title === "marksmart")
        );
      });
      let filteredApps = { ...platformApps };
      filteredApps.featuredApp = apps;
      return { ...filteredApps };
    }
    return platformApps;
  };

  /**
   * @func
   * @desc Run only at first render and fetch active Apps and set to store.
   */
  useEffect(async () => {
    setLoader(true);
    document.title = APP_PLATFORM.APP_NAME;
    if (!props.userAppData.length) {
      await props.setUserApps();
    }
    await props.getSpecificScreenName(3, {
      attribute_name: "core_screen_configuration",
    });
  }, []);

  /**
   * @func
   * @desc Set active panel element title whever mapped Value changes
   */
  useEffect(() => {
    setActiveElement(mappedApp?.featuredApp?.[0].title);
  }, [mappedApp]);

  /**
   * @func
   * @desc set localstorage with the current application and redirect
   * @param {Object} app
   */
  const setApp = async (app) => {
    navigate(app.url);
    props.setActiveUserApp(app.title);
    sessionStorage.setItem("currentApp", app.title);
  };

  /**
   * @func
   * @desc Render Active and Non Active buttons
   * @param {Object} app
   * @returns {HTMLElement}
   */
  const renderInteractiveButtons = (app) => {
    return (
      <>
        <Button
          color="primary"
          className={`${classes.appButton} ${
            activeElement === app.title ? "active" : ""
          }`}
          // variant={`${activeElement === app.title ? "contained" : "outlined"}`}
          variant="contained"
          onClick={() => setActiveElement(app.title)}
        >
          <span className={classes.appImage}>{app.logo}</span>
          <CheckCircleIcon
            className={`${classes.activeApp} activeApp`}
            color={`${app.active ? "success" : "disabled"}`}
          />
        </Button>
        <Typography
          variant={`${activeElement === app.title ? "h6" : "body1"}`}
          component="span"
          color={`${activeElement === app.title ? "primary" : "default"}`}
          className={`${
            activeElement !== app.title
              ? classes.titleColor
              : classes.fontWeight600
          }`}
        >
          {app.label}
        </Typography>
      </>
    );
  };

  /**
   * @func
   * @desc Render Active Panel respective to Active Button
   * @returns {HTMLElement}
   */
  const renderActivePanel = () => {
    return mappedApp.featuredApp?.map((app) => {
      return (
        <div
          className={
            activeElement === app.title ? "" : globalClasses.displayNone
          }
        >
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
          >
            <Typography
              variant="h3"
              component="h3"
              color="primary"
              className={classes.borderText}
            >
              {app.label}
            </Typography>
            {app.active ? (
              <Chip
                icon={<CircleIcon />}
                label="Active"
                variant="outlined"
                color="success"
                className={classes.styledChip}
              />
            ) : (
              <Chip
                icon={<CircleIcon />}
                label="Inactive"
                variant="outlined"
                className={classes.styledChip}
                disabled
              />
            )}
          </div>
          <Typography
            variant="h4"
            component="p"
            className={`${globalClasses.marginBottom} ${classes.panelDescription}`}
          >
            {app.desc}
          </Typography>
          {/* {appClients?.[app.title] && (
            <>
              <Typography
                variant="h6"
                component="h6"
                className={`${classes.fontWeight600} ${globalClasses.marginBottom} ${classes.titleColor}`}
              >
                Clients who uses Product
              </Typography>
              <div className={classes.clientCards}>
                {appClients?.[app.title]?.["clients"] &&
                  appClients?.[app.title]?.["clients"].map((client, index) => {
                    let icon = generateIcon();
                    return (
                      <div
                        className={`${globalClasses.flexRow} ${classes.clientCardWrapper}`}
                        key={`${app.title}-client-${index}`}
                      >
                        <Tooltip
                          title={client.clientName}
                          placement="top"
                          arrow
                        >
                          <Paper
                            elevation={4}
                            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.clientCard}`}
                          >
                            <Icon sx={{ color: getRandomColor() }}>{icon}</Icon>
                            <Typography
                              className={`${classes.titleColor} ${classes.clientCommenceDate}`}
                              variant="body1"
                              component="span"
                            >
                              Since {client.start_year}
                            </Typography>
                          </Paper>
                        </Tooltip>
                      </div>
                    );
                  })}
              </div>
            </>
          )} */}
          {app.active ? (
            <div className={globalClasses.verticalAlignCenter}>
              <Button
                onClick={() => {
                  app.mapped ? setApp(app) : showConfirmBox(true);
                }}
                color="primary"
                variant="contained"
              >
                Get Started
              </Button>
              <Button
                color="primary"
                component="a"
                href={APP_PLATFORM.CONTACT_PAGE}
                variant="text"
                target="_blank"
                className={globalClasses.marginLeft1rem}
              >
                Unsubscribe
              </Button>
            </div>
          ) : (
            <div className={globalClasses.verticalAlignCenter}>
              <Button
                color="primary"
                variant="contained"
                component="a"
                href={app.web}
                target="_blank"
              >
                Know More
              </Button>
              <Button
                color="primary"
                variant="text"
                component="a"
                href={APP_PLATFORM.DEMO_PAGE}
                target="_blank"
                className={globalClasses.marginLeft1rem}
              >
                Subscribe
              </Button>
            </div>
          )}
        </div>
      );
    });
  };

  /**
   * @func
   * @desc Render config cards
   * @returns {HTMLElement}
   */
  const rederCards = () => {
    return mappedApp?.config
      ?.filter((card) => card.mapped)
      .map((card) => {
        return (
          <Paper
            className={`${classes.cardContainer} ${globalClasses.flexRow}`}
            onClick={() => setApp(card)}
            key={card.title}
          >
            <div className={classes.imageWrapper}>{card.logo}</div>
            <div>
              <Typography
                variant="p"
                component="h4"
                className={globalClasses.marginBottom}
              >
                {card.label}
              </Typography>
              <Typography variant="subtitle1" component="p">
                {card.desc}
              </Typography>
            </div>
          </Paper>
        );
      });
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Home",
            id: 1,
          },
        ]}
      ></HeaderBreadCrumbs>
      {confirmBox && (
        <ConfirmBox
          title="Hi there, you do not have the right to access this product. Please contact your admin to get access"
          onClose={() => showConfirmBox(false)}
          onConfirm={() => {
            showConfirmBox(false);
            window.open(
              APP_PLATFORM.CONTACT_PAGE,
              "_blank",
              "noopener,noreferrer"
            );
          }}
        />
      )}
      <Loader loader={showloader}>
        <Container maxWidth={false} className={classes.homeBackground}>
          <Grid
            container
            spacing={10}
            direction="row"
            justifyContent="flex-start"
            alignItems="center"
          >
            <Grid item xs={6}>
              <Grid container direction="row" justifyContent="center">
                <Grid item xs={12}>
                  <Typography
                    variant="h3"
                    component="h3"
                    className={`${classes.borderText} ${classes.bottomSpacing} ${classes.titleColor}`}
                  >
                    Smart Core Merchandising
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid
                    container
                    spacing={2}
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                  >
                    {mappedApp?.featuredApp
                      ?.filter((app) => app.category === "core")
                      .map((app) => (
                        <Grid
                          item
                          xs={3}
                          key={app.title}
                          className={`${classes.appCardLayout} ${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.bottomSpacing}`}
                        >
                          {renderInteractiveButtons(app)}
                        </Grid>
                      ))}
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                container
                direction="row"
                justifyContent="space-around"
                spacing={2}
              >
                <Grid item xs={12} className={classes.bottomSpacing}>
                  <div className={classes.customDivider} />
                </Grid>
                <Grid item xs={12}>
                  <Typography
                    variant="h3"
                    component="h3"
                    className={`${classes.borderText} ${classes.bottomSpacing} ${classes.titleColor}`}
                  >
                    Smart BI
                  </Typography>
                </Grid>
                {mappedApp?.featuredApp
                  ?.filter((app) => app.category === "smartBI")
                  .map((app) => (
                    <Grid
                      item
                      xs={3}
                      key={app.title}
                      className={`${classes.appCardLayout} ${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.bottomSpacing}`}
                    >
                      {renderInteractiveButtons(app)}
                    </Grid>
                  ))}
              </Grid>
            </Grid>
            <Grid item xs={4}>
              {renderActivePanel()}
            </Grid>
            <Button
              component={Link}
              variant="contained"
              to="/release-notes"
              className={classes.releaseNotes}
            >
              Release Notes
            </Button>
          </Grid>
          <Chip
            icon={<SettingsSharpIcon viewBox="0 0 20 20" />}
            label="Configurations"
            color="primary"
            variant="outlined"
            onClick={() => {
              setShowModal(!showModal);
            }}
            className={`${classes.positionConfig} ${classes.configButton}`}
          />
        </Container>
      </Loader>
      <FilterModal
        open={showModal}
        closeOnOverlayClick={() => setShowModal(false)}
        isModalFixedTop={true}
        isConfigModal={true}
      >
        <div className={`${classes.configContianer} ${globalClasses.flexRow}`}>
          <Typography
            variant="h3"
            component="h3"
            className={`${classes.configText} ${globalClasses.marginBottom}`}
          >
            Configuration
          </Typography>
          {rederCards()}
          <Chip
            icon={<SettingsSharpIcon viewBox="0 0 20 20" />}
            label="Configurations"
            color="primary"
            variant="contained"
            className={classes.configButton}
            onClick={() => {
              setShowModal(!showModal);
            }}
          />
        </div>
      </FilterModal>
    </>
  );
};

const mapStateToProps = (state) => ({
  userAppData: state.homePageReducer.userAppData,
  userScreenData: state.sideBarReducer.userScreenData,
  showModuleConfigurator:
    state.tenantUserRoleMgmtReducer.userRoleManagementReducer
      .showModuleConfigurator,
});

export default connect(mapStateToProps, {
  setUserApps: homePageActions,
  sideBarActions: sideBarActions,
  setActiveUserApp: setActiveUserApp,
  getTenantConfigApplicationLevel,
  logoutUser,
  getSpecificScreenName,
})(HomePage);
