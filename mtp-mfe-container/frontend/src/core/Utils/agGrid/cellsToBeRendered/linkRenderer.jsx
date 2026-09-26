import { useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button, Tooltip } from "impact-ui-v3";
import { numbersWithComma } from "core/Utils/formatter";
import UploadIcon from "coreAssets/upload.svg";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  linkIcon: {
    width: 12,
    AspectRatio: "1/1",
  },
}));

const LinkRenderer = ({
  props,
  item,
  colDef,
  data,
  value,
  isRowDisabled,
  identifier,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const activeEditableCell = useSelector(
    (state) => state.tableReducer.activeEditableCell
  );
  const handleLinkClick = useCallback(() => {
    props?.column?.onClick
      ? props.column.onClick(props)
      : colDef?.column_name
        ? props?.actions?.[colDef?.column_name]?.(
          data,
          colDef?.column_name,
          item
        )
        : props?.actions?.[colDef?.showRowGroup]?.(
          props.cellData,
          colDef?.showRowGroup
        );
  }, [props, colDef]);

  useEffect(() => {
    if (activeEditableCell === identifier) {
      handleLinkClick();
    }
  }, [activeEditableCell]);

  return (
    <>
      {(value != null)  ? (
        <>
          {props?.column?.extra?.enableIcon ? (
            <div
              className={`${globalClasses.flexAlignBetweenCenter} ${props?.column?.extra?.iconPlacement === "right" &&
                globalClasses.flexReverse
                }`}
            >
              <Tooltip
                orientation={
                  props?.column?.extra?.tooltipOrientation || "top"
                }
                title={`${props?.cellData?.data?.[
                  `${props?.column?.accessor}_tooltip`
                  ] || ""
                  }`}
                variant={
                  props?.column?.extra?.tooltipVariant || "tertiary"
                }
              >
                <Button
                  variant="url"
                  onClick={handleLinkClick}
                  disabled={
                    props?.isPropsOverrideColumnDef
                      ? props?.isDisabled
                      : isRowDisabled
                  }
                  icon={
                    props?.column?.extra?.icon ? (
                      props?.column?.extra?.icon
                    ) : (
                      <UploadIcon className={classes.linkIcon} />
                    )
                  }
                />
              </Tooltip>
              {item?.formatter && item.formatter === "numbersWithComma"
                ? numbersWithComma(props.cellData, 0)
                : value}
            </div>
          ) : (
            <Button
              variant="url"
              onClick={handleLinkClick}
              disabled={
                props?.isPropsOverrideColumnDef
                  ? props?.isDisabled
                  : isRowDisabled
              }
            >
              {item?.formatter && item.formatter === "numbersWithComma"
                ? numbersWithComma(props.cellData, 0)
                : value}
            </Button>
          )}
        </>
      ) : (
        "-"
      )}
    </>
  );
};

export default LinkRenderer;
