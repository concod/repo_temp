import globalStyles from "core/Styles/globalStyles";
import StarIcon from "@mui/icons-material/Star";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import GlobalIcon from "coreAssets/filters/Globe.svg";
import PersonalIcon from "coreAssets/filters/user.svg";

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
        <ContentCopyIcon
          fontSize="small"
          className={`${classes.actionIcon} ${classes.actionIconColor}`}
          onClick={(e) => {
            e.stopPropagation();
            setCopySavedFilter(filter.name);
          }}
        />
        <EditOutlinedIcon
          fontSize="small"
          className={`${classes.actionIcon} ${classes.actionIconColor}`}
          onClick={(e) => onFilterChipEditClick(e, filter)}
        />
        <DeleteOutlinedIcon
          className={`${classes.actionIcon} ${classes.actionIconColor}`}
          fontSize="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDialog(filter.name);
          }}
        />
        <StarIcon
          className={classes.actionIcon}
          sx={{
            color: filter.is_default ? "#E1BC29" : "#60697D",
          }}
          fontSize="small"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!filter.is_default) {
              handleDialog(filter, true);
            }
          }}
        />
      </div>
    </div>
  );
};

export default SavedFilterCard;
