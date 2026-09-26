import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Popover, Chip } from "@mui/material";
import SettingsIcon from "assets/settingsIcon.svg";
import DownloadIcon from "assets/download.svg";
import ExcelIcon from "assets/excel.svg";
import PdfIcon from "assets/pdf.svg";
import JpegIcon from "assets/jpg.svg";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GraphFilters from "core/commonComponents/graphFilters";
import { filterHierarchyValues } from "modules/assortsmart/constants-assortsmart/stringContants";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const HindsightGraphHeader = (props) => {
  const classes = useStyles();
  const [isSettingsPopoverOpen, setisSettingsPopoverOpen] = useState(null);
  const [filterChips, setFilterChips] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const closePopover = () => {
    setisSettingsPopoverOpen(null);
  };

  useEffect(() => {
    if (!isEmpty(props.graphFilters)) {
      const filterChipsObj = {};
      for (const key in props.graphFilters) {
        if (filterHierarchyValues.includes(key)) {
          filterChipsObj[key] = props.graphFilters[key];
        }
      }
      setFilterChips(filterChipsObj);
    }
  }, [props.graphFilters]);

  const handleExport = (format) => {
    setIsOpen(false);
    props.onExport(format);
  };

  // const buttonVisible = () => {
  //   if(props.graphLevelClass === 'pareto' && props.showGraph.performance_review){
  //     return true
  //   }
  //   if(props.graphLevelClass === 'performance_review' && props.showGraph.pareto){
  //     return true
  //   }
  //   if(props.graphLevelClass === 'performance_review' && !props.showGraph.pareto){
  //     return false
  //   }
  //   if(props.graphLevelClass === 'pareto' && !props.showGraph.performance_review){
  //     return false
  //   }

  //   if(props.graphLevelClass === 'st_margin_discount' && props.showGraph.clearance_carryover){
  //     return true
  //   }
  //   if(props.graphLevelClass === 'clearance_carryover' && props.showGraph.st_margin_discount){
  //     return true
  //   }
  //   if(props.graphLevelClass === 'clearance_carryover' && !props.showGraph.st_margin_discount){
  //     return false
  //   }
  //   if(props.graphLevelClass === 'st_margin_discount' && !props.showGraph.clearance_carryover){
  //     return false
  //   }
  //   return false
  // }

  const handleGraphExpand = (event) => {
    //if (event.target.classList?.contains(props.graphLevelClass)) {
    props.handleGraphExpand(props.graphLevelClass, !props.isGraphExpand);
    //}
  };

  const handlePopover = (event) => {
    setisSettingsPopoverOpen(event.currentTarget);
  };

  return (
    <div className={classes.graphHeader}>
      <div className={classes.resultContainer}>
        <div className={`${classes.kpiHeader} ${classes.filterChipLabel}`}>
          {props.heading}
        </div>
        <div>
          <span> Filters: </span>
          {filterChips &&
            Object.keys(filterChips)?.map((chipItem) => {
              return filterChips[chipItem]?.length ? (
                <Chip
                  className={`${classes.summaryChip} ${classes.filterChipsStyle}`}
                  label={
                    Array.isArray(filterChips[chipItem]) &&
                    filterChips[chipItem]?.length > 1
                      ? `${replaceSpecialCharacter(filterChips[chipItem][0])}` +
                        " (+" +
                        `${replaceSpecialCharacter(
                          filterChips[chipItem].length - 1
                        )}` +
                        ") "
                      : Array.isArray(filterChips[chipItem]) &&
                        filterChips[chipItem].length == 1
                      ? replaceSpecialCharacter(
                          filterChips[chipItem][0].toUpperCase()
                        )
                      : replaceSpecialCharacter(
                          filterChips[chipItem].toUpperCase()
                        )
                  }
                />
              ) : null;
            })}
        </div>
      </div>
      <div className={classes.headerDiv}>
        {props.graphType === "STMargin" ||
        props.graphType === "tree" ||
        props.graphType === "bubble" ||
        props.graphType === "clearance" ||
        props.graphType === "STDiscount" ||
        props.graphType === "pareto" ||
        props.graphType === "size_review" ||
        props.graphType === "attribute" ||
        props.graphType === "geograph" ||
        props.graphType === "timeline" ? (
          <>
            <button
              onClick={handlePopover}
              id="hindsightDashboardSettingBtn"
              className={classes.settingBtn}
            >
              <SettingsIcon className={classes.settingBtnIcon} />
            </button>

            <Popover
              id="hindsightDashboardSettingBtn"
              anchorEl={isSettingsPopoverOpen}
              open={Boolean(isSettingsPopoverOpen)}
              onClose={closePopover}
              anchorOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              className={classes.graphFiltersPopup}
            >
              <GraphFilters
                closePopover={closePopover}
                screenConfiguration={props.screenConfiguration}
                tabValues={props.tabValues}
                filtersConfig={props.filtersConfig}
                generateGraphData={(payload) =>
                  props.generateGraphData(payload)
                }
                hindsightFilterSelection={props.hindsightFilterSelection}
                graphFilters={props.graphFilters}
                setGraphFilters={props.setGraphFilters}
                graphType={props.graphType}
                hindsightPlanDetails={props.hindsightPlanDetails}
                levels={props.levels}
                levelsJson={props.levelsJson}
                treemapFiltersData={props.treemapFiltersData}
                setGraphDataReducer={props.setGraphDataReducer}
                graphSettingChanged={props.graphSettingChanged}
                setGraphSettingChanged={props.setGraphSettingChanged}
              />
            </Popover>
            <button
              id="download"
              onClick={() => setIsOpen(!isOpen)}
              className={classes.settingBtn}
            >
              <DownloadIcon className={classes.downloadBtnIcon} />
              {isOpen && (
                <ul className={classes.dropdownList}>
                  {!props.tempHide &&
                  <li
                    className={classes.dropdownListItem}
                    onClick={() => handleExport("excel")}
                  >
                    <ExcelIcon className={classes.downloadListIcon} /> Excel
                  </li>}
                  <li
                    className={classes.dropdownListItem}
                    onClick={() => handleExport("jpeg")}
                  >
                    <JpegIcon className={classes.downloadListIcon} /> JPEG
                  </li>
                  <li
                    className={classes.dropdownListItem}
                    onClick={() => handleExport("pdf")}
                  >
                    <PdfIcon className={classes.downloadListIcon} /> PDF
                  </li>
                </ul>
              )}
            </button>
          </>
        ) : (
          <>
            <>
              <button
                onClick={handlePopover}
                id="hindsightDashboardSettingBtn"
                className={classes.settingBtn}
              >
                <SettingsIcon className={classes.settingBtnIcon} />
              </button>

              <button
                id="download"
                onClick={() => handleExport("")}
                className={classes.settingBtn}
              >
                <DownloadIcon className={classes.downloadBtnIcon} />
              </button>

              <Popover
                id="hindsightDashboardSettingBtn"
                anchorEl={isSettingsPopoverOpen}
                open={Boolean(isSettingsPopoverOpen)}
                onClose={closePopover}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                className={classes.graphFiltersPopup}
              >
                <GraphFilters
                  closePopover={closePopover}
                  screenConfiguration={props.screenConfiguration}
                  tabValues={props.tabValues}
                  filtersConfig={props.filtersConfig}
                  generateGraphData={(payload) =>
                    props.generateGraphData(payload)
                  }
                  hindsightFilterSelection={props.hindsightFilterSelection}
                  graphFilters={props.graphFilters}
                  setGraphFilters={props.setGraphFilters}
                  graphType={props.graphType}
                  hindsightPlanDetails={props.hindsightPlanDetails}
                  levels={props.levels}
                  levelsJson={props.levelsJson}
                  treemapFiltersData={props.treemapFiltersData}
                  setGraphDataReducer={props.setGraphDataReducer}
                  graphSettingChanged={props.graphSettingChanged}
                  setGraphSettingChanged={props.setGraphSettingChanged}
                />
              </Popover>

              {/* To be uncommented later
              <button
                id="download"
                onClick={() => {}}
                className={classes.settingBtn}
              >
                <DownloadIcon className={classes.downloadBtnIcon} />
              </button> */}
            </>
          </>
        )}
        {props.btnVisible ? (
          <button
            id="CloseFullScreen"
            className={classes.arrowBtn}
            title={props.isGraphExpand ? "collapse" : "expand"}
            onClick={handleGraphExpand}
          >
            {props.isGraphExpand ? (
              <CloseFullscreenIcon
                className={classes.arrowBtnIcon}
                title={"collapse"}
              />
            ) : (
              <OpenInFullIcon
                className={classes.arrowBtnIcon}
                title={"expand"}
              />
            )}
          </button>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    levels: state.assortsmartReducer.planDashboardReducer.planLevels,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
  };
};

const mapActionsToProps = {};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightGraphHeader);
