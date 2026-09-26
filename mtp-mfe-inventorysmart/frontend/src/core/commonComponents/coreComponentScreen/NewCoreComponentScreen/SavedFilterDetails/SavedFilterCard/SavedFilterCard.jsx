import globalStyles from "core/Styles/globalStyles";
import StarIcon from "@mui/icons-material/Star";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import GlobalIcon from "coreAssets/filters/Globe.svg";
import PersonalIcon from "coreAssets/filters/user.svg";
import AllScreenIcon from "coreAssets/filters/AllScreen.svg";
import CurrentScreenIcon from "coreAssets/filters/CurrentScreen.svg";
import colours from "core/Styles/colours";
import { Tooltip } from "impact-ui-v3";
import { useTranslation } from "impact-ui-v3";
const SavedFilterCard = ({
  filterSelected,
  setFilterSelected,
  filter,
  classes,
  setCurrentSelectedFilterName,
  savedFilterSectionRef,
  setCopySavedFilter,
  onFilterChipEditClick,
  handleDialog,
}) => {
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  return (
    <div
      className={`${globalClasses.flexRow} ${
        globalClasses.layoutAlignBetweenCenter
      } ${classes.savedFilter} ${
        filterSelected === filter.name ? classes.active : ""
      }`}
      onClick={() => {
        setCurrentSelectedFilterName(filter.name);
        savedFilterSectionRef.current = {
          ...savedFilterSectionRef.current,
          previousFilterSelected: filterSelected,
        };
      }}
    >
      <div className={classes.savedFilterHeading}>{filter.name}</div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.gap12}`}
      >
        <Tooltip
          title={filter.screen_name === "All" ? t("filters.appliedToAllScreen") : t("filters.appliedToCurrentScreen")}
          variant="tertiary"
        >
          <span className={globalClasses.centerAlign}>
            {filter.screen_name === "All" ? (
              <AllScreenIcon
                className={`${classes.actionIcon} ${classes.actionIconColor}`}
                fontSize="small"
              />
            ) : (
              <CurrentScreenIcon
                className={`${classes.actionIcon} ${classes.actionIconColor}`}
                fontSize="small"
              />
            )}
          </span>
        </Tooltip>
        {filter.is_broadcast ? (
          <GlobalIcon
            className={`${classes.actionIcon} ${classes.actionIconColor}`}
            fontSize="small"
          />
        ) : (
          <PersonalIcon
            className={`${classes.actionIcon} ${classes.actionIconColor}`}
            fontSize="small"
          />
        )}
        <span className={classes.separater} />
        <Tooltip title={t("filters.copy")} variant="tertiary">
          <ContentCopyIcon
            fontSize="small"
            className={`${classes.actionIcon} ${classes.actionIconColor}`}
            onClick={(e) => {
              e.stopPropagation();
              setCopySavedFilter(filter.name);
            }}
          />
        </Tooltip>
        <Tooltip title={t("filters.edit")} variant="tertiary">
          <EditOutlinedIcon
            fontSize="small"
            className={`${classes.actionIcon} ${classes.actionIconColor}`}
            onClick={(e) => onFilterChipEditClick(e, filter)}
          />
        </Tooltip>
        <Tooltip title={t("filters.delete")} variant="tertiary">
          <DeleteOutlinedIcon
            className={`${classes.actionIcon} ${classes.actionIconColor}`}
            fontSize="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDialog(filter.name);
            }}
          />
        </Tooltip>
        {filter.is_default ? (
          <StarIcon
            className={classes.actionIcon}
            sx={{ color: colours.surfaceYellow }}
            fontSize="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        ) : (
          <StarBorderOutlinedIcon
            className={classes.actionIcon}
              sx={{ color: colours.neutralGrey }}
            fontSize="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDialog(filter, true);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SavedFilterCard;
