import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { Typography } from "@mui/material";
import { Tooltip, Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import ViewPackConfiguration from "../ViewPackConfiguration";
import globalStyles from "core/Styles/globalStyles";

export const useStyles = makeStyles((theme) => ({
  titleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    height: "32px",
  },
  title: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1F2B4D",
    marginLeft: "12px",
  },
  titleSubTitle: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#60697D",
    textTransform: "capitalize",
  },
  titleSubTitleValue: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#1F2B4D",
  },
  statusBarContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "10px",
    height: "40px",
    overflow: "hidden",
    overflowX: "auto",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    // Hide scrollbar for webkit browsers (Chrome, Safari, Edge)
    "&::-webkit-scrollbar": {
      display: "none",
    },
    // Hide scrollbar for Firefox
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  container: {
    padding: "4px 8px 4px 16px",
    background: "#F8F9FB",
    borderRadius: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-start",
    height: "36px",
    flexShrink: 0,
    minWidth: "auto",
    position: "relative",
  },
  alertsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
    flex: "1 1 auto",
  },
  alertIcon: {
    alignItems: "center",
    color: "#31416E",
    fontSize: "14px",
    minWidth: "40px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  statsContainer: {
    display: "flex",
    gap: "0.5rem",
    flexShrink: 0,
    minWidth: 0,
  },
  statPanel: {
    display: "flex",
    alignItems: "center",
    background: "white",
    padding: "4px 12px",
    borderRadius: "4px",
    minWidth: "120px",
    gap: "0.75rem",
    borderLeft: "1px solid #99BF3E",
  },
  label: {
    color: "#60697D",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    marginRight: "10px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "150px",
  },
  value: {
    color: "#1F2B4D",
    fontSize: "14px",
    lineHeight: "20px",
    textAlign: "right",
  },
  totalAllocation: {
    borderLeft: "1.5px solid #ED7955",
    minWidth: "160px",
    width: "auto",
    maxWidth: "400px",
    flexShrink: 0,
  },
  totalLabel: {
    color: "#60697D",
    fontSize: "12px",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: "120px",
    maxWidth: "none",
  },
  totalValue: {
    color: "#31416E",
    fontSize: "14px",
    fontWeight: "600",
  },
  expandButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: "20px",
    width: "20px",
    height: "20px",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    border: "none",
    cursor: "pointer",
    color: "#60697D",
    display: "flex",
    flexShrink: 0,
    marginLeft: "8px",
    flex: "0 0 20px",
  },
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
   masterDetailPadding: {
    padding: "16px 24px 0px 24px",
    marginTop: "-16px",
    marginBottom: "-16px",
    background: "#FFFFFF",
    "& .ia-basic-table-layout.table-v32 .impact-table-main-container .impact-table-main-header": {
      padding: "0px 0px 10px 0px"
    },
    "& .css-makeStyles-title-21542": {
      marginLeft: "0px",
    },
    "& .ia-basic-table-layout.table-v32 .ag-root": {
      borderLeft: "none",
    }
  }
}));

const ExpandableDetails = forwardRef(
  (
    {
      title = "Net DC Available",
      productDetailsTableColumns = [],
      selectedArticle,
      rowData = [],
      columns = [],
      gridApi = null,
      articleKey = "article",
      handleCloseButtonClick,
      titleSubTitle = "Article ID",
      viewPackConfiguration = true
    },
    ref
  ) => {
    
    const globalClasses = globalStyles();
    const classes = useStyles();
    const [expandedContainers, setExpandedContainers] = useState({});
    const [gridData, setGridData] = useState([]);
    const [showViewPackConfiguration, setViewPackConfiguration] = useState(false);
    const statusBarContainerRef = useRef(null);

    // whenever rowData available update gridData
    useEffect(() => {
      if (rowData && rowData.length > 0) {
        setGridData(rowData);
      }
    }, [rowData]);

    // use columns directly
    const column = columns.length ? columns : [];

    // function to update gridData whenever gridApi changes or when edit happens in product store details table
    const updateGridData = React.useCallback(() => {
      if (gridApi) {
        const currentData = [];
        // get all row data from the grid API
        gridApi.forEachNode((node) => {
          if (node.data) currentData.push({ ...node.data });
        });
        // if we have data, update our state
        if (currentData.length > 0) {
          setGridData(currentData);
        }
      }
    }, [gridApi]);

    // Update gridData whenever gridApi changes or when explicitly triggered
    useEffect(() => {
      if (gridApi) {
        updateGridData();
      }
    }, [gridApi, updateGridData]);

    // Expose the update method to parent component
    useImperativeHandle(
      ref,
      () => ({
        updateData: updateGridData,
      }),
      [updateGridData]
    );

    // Add wheel event listener for mouse scroll on status bar container
    useEffect(() => {
      const container = statusBarContainerRef.current;
      if (container) {
        const handleWheel = (e) => {
          const canScrollHorizontally =
            container.scrollWidth > container.clientWidth &&
            ((e.deltaY > 0 &&
              container.scrollLeft + container.clientWidth < container.scrollWidth) ||
              (e.deltaY < 0 && container.scrollLeft > 0));

          if (!canScrollHorizontally) {
            return;
          }
          container.scrollLeft += e.deltaY;
        };
        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
          container.removeEventListener("wheel", handleWheel);
        };
      }
    }, []);

    const handleContainerToggle = (containerKey) => {
      setExpandedContainers((prev) => ({
        ...prev,
        [containerKey]: !prev[containerKey],
      }));
    };

    const calculateTotalAllocation = (subHeader) => {
      if (!subHeader.sub_headers) return 0;

      // get the latest data directly from the grid API if available
      let latestData = null;
      if (gridApi) {
        // we only need the first node's data
        gridApi.forEachNode((node) => {
          if (!latestData && node.data) {
            latestData = node.data;
          }
        });
      }

      const currentData =
        latestData ||
        (rowData && rowData.length > 0 ? rowData[0] : {}) ||
        (gridData && gridData.length > 0 ? gridData[0] : {});

      if (!currentData || Object.keys(currentData).length === 0) {
        return 0;
      }

      return subHeader.sub_headers.reduce((total, sizeHeader) => {
        const value = currentData[sizeHeader.column_name];
        return (
          total +
          (value !== undefined && !isNaN(Number(value)) ? Number(value) : 0)
        );
      }, 0);
    };

    const formatValue = (value) => {
      if (value === "N/A" || isNaN(Number(value))) return value;
      const numValue = Number(value);
      return Number.isInteger(numValue) ? numValue : numValue.toFixed(2);
    };

    return (
      <div className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_8}`}>
        <div className={classes.titleContainer}>
          <div className={`${globalClasses.centerAlign} ${globalClasses.gapHalf}`}>
            <span className={classes.title}>{title}</span>
            <div className={classes.dividerLine}></div>
            <span className={classes.titleSubTitle}>
              {productDetailsTableColumns?.find(
                (column) => column.column_name === articleKey
              )?.label || titleSubTitle}
            </span>:
            <span className={classes.titleSubTitleValue}>
              {replaceSpecialCharacter(selectedArticle) || "N/A"}
            </span>
          </div>
          <div className={`${globalClasses.centerAlign} ${globalClasses.gapHalf}`}>
            {viewPackConfiguration && (
              <>
                <Button 
                  variant="tertiary"
                  size="large"
                  onClick={() => setViewPackConfiguration(true)}
                >
                  View Pack Configuration
                </Button>
                <div className={classes.dividerLine} />
              </>
            )}
            <Button 
              variant="text"
              size="large"
              onClick={handleCloseButtonClick}
              icon={<CloseIcon />}
              iconPlacement="right"
            >
              Close
            </Button>
          </div>
        </div>

        {showViewPackConfiguration && viewPackConfiguration && (
          <ViewPackConfiguration
            isOpen={showViewPackConfiguration}
            onClose={() => setViewPackConfiguration(false)}
            selectedArticle={selectedArticle}
          />
        )}

        <div 
          ref={statusBarContainerRef}
          className={classes.statusBarContainer}
        >
          {column[0]?.sub_headers?.map((firstLevelHeader, headerIndex) => (
            <div className={classes.container} key={headerIndex}>
              <div className={classes.alertsContainer}>
                <Tooltip
                  title={firstLevelHeader.label || firstLevelHeader.headerName || "DC"}
                  variant="tertiary"
                >
                  <div className={classes.alertIcon}>
                    <span>
                      {firstLevelHeader.label || firstLevelHeader.headerName}
                    </span>
                  </div>
                </Tooltip>
                <div
                  className={`${classes.totalAllocation} ${classes.statPanel}`}
                >
                  <Tooltip
                    title={column[0]?.label || "Total allocation"}
                    variant="tertiary"
                  >
                    <span className={classes.totalLabel}>
                      {column[0]?.label || "Total allocation"}
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={formatValue(calculateTotalAllocation(firstLevelHeader))}
                    variant="tertiary"
                  >
                    <span className={classes.totalValue}>
                      {formatValue(calculateTotalAllocation(firstLevelHeader))}
                    </span>
                  </Tooltip>
                </div>
                {expandedContainers[firstLevelHeader.column_name] && (
                  <div className={classes.statsContainer}>
                    {firstLevelHeader?.sub_headers?.map(
                      (sizeHeader, sizeIndex) => {
                        const sizeValue = formatValue(
                          rowData?.[0]?.[sizeHeader.column_name] ??
                            gridData?.[0]?.[sizeHeader.column_name] ??
                            0
                        );
                        return (
                          <div key={sizeIndex} className={classes.statPanel}>
                            <Tooltip
                              title={sizeHeader.label}
                              variant="tertiary"
                            >
                              <Typography
                                className={classes.label}
                                noWrap
                              >
                                {sizeHeader.label}
                              </Typography>
                            </Tooltip>
                            <Tooltip
                              title={sizeValue}
                              variant="tertiary"
                            >
                              <Typography className={classes.value}>
                                {sizeValue}
                              </Typography>
                            </Tooltip>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
                <button
                  className={classes.expandButton}
                  onClick={() =>
                    handleContainerToggle(firstLevelHeader.column_name)
                  }
                >
                  {expandedContainers[firstLevelHeader.column_name] ? "<" : ">"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export default ExpandableDetails;
