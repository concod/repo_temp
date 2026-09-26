import { Button } from "impact-ui-v3";
import NoFilterSetSavedIcon from "core/coreAssets/chatbot/noFilterSetSaved.svg";
import { useEffect, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  getAllFilters,
  setFilterConfiguration,
} from "core/actions/filterAction";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { fetchFilterFieldValues, formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    padding: "16px",
    boxSizing: "border-box",
  },
  icon: {
    flexShrink: 0,
    overflow: "visible",
  },
  title: {
    color: "#31416E",
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "20px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "150%",
    margin: 0,
    padding: "20px 0 0 0",
  },
  subtitle: {
    color: "#31416E",
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "160%",
    margin: 0,
    padding: 0,
  },
  buttonWrapper: {
    marginTop: "16px",
  },
});

const ChatbotSaveFilterComponent = (props) => {
    const classes = useStyles();
    const { savedFilterSets } = props;
    const [showFilter, setShowFilter] = useState(!isEmpty(savedFilterSets));

      /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
    console.log("dependencyData4321", dependencyData);
  };
  
    const setChatbotFilterConfiguration = async (screenName) => {
        if (isEmpty(props.chatbotFilterDashboardConfiguration)) {

            const data = await fetchFilterFieldValues(
                "Chatbot",
                props.savedFilterSelection,
            );
            if (isEmpty(props.filterDashboardConfiguration)) {
                let filterConfigData = [
                    {
                        filterDashboardData: data,
                        isCrossDimensionFilter: false,
                        screen_name: screenName,
                    },
                ];
                // if (sessionStorage.getItem("currentApp") === "inventorysmart") {
                //   filterConfigData[0]["saved_filter_screen_name"] =
                //     "Inventorysmart Store Status";
                // }
                const filterConfig = formattedFilterConfiguration(
                    "chatbotFilterConfiguration",
                    filterConfigData,
                    "Chatbot"
                );
                props.setFilterConfiguration(filterConfig);
            }
        }
    };

    useEffect(() => {
    setChatbotFilterConfiguration("Chatbot");
  }, []);

    useEffect(() => {
      if (!isEmpty(savedFilterSets)) {
        setShowFilter(true);
      }
    }, [savedFilterSets]);

    useEffect(() => {
      if (!showFilter) return;

      const Z_INDEX = "9999";

      const patchDrawer = () => {
        const drawer = /** @type {HTMLElement} */ (document.querySelector(".MuiModal-root.MuiDrawer-root"));
        if (drawer && drawer.style.zIndex !== Z_INDEX) {
          drawer.style.zIndex = Z_INDEX;
        }
        if (drawer) {
          drawer.style.setProperty("position", "relative");
        }
        const mainContainer = /** @type {HTMLElement} */ (document.querySelector(".impact-drawer-filter-main-container"));
        if (mainContainer) {
          mainContainer.style.setProperty("flex-direction", "column", "important");
        }
        const leftPanel = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_container_left_panel"));
        if (leftPanel) {
          leftPanel.style.setProperty("height", "50px");
          leftPanel.style.setProperty("background", "white");
          leftPanel.style.setProperty("border", "none");
        }
        const filterHeader = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_header"));
        if (filterHeader) {
          filterHeader.style.setProperty("display", "none");
        }
        const filterTabs = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_left_filters_tabs"));
        if (filterTabs) {
          filterTabs.style.setProperty("flex-direction", "row");
          filterTabs.style.setProperty("background", "white");
        }
        const filterContainer = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_container.impact_drawer_filter_container_large"));
        if (filterContainer) {
          filterContainer.style.setProperty("width", "616px");
        }
        const rightPanel = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_container .impact_drawer_filter_container_right_panel"));
        if (rightPanel) {
          rightPanel.style.setProperty("height", "600px");
        }
        const backdrop = /** @type {HTMLElement} */ (document.querySelector(".MuiBackdrop-root.MuiModal-backdrop"));
        if (backdrop) {
          backdrop.style.setProperty("position", "unset");
        }
        const drawerPaper = /** @type {HTMLElement} */ (document.querySelector(".MuiDrawer-paper.MuiDrawer-paperAnchorRight"));
        if (drawerPaper) {
          drawerPaper.style.setProperty("box-shadow", "none");
          drawerPaper.style.setProperty("top", "110px");
          drawerPaper.style.setProperty("right", "3px");
        }
        const filterSeparator = /** @type {HTMLElement} */ (document.querySelector(".impact-drawer-filter-separator"));
        if (filterSeparator) {
          filterSeparator.style.setProperty("display", "none");
        }
        const paperRounded = /** @type {HTMLElement} */ (document.querySelector(".MuiPaper-root.MuiPaper-elevation0.MuiPaper-rounded"));
        if (paperRounded) {
          paperRounded.style.setProperty("margin-right", "24px");
        }
        const filterFooter = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_footer"));
        if (filterFooter) {
          filterFooter.style.setProperty("bottom", "120px");
          filterFooter.style.setProperty("left", "0");
        }
        const filterBody = /** @type {HTMLElement} */ (document.querySelector(".impact_drawer_filter_body.impact_drawer_filter_footer_no_buttons"));
        if (filterBody) {
          filterBody.style.setProperty("padding-right", "40px");
        }
      };

      patchDrawer();

      const observer = new MutationObserver(patchDrawer);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => observer.disconnect();
    }, [showFilter]);

    return (
        <>
        {!showFilter ? 
        <div className={classes.container}>
            <NoFilterSetSavedIcon
                width="189px"
                height="126px"
                className={classes.icon}
            />
            <p className={classes.title}>
                No filter set saved!
            </p>
            <p className={classes.subtitle}>
                Create and save a filter set to use as your default scope or apply it
                anytime during a conversation
            </p>
            <div className={classes.buttonWrapper}>
                <Button
                    variant="primary"
                    onClick={() => setShowFilter(true)}
                >
                    Create A Filter Set
                </Button>
            </div>
        </div> :
        <div>
                <CoreComponentScreen
          showPageHeader={false}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"chatbotFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
        //   headerBreadCrumb={<HeaderBreadCrumbs options={routeOptions} />}
          autoApplyEnabled={false}
          hideNoDataFound
          defaultOpenModel={true}
        />
        </div>
        }
        </>
    );
};

const mapStateToProps = (state) => {
  return {
    chatbotFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "chatbotFilterConfiguration"
      ],
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    // setTicketingDates: (data) => dispatch(setTicketingDates(data)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ChatbotSaveFilterComponent);

