import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { Button } from "impact-ui-v3";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import makeStyles from "@mui/styles/makeStyles";
import { Badge } from "impact-ui";
import { cloneDeep } from "lodash";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  headerTextMargin: {
    marginBottom: "0.5rem",
  },
  chipsContainer: {
    border: `1px solid ${theme.palette.colours.tableBorderColor}`,
    borderRadius: "0.25rem",
    flexWrap: "wrap",
    gap: "0.5rem",
    padding: "0.5rem",
    minHeight: theme.typography.pxToRem(44),

    "& .ligth-badge": {
      opacity: 0.5,
    },
  },
  swapButton: {
    minWidth: "unset",
    padding: "0.5rem",
  },
  dashContainer: {
    borderStyle: "dashed",
    borderColor: `${theme.palette.common.black}`,
    minHeight: "2.75rem",
  },
}));

const DragAndDrop = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [allOptions, setAllOptions] = useState([]);
  const [types, setTypes] = useState([]);
  const [primaryFileds, setPrimaryFields] = useState([]);
  const [secondaryFields, setSecondaryFields] = useState([]);

  useEffect(() => {
    if (props.dependency.length) {
      const depTypes = props.dependency.map((deps) => deps.type);
      setAllOptions(props.dependency[0].options);
      setPrimaryFields(props.dependency?.[1]?.options || []);
      setSecondaryFields(props.dependency?.[2]?.options || []);
      setTypes(depTypes);
    }
  }, []);

  /**
   * @function
   * @description Handle swap operation between two drop area
   */
  const handleSwap = () => {
    const swapperVar = cloneDeep(secondaryFields);
    setSecondaryFields(cloneDeep(primaryFileds));
    setPrimaryFields(swapperVar);
  };

  /**
   * @function
   * @description Add element's data to transfer constructor while start to drag a badge
   * @param {Object} event
   * @param {String} value
   * @param {String} from
   */
  const showLightBadge = (event, value, from) => {
    event.target.classList.add("ligth-badge");
    event.dataTransfer.clearData();
    event.dataTransfer.setData("data", `${value}-++-${from}`);
  };

  /**
   * @function
   * @description Remove light-badge class from elenent just dragged
   * @param {Object} event
   */
  const hideLightBadge = (event) => {
    event.target.classList.remove("ligth-badge");
  };

  /**
   * @function
   * @description Handle defaulte operation on drageOver other elements
   * @param {Object} event
   */
  const dragOver = (event) => {
    event.preventDefault();
  };

  /**
   * @function
   * @description Handle badge changes when badges dropped into other container
   * @param {Object} event
   * @param {String} type
   */
  const onDrop = (event, type) => {
    const itemData = event.dataTransfer.getData("data").split("-++-");
    const data = {
      val: itemData[0],
      category: itemData[1],
    };
    if (type === data.category) {
      return;
    }
    let badgeData;
    let updatedAllOptions, updatedPrimaryOption, updatedSecondaryOptions;
    switch (data.category) {
      case types[1]:
        const newPrimaryFields = primaryFileds.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        updatedPrimaryOption = [...newPrimaryFields];
        setPrimaryFields(newPrimaryFields);
        break;
      case types[2]:
        const newSecondaryFields = secondaryFields.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        updatedSecondaryOptions = [...newSecondaryFields];
        setSecondaryFields(newSecondaryFields);
        break;
      default:
        const newFields = allOptions.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        updatedAllOptions = [...newFields];
        setAllOptions(newFields);
    }

    switch (type) {
      case types[1]:
        updatedPrimaryOption = [...primaryFileds, badgeData];
        setPrimaryFields([...primaryFileds, badgeData]);
        break;
      case types[2]:
        updatedSecondaryOptions = [...secondaryFields, badgeData];
        setSecondaryFields([...secondaryFields, badgeData]);
        break;
      default:
        updatedAllOptions = [...allOptions, badgeData];
        setAllOptions([...allOptions, badgeData]);
    }
    props.handleChange &&
      props.handleChange({ allOptions: updatedAllOptions, primaryFileds: updatedPrimaryOption, secondaryFields: updatedSecondaryOptions });
  };

  return (
    <>
      <div
        onClick={(event) => {
          event.stopPropagation(), event.preventDefault();
        }}
        className={globalClasses.fullWidth}
      >
        {props.dependency[0].label && (
          <Typography
            component="p"
            variant="subtitle1"
            className={`${classes.headerTextMargin}`}
          >
            {props.dependency[0].label}
          </Typography>
        )}
        <div
          className={`${classes.chipsContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
          onDragOver={(e) => dragOver(e)}
          onDrop={(e) => onDrop(e, types[0])}
        >
          {allOptions.map((badge) => (
            <Badge
              draggable
              onDragStart={(event) =>
                showLightBadge(event, badge.value, types[0])
              }
              variant={`${
                badge.variant || props.badgeVariants?.[0] || "default"
              }`}
              onDragEnd={(event) => hideLightBadge(event)}
              key={badge.value}
              label={badge.label}
              secondary
            />
          ))}
        </div>
        {props.dependency[1].label && (
          <Typography
            component="p"
            variant="subtitle1"
            className={`${classes.headerTextMargin}`}
          >
            {props.dependency[1].label}
          </Typography>
        )}
        <DropArea
          typeIndex={1}
          badgeVariant={props.badgeVariants?.[1]}
          updatedFields={primaryFileds}
          types={types}
          showLightBadge={showLightBadge}
          hideLightBadge={hideLightBadge}
          dragOver={dragOver}
          onDrop={onDrop}
        />
        {props.isSwappable && props.hasMultiDropArea && (
          <div
            className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
          >
            <Button
              variant="secondary"
              onClick={handleSwap}
              className={classes.swapButton}
            >
              <SwapVertIcon fontSize="inherit" />
            </Button>
          </div>
        )}
        {props.hasMultiDropArea && (
          <>
            {props.dependency[2].label && (
              <Typography
                component="p"
                variant="subtitle1"
                className={`${classes.headerTextMargin}`}
              >
                {props.dependency[2].label}
              </Typography>
            )}
            <DropArea
              typeIndex={2}
              badgeVariant={props.badgeVariants?.[2]}
              updatedFields={secondaryFields}
              types={types}
              hideLightBadge={hideLightBadge}
              showLightBadge={showLightBadge}
              dragOver={dragOver}
              onDrop={onDrop}
            />
          </>
        )}
      </div>
    </>
  );
};

export default DragAndDrop;

const DropArea = (props) => {
  const { updatedFields, types, typeIndex } = { ...props };
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div
      className={`${classes.chipsContainer} ${classes.dashContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
      onDragOver={(e) => props.dragOver(e)}
      onDrop={(e) => props.onDrop(e, types[typeIndex])}
    >
      {updatedFields.map((badge) => (
        <Badge
          draggable
          onDragStart={(event) =>
            props.showLightBadge(event, badge.value, types[typeIndex])
          }
          onDragEnd={(event) => props.hideLightBadge(event)}
          key={badge.value}
          label={badge.label}
          variant={`${badge.variant || props.badgeVariant || "default"}`}
          secondary
        />
      ))}
    </div>
  );
};
