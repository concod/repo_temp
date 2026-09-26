import React, { useEffect, useState, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "./styles";
import ProgressBar from "./ProgressBar";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Grid,
  Typography,
  Tooltip,
} from "@mui/material";
import dummyData, { convertAPIDataToDummyDataFormat } from "./dummyData";
import CustomTooltip from "./CustomTooltip";
import {
  createReducerState,
  getModulesForConfigurator,
} from "core/actions/configuratorActions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { pxToRem } from "core/Utils/functions/utils";
import DOMPurify from "dompurify";
import { Input, Badge } from "impact-ui-v3";
import SearchIcon from "@mui/icons-material/Search";
import UTurnLeftIcon from "@mui/icons-material/UTurnLeft";
import { cloneDeep } from "lodash";
import { isMac, useShortcut } from "impact-ui-v3";

import { fetchOrderingModuleConfiguratorData } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";

const ModuleConfiguratorScreen = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  let location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [modulesData, setModulesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredModule, setFilteredModule] = useState({});

  // Create ref for search input
  const searchInputRef = useRef(null);

  // Use the custom hook to listen for keyboards shortcut
  useShortcut(isMac ? "Meta+f" : "Ctrl+f", () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  });

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        //call the modules API
        const orderingModuleConfiguartorData = await props.fetchOrderingModuleConfiguratorData();
        if (orderingModuleConfiguartorData?.data?.status) {
          let modulesDataResp = [orderingModuleConfiguartorData?.data?.data];
          const transformedData = convertAPIDataToDummyDataFormat(
            modulesDataResp
          );
          setModulesData(transformedData);
          setFilteredModule(transformedData);
          setLoading(false);
        }
      } catch (err) {
        displaySnackMessages(err?.message || "Something went wrong", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClick = () => {
    navigate("/configurator");
  };

  const handleModuleClick = (title, moduleCode, data) => {
    // Validate inputs
    console.log("chala12");
    if (
      !title ||
      typeof title !== "string"
      //   !moduleCode ||
      //   typeof moduleCode !== "number"
    ) {
      return;
    }

    // Sanitize inputs
    const sanitizedTitle = DOMPurify.sanitize(title);
    const sanitizedModuleCode = Number(DOMPurify.sanitize(moduleCode));

    //setting the module code to the configurator reducer state
    // dispatch(createReducerState("moduleCode", sanitizedModuleCode));
    dispatch(createReducerState("moduleName", sanitizedTitle));

    localStorage.setItem("moduleCode", sanitizedModuleCode); //Module Key
    localStorage.setItem("moduleName", sanitizedTitle); //Module Title
    localStorage.setItem("module_fc_name", data?.fc_name); //fc_name
    localStorage.setItem("module_fc_code", data?.fc_code); //fc_code
    localStorage.setItem("module_tc_name", data?.tc_name); //tc_name
    localStorage.setItem("module_tc_code", data?.tc_code); //tc_code
    localStorage.setItem("is_kpi", data?.is_kpi); //is_kpi

    const newString = encodeURIComponent(sanitizedTitle);
    // Get the current location from props
    const currentLocation = location;

    // Append the new string to the existing pathname
    const newPathname = currentLocation.pathname + "/" + newString;

    // Use navigate to update the URL with the new pathname
    navigate(newPathname);
  };

  // if (loading || !modulesData) {
  //   return <Loader loader={loading}></Loader>;
  // }
  const handleSearch = (e) => {
    const value = e.target.value || "";
    setSearchTerm(value);

    const lower = value.toLowerCase();
    const data = cloneDeep(modulesData);
    data.details = data?.details?.map((level) => ({
      ...level,
      rowData: level?.rowData?.filter((row) =>
        row?.cardHeader?.toLowerCase().includes(lower)
      ),
    }));
    setFilteredModule(data);
  };
  return (
    <div className={classes.parentContainer}>
      <Loader loader={loading}>
        <div className={globalClasses.flexAlignBetweenCenter}>
          <p className={classes.title}>{modulesData?.componentTitle}</p>
          <Input
            leftIcon={
              <Box className={globalClasses.centerAlign}>
                <SearchIcon />
              </Box>
            }
            name="searchBar"
            id="searchBar"
            onChange={handleSearch}
            placeholder="Module Name"
            type="text"
            value={searchTerm}
            size="small"
            inputRef={searchInputRef}
            rightIcon={isMac ? "⌘F" : "Ctrl+F"}
          />
        </div>
        <div>
          {filteredModule?.details?.map((rowItem, index) => {
            return (
              <Box key={index}>
                {index === 0 ? (
                  <></>
                ) : (
                  // <div
                  //   className={`${globalClasses.flexRow} ${globalClasses.flexColumn}  ${globalClasses.positionRelative}`}
                  // >
                  //   <p
                  //     className={`${classes.header} ${globalClasses.positionLeftBottom}`}
                  //   >
                  //     {rowItem?.rowTitle}
                  //   </p>
                  //   <Button
                  //     className={classes.backButton}
                  //     startIcon={
                  //       <UTurnLeftIcon className={classes.rotatedIcon} />
                  //     }
                  //     onClick={handleClick}
                  //   >
                  //     Back
                  //   </Button>
                  // </div>
                  <div className={classes.headerContainer}>
                    <p className={classes.header}>{rowItem?.rowTitle}</p>
                  </div>
                )}
                <div
                  className={classes.gridContainer}
                  style={{ marginTop: "50px" }}
                >
                  {(() => {
                    const groupedByScreen =
                      rowItem?.rowData?.reduce((acc, card) => {
                        const key = card?.cardParagh || "Others";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(card);
                        return acc;
                      }, {}) || {};
                    return Object.entries(groupedByScreen).map(
                      ([screenName, cards], groupIdx) => (
                        <React.Fragment key={screenName}>
                          {groupIdx > 0 ? (
                            <Divider className={classes.divider} />
                          ) : (
                            <></>
                          )}
                          <div className={classes.headerContainer}>
                            <p className={classes.header}>{screenName}</p>
                          </div>
                          <Box sx={{ marginBottom: pxToRem(12) }} />
                          <Grid
                            container
                            spacing={{ xs: 2, md: 3.5 }}
                            columns={{ xs: 4, sm: 8, md: 12 }}
                          >
                            {cards.map((card, index) => (
                              <Grid item xs={2} sm={3} md={3} key={index}>
                                <Card
                                  onClick={(e) => {
                                    handleModuleClick(
                                      card?.cardHeader,
                                      card?.modulekey,
                                      card
                                    );
                                    e.stopPropagation();
                                  }}
                                  className={`${globalClasses.cursorPointer} ${classes.card}`}
                                >
                                  <CardContent className={classes.cardContent}>
                                    <div className={classes.cardHeaderOptions}>
                                      <Tooltip
                                        classes={{
                                          tooltip: classes.customTooltip,
                                        }}
                                        placement="bottom-start"
                                        arrow
                                        title={card.cardHeader}
                                      >
                                        <Typography
                                          className={`${classes.cardHeader} ${globalClasses.whiteSpace}`}
                                        >
                                          {card.cardHeader}
                                        </Typography>
                                      </Tooltip>
                                      <CustomTooltip
                                        //cardSubHeader={card.cardSubHeader}
                                        tooltipData={card.tooltipData}
                                      />
                                    </div>
                                    {/* <Tooltip
                                      classes={{
                                        tooltip: classes.customTooltip,
                                      }}
                                      placement="bottom-start"
                                      arrow
                                      title={card.cardParagh}
                                    >
                                      <Typography
                                        className={classes.cardParagraph}
                                      >
                                        Screen :{" "}
                                        <Badge
                                          color={"success"}
                                          label={card.cardParagh}
                                          //onClick={() => handleBadgeChanges("existing")}
                                          variant="stroke"
                                        />
                                      </Typography>
                                    </Tooltip> */}
                                    {/* <Button
                                      size="small"
                                      className={classes.cardLearnmore}
                                    >
                                      {card.cardLearnMore}
                                    </Button> */}
                                  </CardContent>
                                  <CardActions className={classes.cardActions}>
                                    <ProgressBar
                                      className={classes.progressBar}
                                      percentage={card.percentage}
                                    />
                                  </CardActions>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                          <Box sx={{ marginBottom: pxToRem(16) }} />
                        </React.Fragment>
                      )
                    );
                  })()}
                  {index < 2 ? <Divider className={classes.divider} /> : <></>}
                </div>
              </Box>
            );
          })}
        </div>
      </Loader>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  fetchOrderingModuleConfiguratorData: (payload) =>
    dispatch(fetchOrderingModuleConfiguratorData(payload)),
});
export default connect(null, mapDispatchToProps)(ModuleConfiguratorScreen);
