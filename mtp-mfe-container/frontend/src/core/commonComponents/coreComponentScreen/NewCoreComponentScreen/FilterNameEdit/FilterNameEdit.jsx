import { useEffect, useState } from "react";
import { Input, Badge, Button, Menu } from "impact-ui-v3";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import { pxToRem } from "core/Utils/functions/utils";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import GlobalIcon from "coreAssets/filters/Globe.svg";
import PersonalIcon from "coreAssets/filters/user.svg";
import "./FilterNameEdit.scss";
import { useTranslation } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  actionIcon: {
    width: pxToRem(24),
    height: pxToRem(24),
    cursor: "pointer",
  },
  actionIconColor: {
    color: colours.neutrals,
  },
  marginLeft4: {
    marginLeft: "0.25rem",
  },
  marginRight12: {
    marginRight: "0.75rem",
  },
}));

const FilterNameEdit = (props) => {
  const {
    copyFilterDetailsRef,
    copySavedFilter,
    savedFilterSectionRef,
    savedFiltersList,
    setCopySavedFilter,
    onFilterChipEditClick,
    setCurrentSelectedFilterName,
    handleDialog,
    currentSelectedFilterName,
  } = props;
  const classes = useStyles();

  const [copyFilterData, setCopyFilterData] = useState({
    filter_name: copySavedFilter
      ? copySavedFilter
        ? `Copy_${savedFiltersList.name}`
        : savedFiltersList.name
      : savedFiltersList.name,
    is_default: savedFiltersList.is_default,
  });
  const [nameEdit, setNameEdit] = useState(!!copySavedFilter);
  const [anchorEl, setAnchorEl] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    setNameEdit(!!copySavedFilter);
    setCopyFilterData({
      filter_name: copySavedFilter
        ? copySavedFilter
          ? `Copy_${savedFiltersList.name}`
          : savedFiltersList.name
        : savedFiltersList.name,
      is_default: savedFiltersList.is_default,
    });
  }, [copySavedFilter]);

  useEffect(() => {
    copyFilterDetailsRef.current = copyFilterData;
    savedFilterSectionRef.current = {
      ...savedFilterSectionRef.current,
      copyFilterData: copyFilterData,
    };
  }, [copyFilterData]);

  return (
    <div>
      <div className="savedFilter-heading-section">
        {copySavedFilter && nameEdit ? (
          <div className="copy-filter">
            <Input
              value={copyFilterData.filter_name}
              onChange={(event) => {
                setCopyFilterData({
                  ...copyFilterData,
                  filter_name: event.target.value,
                });
              }}
              name="filter_name"
              placeholder={t("filters.filterName")}
            />
            <CheckIcon
              className={`${classes.actionIcon} ${classes.actionIconColor} ${classes.marginLeft4}`}
              fontSize="small"
              onClick={() => {
                setNameEdit(false);
              }}
            />
            <CloseIcon
              className={`${classes.actionIcon} ${classes.actionIconColor}`}
              fontSize="small"
              onClick={() => {
                setCopySavedFilter("");
              }}
            />
          </div>
        ) : (
          <div className="savedFilterSection">
            <span
              className="savedFilter-heading"
              onClick={() => {
                if (copySavedFilter) {
                  setNameEdit(true);
                }
              }}
            >
              {copyFilterData.filter_name}
            </span>
            {savedFiltersList.description && (
              <span
                className="savedFilter-subheading"
                onClick={() => {
                  if (copySavedFilter) {
                    setNameEdit(true);
                  }
                }}
              >
                {savedFiltersList.description}
              </span>
            )}
          </div>
        )}

        <StarIcon
          key={copyFilterData.is_default}
          className={`${classes.actionIcon} ${classes.marginLeft4} ${classes.marginRight12}`}
          sx={{
            color: copyFilterData.is_default ? "#E1BC29" : "#D9DDE7",
          }}
          fontSize="small"
          onClick={(e) => {
            if (copySavedFilter) {
              e.stopPropagation();
              setCopyFilterData({
                ...copyFilterData,
                is_default: !copyFilterData.is_default,
              });
            }
          }}
        />
        <Button
          icon={<MoreHorizIcon />}
          variant="text"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        />
        <Menu
          anchorEl={anchorEl}
          open={anchorEl}
          onClose={() => {
            setAnchorEl(null);
          }}
          selected=""
          options={[
            {
              label: t("filters.edit"),
              value: "edit",
              onClick: (e, event) => {
                onFilterChipEditClick(event, savedFiltersList);
                setAnchorEl(null);
              },
            },
            {
              label: t("filters.copy"),
              value: "copy",
              disabled: copySavedFilter,
              onClick: (e, event) => {
                event.stopPropagation();
                setCopySavedFilter(currentSelectedFilterName);
                setCurrentSelectedFilterName("");
                setAnchorEl(null);
              },
            },
            {
              label: t("filters.delete"),
              value: "delete",
              disabled: copySavedFilter,
              onClick: (e, event) => {
                event.stopPropagation();
                handleDialog(currentSelectedFilterName);
                setAnchorEl(null);
              },
            },
          ]}
        />
      </div>
      <Badge
        isIcon={true}
        label={
          savedFiltersList.is_broadcast ? t("filters.globalFilter") : t("filters.personalFilter")
        }
        icon={savedFiltersList.is_broadcast ? <GlobalIcon /> : <PersonalIcon />}
        variant="subtle"
        size="medium"
      />
    </div>
  );
};

export default FilterNameEdit;
