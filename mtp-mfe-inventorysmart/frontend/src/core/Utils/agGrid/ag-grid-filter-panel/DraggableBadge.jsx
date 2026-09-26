import makeStyles from "@mui/styles/makeStyles";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  badgeBody: {
    width: pxToRem(170),
    height: pxToRem(26),
    padding: pxToRem(5),
    borderRadius: pxToRem(4),
    border: `1px solid ${theme.palette.colours.disabledBadge}`,
  },
  fieldContentWrapper: {
    gap: pxToRem(3),
    width:"100%",
    justifyContent:"space-between"
  },
  dragIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    color: theme.palette.textColours.codGray,
  },
  actionButtonIcon: {
    width: pxToRem(12),
    height: pxToRem(12),
    color: theme.palette.textColours.slateGrayLight,
    cursor: "pointer",
  },
  badgeLabel: {
    color: theme.palette.textColours.slateGrayLight,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  labelDropdownContainer: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(4),
    fontSize: pxToRem(12),
    height: pxToRem(20),
    fontSize: pxToRem(12),
    lineHeight: pxToRem(18),
    borderRadius: pxToRem(4),
    marginLeft: pxToRem(4),
    background: theme.palette.common.white,
    color: theme.palette.primary.main,
    "& .select-main-container .select-container .select-button": {
      width: "fit-content",
      minWidth: pxToRem(0),
      padding: pxToRem(4),
      height: pxToRem(18),
      fontSize: pxToRem(12),
    },
  },
}));

const DraggableBadge = ({
  onDragStart,
  onDragEnd,
  label,
  dataArray,
  updateAction,
  value,
  children,
  selectedFieldItems,
  setSelectedFieldItems,
  valueIndex,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [showActionButtons, setShowActionButtons] = useState(false);
  const badgeRef = useRef(null);
  const [maxLabelWidth, setLabelWidth] = useState({
    initial: 159,
    current:159
  });

  // Function to delete badge from selected field
  const handleRemoveBadge = () => {
    const Indexes = _.keys(_.pickBy(dataArray, { value: value }));
    if (Indexes.length > 1) {
      updateAction(
        dataArray.filter(
          (item, index) => `${item.value}_${index}` !== valueIndex
        )
      );
      
    } else {
      updateAction(dataArray.filter((item) => item.value !== value));
    }
    setSelectedFieldItems(
      selectedFieldItems.filter((element) => element !== value)
    );
  };
  /**
   * Width for the Close & Move up icon buttons
   * @param {Number} CTAwidth 
   */
  const updateLabelWidth = (CTAwidth = 0) => {
    if (badgeRef?.current) {
      const childElements = badgeRef.current.children;
      const dragIcon = childElements?.[0]?.children?.[0];
      const badgeLabel = childElements?.[0]?.children?.[1];
      const dropdown = childElements?.[1];

      // Getting the widths of the badge and its child elements 
      const dragIconWidth = parseFloat(window.getComputedStyle(dragIcon).width);
      const badgeLabelWidth = parseFloat(
        window.getComputedStyle(badgeLabel).width
      );
      const dropdownWidth = parseFloat(window.getComputedStyle(dropdown).width);
      const badgeRefWidth = 159;
      const badgeRefGap = parseFloat(
        window.getComputedStyle(badgeRef.current).columnGap
      );
      setLabelWidth({
        ...maxLabelWidth,
        initial: badgeLabelWidth
      })

      const totalChildWidth = // Total width of the badge calculated after the widths of childElements
        dragIconWidth +
        maxLabelWidth.initial +
        dropdownWidth +
        badgeRefGap +
        CTAwidth +
        1.625; // padding

        // Checking if the calculated childwidth for the badge is larger than the maxPossible width 
      if (totalChildWidth > 160 ) {
        const overflow = totalChildWidth - badgeRefWidth;
        const newBadgeLabelWidth = maxLabelWidth.initial - overflow;
        setLabelWidth({
          ...maxLabelWidth,
          current: newBadgeLabelWidth,
        });
      }
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateLabelWidth();
      setShowActionButtons(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [badgeRef, children]);

  // Function to move up badge in the selected field
  const handleMoveUp = () => {
    const data = [...dataArray];
    const Indexes = _.keys(_.pickBy(dataArray, { value: value }));
    let currentIndex;
    if(Indexes.length >1){
      currentIndex = data.findIndex((item, index) => `${item.value}_${index}` === valueIndex);
    } else {
      currentIndex = data.findIndex((item) => item.value === value);
    }
    if (currentIndex <= 0 || currentIndex >= data.length) {
      return;
    }
    const newIndex = data[currentIndex - 1];
    data[currentIndex - 1] = data[currentIndex];
    data[currentIndex] = newIndex;
    updateAction(data);
  };
  return (
    <div
      className={`${classes.badgeBody} ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
      onMouseEnter={() => {
        setShowActionButtons(true);
        let itemIndex = valueIndex.split("_")[
          `${Number(valueIndex.split("_").length) - 1}`
        ];
        updateLabelWidth(itemIndex === "0" ? 15 : 30);
      }}
      onMouseLeave={() => {
        setShowActionButtons(false);
        updateLabelWidth(0);
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${classes.fieldContentWrapper}`}
        ref={badgeRef}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
        >
          <DragIndicatorIcon className={classes.dragIcon} />
          <Typography
            variant="text"
            className={classes.badgeLabel}
            sx={{ maxWidth: maxLabelWidth.current }}
          >
            {label}
          </Typography>
        </div>
        <div className={classes.labelDropdownContainer}>{children}</div>
      </div>
      <div
        className={`${
          showActionButtons ? globalClasses.flexRow : globalClasses.displayNone
        } ${globalClasses.verticalAlignCenter}`}
      >
        {valueIndex.split("_")[
          `${Number(valueIndex.split("_").length) - 1}`
        ] !== "0" && (
          <ArrowUpwardIcon
            className={classes.actionButtonIcon}
            onClick={handleMoveUp}
          />
        )}
        <CloseIcon
          className={classes.actionButtonIcon}
          onClick={handleRemoveBadge}
        />
      </div>
    </div>
  );
};

export default DraggableBadge;
