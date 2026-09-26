import { Button, Grid, Typography, Container } from "@mui/material";
import PageRouteTitles from "./PageRouteTitles";
import { useState, useEffect } from "react";
import globalStyles from "core/Styles/globalStyles";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FilterDashobardSection from "./FilterDashobardSection";
import { camelCase } from "lodash";
import { useSelector } from "react-redux";
import { useLocation } from "react-router";
import NoDataFound from "../no-data-found/no-data-found";
import useKeyboardShortcut from "core/Utils/keyboard-shorcuts";
import { connect } from "react-redux";

/**
 * @param {*} props
 */
const CoreComponentScreen = (props) => {
  const globalClasses = globalStyles();
  const [pageId, setPageId] = useState("");
  const filterReducerState = useSelector((state) => state.filterReducer);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isRouteValid, setIsRouteValid] = useState(false);
  let location = useLocation();

  // Filter Variables
  const [openModal, setOpenModal] = useState(false);

  const { keyboardShortcuts } = props;
  // Use the custom hook to listen for keyboards shortcut
  const shortcuts = [
    {
      shortcutKey: keyboardShortcuts?.filters?.toggleFilter,
      callback: () => setOpenModal((prev) => !prev),
    },
  ];
  useKeyboardShortcut(shortcuts);

  useEffect(() => {
    setPageId(camelCase(props.label));
  }, []);

  const routeOptions = [
    {
      id: `${pageId}${"_home_scr"}`,
      label: props.pageLabel,
      action: () => { },
    },
  ];

  /**
   * @func
   * @desc Wrap children based on showPageRoute value
   * @param {Node} children
   * @returns {Node}
   */
  const conditionalWrapper = (children) => {
    return props.contained ? (
      <Container maxWidth={false} id={`${pageId}${"MainCnt"}`}>
        {children}
      </Container>
    ) : (
      <div id={`${pageId}${"MainCnt"}`}>{children}</div>
    );
  };

  useEffect(() => {
    try {
      if (
        filterReducerState?.filterDashboardConfiguration[props?.filterConfigKey]
          ?.appliedFilterData?.dependencyData?.length > 0
      ) {
        setIsFilterApplied(true);
      } else {
        setIsFilterApplied(false);
      }
      if (location.pathname.includes("inventory-smart")) {
        setIsRouteValid(true);
      }
    } catch (error) {
      console.error("setIsFilterApplied error", error);
    }
  }, [
    filterReducerState?.filterDashboardConfiguration[props?.filterConfigKey],
  ]);

  return (
    <>
      {props.showPageRoute && (
        <PageRouteTitles
          id={`${pageId}${"MainBrdCrmbs"}`}
          options={props.routeOptions ? props.routeOptions : routeOptions}
        />
      )}
      {conditionalWrapper(
        <>
          {(props.showFilterDashboard || props.showPageHeader) && (
            <div className={globalClasses.marginBottom}>
              <Grid direction="row" justifyContent="space-between" container>
                <Grid item xs={4}>
                  <Typography
                    variant="h3"
                    component="h3"
                    className={`${globalClasses.pageHeader}`}
                  >
                    {props.showPageHeader ? props.pageLabel : ""}
                  </Typography>
                </Grid>
                {props.showFilterDashboard && !props.disableFilterModal && (
                  <Grid item xs={3}>
                    <Grid
                      container
                      direction="row-reverse"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Grid>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<FilterAltOutlinedIcon />}
                          onClick={() => setOpenModal(true)}
                        >
                          Select Filters
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
              {props.showFilterDashboard && (
                <FilterDashobardSection
                  {...props}
                  openModal={openModal}
                  setOpenModal={setOpenModal}
                  customFilterDependency={
                    props.preventFilterPreselection
                      ? null
                      : props.filterDependency
                  }
                />
              )}
            </div>
          )}
          {isRouteValid ? (
            (filterReducerState?.isFilterApplied && isFilterApplied) ||
              props?.hideNoDataFound ||
              props?.disableFilters ||
              props?.chipsDependency?.length > 0 ? (
              props.children
            ) : (
              <NoDataFound />
            )
          ) : (
            props.children
          )}        </>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    keyboardShortcuts: state.tenantConfigReducer.keyboardShortcuts,
  };
};

export default connect(mapStateToProps, null)(CoreComponentScreen);
