import { Container } from "@mui/material";
import PageRouteTitles from "./PageRouteTitles";
import { useState, useEffect, useRef, useMemo } from "react";
import globalStyles from "core/Styles/globalStyles";
import { camelCase, isEmpty } from "lodash";
import { Button } from "impact-ui-v3";
import { useSelector } from "react-redux";
import { useLocation } from "react-router";
import useKeyboardShortcut from "core/Utils/keyboard-shorcuts";
import { connect } from "react-redux";
import FilterDashobardSection from "./NewCoreComponentScreen/FilterDasboardSection.jsx";
import EmptyStateWrapper from "./EmptyStateWrapper";
import { EMPTY_STATE_PRODUCTS } from "./constants";

/**
 * @param {*} props
 */

const CoreComponentScreen = (props) => {
  const globalClasses = globalStyles();
  const [pageId, setPageId] = useState(camelCase(props.label) || "");
  const filterReducerState = useSelector((state) => state.filterReducer);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isRouteValid, setIsRouteValid] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  let location = useLocation();
  const appliedFilterChipsRef = useRef([]);

  const autoApplyEnabledFromState = useSelector(
    (state) =>
      state.tenantUserRoleMgmtReducer?.userRoleManagementReducer
        ?.autoApplyEnabled
  );

  // Use prop value if provided (and false), otherwise use the state value
  const isAutoApplyEnabled =
    props.autoApplyEnabled === false ? false : autoApplyEnabledFromState;

  const [defaultFilterLoader, setDefaultFilterLoader] = useState(
    !(props.hideSaveFilterSection && props.disableFilterModal) &&
    isAutoApplyEnabled &&
    !props.hideSavedFilterSection
  );
  const [defaultFilterLoadingMsg, setDefaultFilterLoadingMsg] = useState(
    "Fetching the filters for current screen"
  );

  // Filter Variables
  const [showFilters, setShowFilters] = useState(false);

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
    if (props?.showStrip) {
      setShowFilters(true);
    }
  }, []);

  const routeOptions = [
    {
      id: `${pageId}${"_home_scr"}`,
      label: props.pageLabel,
      action: () => {},
    },
  ];

  const conditionalWrapper = (children) => {
    return props.contained ? (
      <Container
        className={globalClasses.padding_0}
        maxWidth={false}
        id={`${pageId}${"MainCnt"}`}
      >
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
      if (EMPTY_STATE_PRODUCTS.includes(location.pathname.split("/")?.[1])) {
        setIsRouteValid(true);
      }
    } catch (error) {
      console.error("setIsFilterApplied error", error);
    }
  }, [
    filterReducerState?.filterDashboardConfiguration[props?.filterConfigKey],
  ]);

  useEffect(() => {
    if (props.defaultOpenModel) {
      setOpenModal(true);
    }
  }, [props.defaultOpenModel]);

  const shouldShowFilterButton = useMemo(() => {
    if (!props?.autoHideFilterButton) {
      return true;
    }
    return (filterReducerState?.isFilterApplied && isFilterApplied) ||
      props?.hideNoDataFound ||
      props?.disableFilters ||
      props?.chipsDependency?.length > 0 ||
      props?.showStrip;

  }, [
    props?.autoHideFilterButton,
    filterReducerState?.isFilterApplied,
    isFilterApplied,
    props?.hideNoDataFound,
    props?.disableFilters,
    props?.chipsDependency,
    props?.showStrip,
  ]);

  /** When the filter toggle is auto-hidden (no filters yet), keep the header row height so
   *  parent `marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT` does not pull `renderAboveFilterDashboard`
   *  (e.g. Vendor-DC / Vendor-Store) up into the tab strip. */
  const reserveFilterToggleSlot = useMemo(() => {
    const tabRowAlignment =
      Boolean(props?.IscoreButtonWidth) ||
      Boolean(props?.renderAboveFilterDashboard);
    return (
      props.showFilterDashboard &&
      !props.disableFilterModal &&
      props?.autoHideFilterButton &&
      !shouldShowFilterButton &&
      tabRowAlignment
    );
  }, [
    props.showFilterDashboard,
    props.disableFilterModal,
    props?.autoHideFilterButton,
    shouldShowFilterButton,
    props?.IscoreButtonWidth,
    props?.renderAboveFilterDashboard,
  ]);

  return (
    <>
      {!props.disableFilterModal && (
        <div
          className={`${globalClasses.flexRow} ${
            globalClasses.layoutAlignBetweenCenter
          } 
          ${props?.headerBreadCrumb ? globalClasses.filterBreadcrumbHeight : ""}
          ${
            "paddingVertical12"
          } ${
            !showFilters && !props?.renderAboveFilterDashboard && "noPaddingBottom"
          }`}
        >
          {props.showPageRoute ? (
            <PageRouteTitles
              id={`${pageId}${"MainBrdCrmbs"}`}
              options={props.routeOptions ? props.routeOptions : routeOptions}
            />
          ) : (
            // TODO : Removing the h_32 as it is not needed and it is causing the padding issue. Revert this in case of any issue.
            <div>{props?.headerBreadCrumb && props?.headerBreadCrumb}</div>
          )}
          {props.customHeaderComponent && props.customHeaderComponent()}
          {props.renderRefreshDates && props.renderRefreshDates()}
          <div className={`${globalClasses.flexRow}`}>
            {props?.extraButtons?.length > 0 &&
              props?.extraButtons.map((thisButton, index) => {
                return (
                  <div key={index} className={globalClasses.extraButtonStyle}>
                    {thisButton}
                  </div>
                );
              })}
            {props.showFilterDashboard && !props.disableFilterModal && shouldShowFilterButton && (
              <Button
                id="filterToggleBtn"
                className={globalClasses.shrink0}
                onClick={() => {
                  if (
                    (filterReducerState?.isFilterApplied && isFilterApplied) ||
                    props?.showStrip
                  )
                    setShowFilters(!showFilters);
                  else setOpenModal(true);
                }}
                variant="tertiary"
                style={props?.IscoreButtonWidth ? {width:props?.IscoreButtonWidth,marginBottom:'8px'}:{}}
              >
                {(props?.showStrip ? showFilters : (showFilters && filterReducerState?.isFilterApplied)) ? "Hide Filter" : "Show Filter"}
                {filterReducerState?.isFilterApplied &&
                  isFilterApplied &&
                  (appliedFilterChipsRef?.current?.length
                    ? ` (${appliedFilterChipsRef?.current?.length})`
                    : "")}
              </Button>
            )}
            {reserveFilterToggleSlot && (
              <div
                aria-hidden
                className={globalClasses.shrink0}
                style={
                  props?.IscoreButtonWidth
                    ? {
                        width: props.IscoreButtonWidth,
                        minHeight: 40,
                        marginBottom: "8px",
                      }
                    : {
                        width: "132px",
                        minHeight: 40,
                        marginBottom: "8px",
                      }
                }
              />
            )}
          </div>
        </div>
      )}

      {conditionalWrapper(
        <>
          {(props.showFilterDashboard || props.showPageHeader) && (
            <div
              className={
                `${props.disableFilterModal ? "" : globalClasses.marginBottom_12}
                ${props.customClassName ? props.customClassName : ""}`
              }
            >
              {props?.renderAboveFilterDashboard}
              {props.showFilterDashboard && (
                <FilterDashobardSection
                  {...props}
                  alignClearButton={true}
                  hideSavedFilterSection={props?.hideSaveFilterSection}
                  showFilters={showFilters}
                  openModal={openModal}
                  setOpenModal={setOpenModal}
                  setShowFilters={setShowFilters}
                  appliedFilterChipsRef={appliedFilterChipsRef}
                  isAutoApplyEnabled={isAutoApplyEnabled}
                  setDefaultFilterLoader={setDefaultFilterLoader}
                  setDefaultFilterLoadingMsg={setDefaultFilterLoadingMsg}
                  customFilterDependency={
                    props.preventFilterPreselection
                      ? null
                      : isEmpty(props.filterDependency)
                        ? null
                        : props.filterDependency
                  }
                  stackedFiltersPanelConfigs={
                    props?.stackedFiltersPanelConfigs
                      ? props.stackedFiltersPanelConfigs
                      : false
                  }
                  reducerIsFilterApplied={filterReducerState?.isFilterApplied}
                />
              )}
            </div>
          )}
          {isRouteValid ? (
            (filterReducerState?.isFilterApplied && isFilterApplied) ||
              props?.hideNoDataFound ||
              props?.disableFilters ||
              props?.chipsDependency?.length > 0 ? (
              <div className={globalClasses.paddingHorizonal24}>
                {props.children}
              </div>
            ) : (
              <div
                className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
              >
                <EmptyStateWrapper
                  emptyStateDescription={props.emptyStateDescription}
                  emptyStateHeading={props.emptyStateHeading}
                  emptyStateOnPrimaryButtonClick={
                    props.emptyStateOnPrimaryButtonClick
                  }
                  emptyStatePrimaryButtonLabel={
                    props.emptyStatePrimaryButtonLabel
                  }
                  emptyStateSecondaryButtonLabel={
                    props.emptyStateSecondaryButtonLabel
                  }
                  emptyStateSecondaryButtonClick={
                    props.emptyStateSecondaryButtonClick
                  }
                  emptyStateProps={props.emptyStateProps}
                  defaultFilterLoadingMsg={defaultFilterLoadingMsg}
                  isAutoApplyEnabled={isAutoApplyEnabled}
                  defaultFilterLoader={defaultFilterLoader}
                  setOpenModal={setOpenModal}
                  primaryButtonProps={props.primaryButtonProps}
                  secondaryButtonProps={props.secondaryButtonProps}
                  renderCustomComponent={props.renderCustomComponent}
                  returnCustomComponent={props.returnCustomComponent}
                  autoHideFilterButton={props.autoHideFilterButton}
                />
              </div>
            )
          ) : (
            <div className={globalClasses.paddingHorizonal24}>
              {props.children}
            </div>
          )}
        </>
      )}

      <style>{`
        .paddingVertical12 {
          padding: 0.75rem 0;
        }
        .noPaddingBottom{
          padding-bottom: 0px !important;
        }
        .paddingBtnWrapper {
          padding: 0 0 0.75rem 0;
        }
        .impact_emptystate {
          background: white;
        }
        .MuiButtonBase-root.MuiButton-root {
          flex-shrink: 0;
        }
      `}</style>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    keyboardShortcuts: state.tenantConfigReducer.keyboardShortcuts,
  };
};
export default connect(mapStateToProps, null)(CoreComponentScreen);
