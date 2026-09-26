import React, { useEffect, useState } from "react";
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

const SystemConfigurator = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  let location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [modulesData, setModulesData] = useState({});
  const [loading, setLoading] = useState(false);

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
        const urlPath = window.location.pathname;
        const urlPathSplit = urlPath.split("/");
        let app = urlPathSplit[urlPathSplit.length - 2];
        let modulesDataResp = await getModulesForConfigurator(app)();
        setModulesData(
          convertAPIDataToDummyDataFormat(modulesDataResp?.data?.data)
        );
        setLoading(false);
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

  const handleModuleClick = (title, moduleCode) => {
    //setting the module code to the configurator reducer state
    dispatch(createReducerState("moduleCode", moduleCode));
    dispatch(createReducerState("moduleName", title));
    localStorage.setItem("moduleCode", moduleCode);
    localStorage.setItem("moduleName", title);
    const newString = title;

    // Get the current location from props
    const currentLocation = location;

    // Append the new string to the existing pathname
    const newPathname = currentLocation.pathname + "/" + newString;

    // Use navigate to update the URL with the new pathname
    navigate(newPathname);
  };

  if (loading || !modulesData) {
    return <Loader loader={loading}></Loader>;
  }

  return (
    <div className={classes.parentContainer}>
      <div>
        <p className={classes.title}>{modulesData?.componentTitle}</p>
      </div>
      <div>
        {modulesData?.details?.map((rowItem, index) => {
          return (
            <Box key={index}>
              {index === 0 ? (
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.flexColumn}  ${globalClasses.positionRelative}`}
                >
                  <p
                    className={`${classes.header} ${globalClasses.positionLeftBottom}`}
                  >
                    {rowItem?.rowTitle}
                  </p>
                  <Button
                    className={classes.backButton}
                    onClick={handleClick}
                  >
                    Back
                  </Button>
                </div>
              ) : (
                <div className={classes.headerContainer}>
                  <p className={classes.header}>{rowItem?.rowTitle}</p>
                </div>
              )}
              <div className={classes.gridContainer}>
                <Grid
                  container
                  spacing={{ xs: 2, md: 3.5 }}
                  columns={{ xs: 4, sm: 8, md: 12 }}
                >
                  {rowItem?.rowData?.map((card, index) => {
                    return (
                      <Grid item xs={2} sm={3} md={3} key={index}>
                        <Card
                          onClick={(e) => {
                            handleModuleClick(
                              card?.cardHeader,
                              card?.moduleCode
                            );
                            e.stopPropagation();
                          }}
                          className={`${globalClasses.cursorPointer} ${classes.card}`}
                        >
                          <CardContent className={classes.cardContent}>
                            <div className={classes.cardHeaderOptions}>
                              <Tooltip
                                classes={{ tooltip: classes.customTooltip }}
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
                                cardSubHeader={card.cardSubHeader}
                                tooltipData={card.tooltipData}
                              />
                            </div>
                            <Tooltip
                              classes={{ tooltip: classes.customTooltip }}
                              placement="bottom-start"
                              arrow
                              title={card.cardParagh}
                            >
                              <Typography className={classes.cardParagraph}>
                                {card.cardParagh}
                              </Typography>
                            </Tooltip>
                            <Button
                              size="small"
                              className={classes.cardLearnmore}
                            >
                              {card.cardLearnMore}
                            </Button>
                          </CardContent>
                          <CardActions className={classes.cardActions}>
                            <ProgressBar className={classes.progressBar} percentage={card.percentage} />
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                {index < 2 ? <Divider className={classes.divider} light /> : <></>}
              </div>
            </Box>
          );
        })}
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});
export default connect(null, mapDispatchToProps)(SystemConfigurator);
