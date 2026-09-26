import { useEffect, useState, useRef } from "react";
import { Chip, Typography } from "@mui/material";
import { Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import {
  getTableViewConfigData,
  setTableViewConfigData,
  deleteTableView,
} from "./table-view-panel-service";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { isEmpty } from "lodash";

const useStyles = makeStyles(() => ({
  actionIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    color: colours.lightslategray,
  },
  paddingTop5px: {
    paddingTop: "5px",
    color: "#758498",
  },
  chipRoot: {
    "& .MuiChip-icon": {
      order: 1, // the label has a default order of 0, so this icon goes after the label
      marginRight: "15px", // add some space between icon and delete icon
      cursor: "pointer",
    },
    "& .MuiChip-deleteIcon": {
      order: 2, // since this is greater than an order of 1, it goes after the icon
    },
    editIcon: {
      backgroundColor: "#41a6f7",
      color: "white",
      "&:hover": {
        backgroundColor: "#41a6f7",
      },
    },
  },
  chipStyles: {
    backgroundColor: colours.white,
    padding: `${pxToRem(5)} ${pxToRem(10)} ${pxToRem(5)} ${pxToRem(5)}`,
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    "&.default": {
      border: `${pxToRem(1.2)} solid ${colours.webOrange}`,
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.active": {
      border: `${pxToRem(1.2)} solid ${colours.seaGreen}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.selected": {
      border: `${pxToRem(1.2)} solid ${colours.cobaltBlue}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
      color: `${colours.cobaltBlue}`,
    },
  },
  container: {
    display: "flex",
    justifyContent: "flex-start",
  },
  gap: {
    gap: "0.5rem",
  },
  paddingAround: {
    padding: `0.5rem 0 1rem ${pxToRem(18)}`,
  },
}));

const TableViewType = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();

  const {
    viewSelected,
    setViewSelected,
    tableViewData,
    tableName,
    setShowPanelLoader,
  } = props;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [onConfirmAction, setOnConfirmAction] = useState({ action: null });

  const containerRef = useRef(null);
  const [viewCount, setViewCount] = useState(tableViewData.length); // represents the chip count to be displayed in the UI, viewCount can have either lastViewAllCountValue or tableView tableViewData.length
  const visibleChips = tableViewData?.slice(0, viewCount);
  const [showViewAllButton, setShowViewAllButton] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [lastViewAllCountValue, setLastViewAllCountValue] = useState(
    tableViewData.length
  ); //caches the the chip count which can be accomodated in two rows

  useEffect(() => {
    /* 
      this useEffect will be active when the tableViewData changes or the focus of chip's container changes either due to insertion or deletion or screen resize
      
      so after the chip container is inserted into dom, check-
      if(containerHeight > heightOfTwoRows) then calculate how many chips can be accomodated in the two rows of container and store them into viewCount & lastViewAllCountValue and toggle between these value onCLick of viewAll button
      else by default rendering will be done
    */

    const container = containerRef.current;
    if (!container) return;

    const computedStyles = window.getComputedStyle(container);

    // Extract padding values and get absolute height of container
    const paddingTop = parseFloat(computedStyles.paddingTop);
    const paddingBottom = parseFloat(computedStyles.paddingBottom);
    const containerHeight =
      container.clientHeight - (paddingTop + paddingBottom);

    // Get the chip height
    const firstElement = container.firstElementChild;
    if (!firstElement) return;
    const firstElementHeight = firstElement.offsetHeight;

    const gapRow = parseFloat(computedStyles.rowGap);

    const heightOfTwoRows = 2 * firstElementHeight + gapRow;

    if (containerHeight > heightOfTwoRows) {
      let totalChildWidth = 0,
        rowCount = 1;

      //calculate absolute container width
      const paddingLeft = parseFloat(computedStyles.paddingLeft);
      const paddingRight = parseFloat(computedStyles.paddingRight);
      const containerWidth =
        container.clientWidth - (paddingLeft + paddingRight);

      const gapColumn = parseFloat(computedStyles.columnGap);

      Array.from(container.children).forEach((child, idx) => {
        // Get the width of each child
        const childWidth = child.offsetWidth;

        // If adding this child exceeds container width, increment rowCount
        if (totalChildWidth + childWidth > containerWidth) {
          rowCount += 1;
          totalChildWidth = childWidth; // Reset totalChildWidth for new row

          //if the content overflows to third row then-
          if (rowCount == 3) {
            setViewCount(idx);
            setLastViewAllCountValue(idx);
            setShowViewAllButton(true);
            setViewAll(true);
            return;
          }
        } else {
          totalChildWidth += childWidth;
          totalChildWidth += gapColumn;
        }
      });
    }
  }, [tableViewData, containerRef.current]);

  useEffect(() => {
    if (viewSelected == 0) {
      let viewId = 0;
      tableViewData.forEach((item, index) => {
        if (index === 0) {
          viewId = item.id;
        }
        if (item.is_default) {
          viewId = item.id;
        }
      });
      setViewSelected(viewId);
    }
  }, []);

  const onViewChipClick = (tableView) => {
    if (!(tableView === viewSelected)) setViewSelected(tableView);
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const handleDelete = async (viewId, tableName) => {
    try {
      setShowPanelLoader(true);
      await deleteTableView(viewId);
      const tableViewConfiguration = await getTableViewConfigData(
        "",
        tableName
      );
      props.setTableViewConfigData(tableViewConfiguration);
      displaySnackMessages("Table view deleted successfully", "success");
      setShowPanelLoader(false);
    } catch (err) {
      setShowPanelLoader(false);
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
    }
  };

  const onDeleteIconClick = (confirmAction) => {
    setOnConfirmAction({ action: confirmAction });
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteAction = () => {
    onConfirmAction.action?.();
    setOnConfirmAction({ action: null });
    setShowDeleteDialog(false);
  };

  const handleViewAllOnClick = () => {
    const prev = !viewAll;
    setViewAll(prev);
    if (prev) {
      setViewCount(lastViewAllCountValue);
    } else {
      setViewCount(tableViewData.length);
    }
  };

  return (
    <div className={classes.paddingAround}>
      <div className={`${globalClasses.gapHalf} ${globalClasses.flexRow}`}>
        {visibleChips.length !== 0 ? (
          <>
            <div
              ref={containerRef}
              className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.flexGrow}`}
            >
              {visibleChips?.map((view, idx) => {
                return (
                  <Chip
                    key={`chip-${idx}`}
                    classes={{
                      root: classes.chipRoot,
                    }}
                    label={view.view_name}
                    variant={"outlined"}
                    onDelete={() =>
                      onDeleteIconClick(() => handleDelete(view.id, tableName))
                    }
                    deleteIcon={
                      <DeleteOutlinedIcon
                        id={view.id}
                        className={classes.actionIcon}
                        fontSize="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(view.id);
                        }}
                      />
                    }
                    onClick={() => onViewChipClick(view.id)}
                    className={`${classes.chipStyles} ${
                      view.id === viewSelected
                        ? "selected"
                        : view.is_default
                        ? "default"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
            <div className={globalClasses.whiteSpace}>
              {showViewAllButton && (
                <Button variant="url" onClick={() => handleViewAllOnClick()}>
                  {viewAll ? "View All" : "Close"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <Typography
            variant="h7"
            gutterBottom
            className={classes.paddingTop5px}
          >
            {"No saved views(s) have been added"}
          </Typography>
        )}
      </div>
      <div
        className={`${classes.container} ${globalClasses.gap}  ${globalClasses.marginTop}`}
      >
        <div className={`${globalClasses.flexRow} ${classes.gap}`}>
          <div className={globalClasses.defaultChipStyle}></div>
          <Typography variant="subtitle1">Default</Typography>
        </div>
        <div className={`${globalClasses.flexRow} ${classes.gap}`}>
          <div className={globalClasses.selectedChipStyle}></div>
          <Typography variant="subtitle1">Selected</Typography>
        </div>
      </div>
      <div>
        <Prompt
          isOpen={showDeleteDialog}
          title="Delete View"
          subHeading={
            "Are you sure you want to delete this view, The selected view will be deleted permanently."
          }
          infoList={[]}
          primaryButtonProps={{
            children: "Delete",
            onClick: () => handleConfirmDeleteAction(),
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => {
              setShowDeleteDialog(false);
            },
          }}
          variant="error"
        />
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack,
    setTableViewConfigData: (payload) =>
      dispatch(setTableViewConfigData(payload)),
  };
};

export default connect(null, mapDispatchToProps)(TableViewType);
