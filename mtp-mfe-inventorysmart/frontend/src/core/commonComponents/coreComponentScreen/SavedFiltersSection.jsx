import { useEffect, useState, useMemo, useRef } from "react";
import { Prompt } from "impact-ui-v3";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import Form from "core/Utils/form";
import { isTextInputValid } from "core/Utils/form/form-helpers.js";
import globalStyles from "core/Styles/globalStyles";
import { setSavedFiltersList } from "core/actions/filterAction";
import { connect } from "react-redux";
import { find, isEmpty, trim } from "lodash";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import { pxToRem } from "core/Utils/functions/utils";
import SavedFilterDetails from "./NewCoreComponentScreen/SavedFilterDetails/SavedFilterDetails";
import { getSavedFilterData } from "./NewCoreComponentScreen/filterUtils";
import SavedFilterCard from "./NewCoreComponentScreen/SavedFilterDetails/SavedFilterCard/SavedFilterCard";
import { useTranslation } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  paddingTop5px: {
    paddingTop: pxToRem(5),
    color: colours.lightslategray,
  },
  chipRoot: {
    "& .MuiChip-icon": {
      order: 1, // the label has a default order of 0, so this icon goes after the label
      marginRight: pxToRem(10), // add some space between icon and delete icon
      cursor: "pointer",
    },
    "& .MuiChip-deleteIcon": {
      order: 2, // since this is greater than an order of 1, it goes after the icon
    },
    "& .MuiSvgIcon-root": {
      "&:nth-last-child(2)": {
        marginRight: pxToRem(2),
      },
    },
  },
  addFilterIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: colours.lightslategray,
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: pxToRem(15),
    maxWidth: "100%",
    maxHeight: "9vh",
    overflow: "auto",
    "& .MuiChip-label": {
      marginLeft: pxToRem(9.5),
      marginRight: pxToRem(15),
      padding: pxToRem(0),
    },
  },
  actionIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    cursor: "pointer",
  },
  actionIconColor: {
    color: colours.neutrals,
  },
  filterHeaderStyle: {
    font: `normal normal 500 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
  },
  chipStyles: {
    backgroundColor: colours.alabaster,
    padding: `${pxToRem(5)} ${pxToRem(10)} ${pxToRem(5)} ${pxToRem(5)}`,
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    border: "none",
    "&.default": {
      border: `${pxToRem(1)} solid ${colours.webOrange}`,
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.active": {
      border: `${pxToRem(1)} solid ${colours.slateGray}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.default-active": {
      border: `${pxToRem(1)} solid ${colours.webOrange}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
  },
  savedFilter: {
    border: `1px solid ${colours.separaterColor}`,
    borderRadius: "8px",
    padding: "11px",
    cursor: "pointer",
  },
  savedFilterHeading: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: pxToRem(21),
    color: colours.darkBlack,
    width: "350px",
    textOverflow: "ellipsis",
    overflow: "hidden",
    maxHeight: "21px",
  },
  separater: {
    width: "1px",
    height: "12px",
    background: colours.separaterColor,
    display: "block",
    marginRight: "0.75rem",
  },
  gap12: {
    gap: "12px",
  },
  savedFilterGlobal: {
    color: colours.lightPurple,
  },
  heading: {
    fontSize: "1rem",
    fontWeight: 800,
    color: colours.darkBlack,
    lineHeight: "1.5rem",
    fontFamily: "Manrope",
    marginBottom: ".75rem",
  },
  subHeading: {
    fontSize: "1rem",
    fontWeight: 500,
    color: colours.neutralGrey,
    lineHeight: "1.25rem",
    marginBottom: "1.5rem",
  },
  active: {
    border: `1.5px solid ${colours.green500}`,
    padding: "10.5px",
  },
  horizontalLine: {
    margin: "0",
    border: `0.5px solid ${colours.lightGreyNew}`,
  },
}));

// promptData moved inside component to access t()

const SavedFiltersSection = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  const promptData = {
    delete: {
      title: t("filters.deleteFilter"),
      children: t("filters.deleteFilterConfirm"),
    },
    default: {
      title: t("filters.markAsDefault"),
      children: t("filters.markAsDefaultConfirm"),
    },
  };
  const {
    filterSelected,
    setFilterSelected,
    isEditModalOpen,
    setIsEditModalOpen,
    handleOnClickSave,
    savedFilterRef,
    currentSelectedFilterName,
    setCurrentSelectedFilterName,
    setActiveFilter,
    copySavedFilter,
    setCopySavedFilter,
    copyFilterDetailsRef,
    savedFilterSectionRef,
    saveAs,
    manuallyChangesTabRef,
    filterDashboardData,
    filtersData,
  } = props;

  const [filterDetailsData, setFilterDetailsData] = useState([]);
  const [onConfirmAction, setOnConfirmAction] = useState({
    action: null,
    data: {},
  });
  const [showDialog, setShowDialog] = useState(false);

  const handleDialog = (filterName, isDefault = false) => {
    setShowDialog(true);
    if (isDefault) {
      setOnConfirmAction({
        action: () => makeSavedFilterDefault(filterName),
        data: promptData.default,
      });
    } else {
      setOnConfirmAction({
        action: () => {
          props.onDeleteFilterClick(filterName);
          setCurrentSelectedFilterName("");
        },
        data: promptData.delete,
      });
    }
  };

  const onFilterChipEditClick = (e, filter) => {
    e.stopPropagation();
    setFilterSelected(filter.name);
    setIsEditModalOpen(true);
    manuallyChangesTabRef.current = true;
    setActiveFilter(filtersData[0]?.value || "saved-filters");
  };

  useEffect(() => {
    const values = getDefaultValues();
    setFilterDetailsData(values);
    return () => {
      setCurrentSelectedFilterName("");
      setCopySavedFilter("");
    };
  }, []);

  const EDIT_FILTER = useMemo(() => {
    let fields = [
      {
        label: t("filters.filterName"),
        accessor: "filter_name",
        field_type: "TextField",
        required: true,
        maxLengthLimit: 40,
      },
      {
        label: t("filters.description"),
        accessor: "description",
        field_type: "TextField",
        required: false,
        maxLengthLimit: 100,
      },
    ];

    let applicable_to_fields = [
      {
        label: t("filters.applicableTo"),
        field_type: "radioGroup",
        required: true,
        accessor: "screen_view_type",
        options: [
          {
            value: "this_screen",
            label: t("filters.thisScreen"),
            disabled: false,
          },
          { value: "all_screen", label: t("filters.allScreen"), disabled: false },
        ],
      },
      {
        label: t("filters.viewType"),
        field_type: "radioGroup",
        required: true,
        accessor: "users_view_type",
        options: [
          {
            value: "personal",
            label: t("filters.personal"),
            disabled: saveAs ? false : !isEmpty(filterSelected),
          },
          {
            value: "global",
            label: t("filters.global"),
            disabled: saveAs ? false : !isEmpty(filterSelected),
          },
        ],
      },
    ];
    fields.push({
      label: t("filters.defaultForMe"),
      required: false,
      field_type: "toggle",
      options: [{ label: t("filters.markFieldAsDefault"), value: "is_default" }],
      accessor: "is_default_filter",
    });
    if (props.isFilterSaveGlobal) {
      fields = fields.concat(applicable_to_fields);
    }
    return fields;
  }, [filterSelected, props.isFilterSaveGlobal, saveAs]);

  const handleFilterDetails = (data) => {
    setFilterDetailsData(data);
  };

  const saveFilterValidation = (formData) => {
    if (isEmpty(trim(formData?.filter_name)) || isEmpty(formData)) {
      displaySnackMessages(t("filters.validFilterNameError"), "error");
      return false;
    }

    // String validation for user's input
    if (!isTextInputValid(formData?.filter_name, 4, 15, props.addSnack)) {
      return false;
    }
    return true;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const splitApplicableToDetails = () => {
    return filterSelected !== "" &&
      find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
        3 &&
      !find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "all_screen"
      : find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
          3 &&
        find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "all_screen_all_users"
      : !(
          find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
          3
        ) && find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "this_screen_all_users"
      : "this_screen";
  };
  const getDefaultValues = () => {
    const applicable_to_string = splitApplicableToDetails();
    const users_view_type = applicable_to_string?.includes("all_users")
      ? "global"
      : "personal";
    const screen_view_type = applicable_to_string?.includes("all_screen")
      ? "all_screen"
      : "this_screen";
    return {
      ["filter_name"]: filterSelected,
      ["is_default_filter"]: find(props.savedFilterData, [
        "name",
        filterSelected,
      ])?.is_default,
      ["screen_view_type"]: screen_view_type,
      ["users_view_type"]: users_view_type,
    };
  };

  const seperateGlobalPersonalFilters = (type = "personal") => {
    return props.savedFilterData.filter((eachFilter) => {
      return type === "global"
        ? eachFilter.is_broadcast
        : !eachFilter.is_broadcast;
    });
  };

  const makeSavedFilterDefault = (filter) => {
    const data = {
      filter_name: filter.name,
      is_default_filter: true,
      users_view_type: filter.is_broadcast ? "global" : "personal",
      screen_view_type: filter.screen_code === 3 ? "all_screen" : "this_screen",
    };
    handleOnClickSave(data, false, "", false, true);
  };

  useEffect(() => {
    savedFilterRef.current = (
      isCloned,
      filterData,
      previousFilterName = ""
    ) => {
      handleOnClickSave(
        filterData || filterDetailsData,
        isCloned,
        previousFilterName
      );
    };
    savedFilterSectionRef.current = {
      ...savedFilterSectionRef.current,
      newSavedFilterData: filterDetailsData,
    };
  }, [filterDetailsData, filterSelected]);

  const savedFilterOfCurrentTab =
    props.activeTab === "All"
      ? props.savedFilterData
      : seperateGlobalPersonalFilters(props.activeTab.toLowerCase());

  const selectedSavedFilterForCopy = getSavedFilterData(
    currentSelectedFilterName || copySavedFilter,
    savedFilterOfCurrentTab
  );

  const defaultSelectedFilter = savedFilterOfCurrentTab.find(
    (filter) => filterSelected === filter.name
  );

  return (
    <div>
      {!isEditModalOpen ? (
        currentSelectedFilterName || copySavedFilter ? (
          <SavedFilterDetails
            savedFiltersList={selectedSavedFilterForCopy}
            copySavedFilter={copySavedFilter}
            currentSelectedFilterName={currentSelectedFilterName}
            handleDialog={handleDialog}
            copyFilterDetailsRef={copyFilterDetailsRef}
            onFilterChipEditClick={onFilterChipEditClick}
            savedFilterSectionRef={savedFilterSectionRef}
            setCopySavedFilter={setCopySavedFilter}
            setCurrentSelectedFilterName={setCurrentSelectedFilterName}
            filterDashboardData={filterDashboardData}
          />
        ) : (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap}`}
          >
            {defaultSelectedFilter &&
              defaultSelectedFilter.name &&
              [defaultSelectedFilter].map((filter) => (
                <SavedFilterCard
                  key={filter.name}
                  filterSelected={filterSelected}
                  setFilterSelected={setFilterSelected}
                  filter={filter}
                  classes={classes}
                  setCurrentSelectedFilterName={setCurrentSelectedFilterName}
                  savedFilterSectionRef={savedFilterSectionRef}
                  setCopySavedFilter={setCopySavedFilter}
                  onFilterChipEditClick={onFilterChipEditClick}
                  handleDialog={handleDialog}
                />
              ))}
            <hr className={classes.horizontalLine} />
            {savedFilterOfCurrentTab?.length > 0 &&
              savedFilterOfCurrentTab.map(
                (filter) =>
                  filterSelected !== filter.name && (
                    <SavedFilterCard
                      key={filter.name}
                      filterSelected={filterSelected}
                      setFilterSelected={setFilterSelected}
                      filter={filter}
                      classes={classes}
                      setCurrentSelectedFilterName={
                        setCurrentSelectedFilterName
                      }
                      savedFilterSectionRef={savedFilterSectionRef}
                      setCopySavedFilter={setCopySavedFilter}
                      onFilterChipEditClick={onFilterChipEditClick}
                      handleDialog={handleDialog}
                    />
                  )
              )}
          </div>
        )
      ) : (
        <div>
          <Typography className={classes.heading} gutterBottom>
            {t("filters.savedFilters")}
          </Typography>
          <Typography className={classes.subHeading} gutterBottom>
            {t("filters.saveFilterSubheading")}
          </Typography>

          <div className={classes.contentBody}>
            <Form
              handleChange={handleFilterDetails}
              fields={EDIT_FILTER}
              updateDefaultValue={true}
              defaultValues={getDefaultValues()}
              spacing={2.5}
            ></Form>
          </div>
        </div>
      )}

      <Prompt
        isOpen={showDialog}
        title={onConfirmAction.data?.title || ""}
        children={onConfirmAction.data?.children || ""}
        primaryButtonLabel={t("filters.yes")}
        onPrimaryButtonClick={() => {
          onConfirmAction.action?.();
          setShowDialog(false);
        }}
        secondaryButtonLabel={t("filters.no")}
        onSecondaryButtonClick={() => {
          setShowDialog(false);
          setOnConfirmAction({ action: null, data: {} });
        }}
        variant="error"
      />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    isFilterSaveGlobal:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .isFilterSaveGlobal,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setSavedFiltersList: (data) => dispatch(setSavedFiltersList(data)),
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SavedFiltersSection);
