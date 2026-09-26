import { isEmpty } from "lodash";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import makeStyles from "@mui/styles/makeStyles";
import StarIcon from "@mui/icons-material/Star";
import EmptySavedFilter from "../../../../assets/emptySavedFilter.svg";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { sortSavedFiltersUtility } from "../utils";
import { deleteFilterUserConfiguration } from "core/actions/filterAction";
import SavedFiltersSection from "../SavedFiltersSection";
import { Input, Button, Badge } from "impact-ui-v3";
import { savedFiltersSortOptions } from "../constants";
import { debounce } from "lodash";
import { Typography } from "@mui/material";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PersonalIcon from "coreAssets/filters/user.svg";
import { useTranslation } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  heading: {
    fontSize: "1rem",
    fontWeight: 800,
    color: colours.darkBlack,
    lineHeight: "1.5rem",
  },
  tagHeading: {
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: colours.lightGrey,
    lineHeight: "1.25rem",
    marginLeft: pxToRem(2),
  },
  purpleDot: {
    width: "8px",
    height: "8px",
    display: "block",
    background: colours.lightPurple,
    borderRadius: "50%",
  },
  greenDot: {
    width: "8px",
    height: "8px",
    display: "block",
    background: colours.lightGreen,
    borderRadius: "50%",
  },
  paddingBottom28: {
    paddingBottom: pxToRem(28),
  },
  paddingBottom20: {
    paddingBottom: pxToRem(20),
  },
  separater: {
    width: "1px",
    height: "12px",
    background: colours.separaterColor,
    display: "block",
    marginRight: "0.75rem",
  },
  gap12: {
    gap: "0.75rem",
  },
  actionIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    cursor: "pointer",
  },
  emptyHeading: {
    fontSize: "1.25rem",
    fontWeight: 800,
    lineHeight: pxToRem(30),
    color: colours.lightNeutrals,
    marginBottom: pxToRem(27),
    marginTop: pxToRem(27),
  },
  gap10: {
    gap: pxToRem(10),
  },
}));

const SavedFilters = (props) => {
  const {
    addSnack,
    savedFilterRef,
    isEditModalOpen,
    setIsEditModalOpen,
    originalList,
    setFilterSelectedData,
    filterSelected,
    filterSectionRadio,
    filterConfigType,
    hideSaveFilterSection,
    filterDashboardConfiguration,
    filterReducer,
    savedFilterDashboard,
    setSavedFiltersList,
    setActiveFilter,
    currentSelectedFilterName,
    setCurrentSelectedFilterName,
    handleOnClickSave,
    copySavedFilter,
    setCopySavedFilter,
    copyFilterDetailsRef,
    savedFilterSectionRef,
    saveAs,
    manuallyChangesTabRef,
    filterDashboardData,
    filtersData,
    setOriginalList,
  } = props;

  const globalClasses = globalStyles();
  const classes = useStyles();
  const { t } = useTranslation();

  const tags = [
    { label: t("filters.all"), value: "All" },
    { label: t("filters.personal"), value: "Personal" },
    { label: t("filters.global"), value: "Global" },
  ];

  const [activeTab, setActiveTab] = useState("All");
  const [savedFiltersShowList, setSavedFiltersShowList] = useState(
    originalList
  );

  const [selectedSortByOptions, setSelectedSortByOptions] = useState(
    savedFiltersSortOptions[0]
  );

  const [showFilterLoader, setShowFilterLoader] = useState(
    props.showFilterLoader
  );

  useEffect(() => {
    setShowFilterLoader(props.showFilterLoader);
  }, [props.showFilterLoader]);

  useEffect(() => {
    setSavedFiltersShowList(originalList);
    savedFilterSectionRef.current = {
      ...savedFilterSectionRef.current,
      setShowFilterLoader,
    };
  }, [originalList]);

  const search = useCallback((nameVal) => {
    const matchingResults = originalList?.filter((obj) =>
      obj.name.toLowerCase().includes(nameVal.toLowerCase())
    );
    // Update search results
    setSavedFiltersShowList(
      sortSavedFiltersUtility(matchingResults, selectedSortByOptions.value)
    );
  }, []);

  const searchCallback = useMemo(() => {
    return debounce(search, 300);
  }, [search]);

  const displaySnackMessages = (message, variance) => {
    addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onDeleteFilterClick = async (filterName) => {
    let filterCode;
    setShowFilterLoader(true);
    const updatedList = savedFilterDashboard.filter((item) => {
      if (item.name !== filterName) {
        return true;
      } else {
        filterCode = item.fuc_code;
        return false;
      }
    });

    try {
      await deleteFilterUserConfiguration(filterCode);
      setSavedFiltersList(updatedList);
      setFilterSelectedData(updatedList[0]?.name || "");
      setSavedFiltersShowList(updatedList);
      setShowFilterLoader(false);
      setOriginalList(updatedList)
      displaySnackMessages(t("snackbarMessages.deletedFilterSuccess"), "success");
    } catch (err) {
      setShowFilterLoader(false);
      displaySnackMessages(t("snackbarMessages.somethingWentWrong"), "error");
    }
  };

  return (
    <>
      <LoadingOverlay
        loader={showFilterLoader || isEmpty(props.filterDashboardConfiguration)}
        minHeight={120}
      >
        {filterConfigType === "screen" && !hideSaveFilterSection && (
          <>
            {!isEditModalOpen &&
              !currentSelectedFilterName &&
              !copySavedFilter && (
                <>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.paddingBottom20}`}
                  >
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.gapHalf}`}
                    >
                      <Typography className={classes.heading}>
                        {`${t("filters.savedFilters")} ${
                          savedFiltersShowList.length
                            ? `(${savedFiltersShowList.length})`
                            : ""
                        }`}
                      </Typography>

                      <Button
                        onClick={() => {
                          setFilterSelectedData("");
                          manuallyChangesTabRef.current = true;
                          setActiveFilter(
                            filtersData[0]?.value || "saved-filters"
                          );
                        }}
                        variant="text"
                        iconRight={<AddIcon />}
                      >
                        + {t("filters.newFilter")}
                      </Button>
                    </div>
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.gapHalf}`}
                    >
                      {originalList.length > 1 ? (
                        <Input
                          placeholder={t("filters.searchFilter")}
                          helperText={t("filters.enterValidFilterName")}
                          rightIcon={<SearchIcon />}
                          onChange={(event) =>
                            searchCallback(event.target.value)
                          }
                        />
                      ) : null}
                      <Button
                        onClick={() => {
                          if (selectedSortByOptions.value === "name@asc") {
                            setSelectedSortByOptions(
                              savedFiltersSortOptions[1]
                            );
                          } else {
                            setSelectedSortByOptions(
                              savedFiltersSortOptions[0]
                            );
                          }
                          setSavedFiltersShowList(originalList.reverse());
                        }}
                        icon={<SwapVertIcon />}
                        variant="secondary"
                      />
                    </div>
                  </div>
                  {originalList.length > 0 ? (
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.paddingBottom28}`}
                    >
                      <div
                        className={`${globalClasses.flexRow} ${classes.gap10}`}
                      >
                        <React.Fragment key=".0">
                          {tags.map((item) => (
                            <Badge
                              key={item.label}
                              isIcon={true}
                              icon={
                                item.value === "Personal" ? (
                                  <PersonalIcon
                                    className={`filter-icons
                                      ${activeTab === item.value ? "badge-icon" : ""}
                                    `}
                                  />
                                ) : item.value === "Global" ? (
                                  <LanguageOutlinedIcon
                                    className="filter-icons"
                                  />
                                ) : null
                              }
                              variant={activeTab === item.value ? "filled" : "stroke"}
                              color={activeTab === item.value ? "info" : "default"}
                              label={item.label}
                              size="medium"
                              onClick={() => setActiveTab(item.value)}
                            />
                          ))}
                        </React.Fragment>
                      </div>
                      <div
                        className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.gap12}`}
                      >
                        <div
                          className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
                        >
                          <span className={classes.greenDot} />
                          <Typography className={classes.tagHeading}>
                            {t("filters.active")}
                          </Typography>
                        </div>
                        <div
                          className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
                        >
                          <StarIcon
                            className={classes.actionIcon}
                            sx={{ color: "#E1BC29" }}
                            fontSize="small"
                          />
                          <Typography className={classes.tagHeading}>
                            {t("filters.default")}
                          </Typography>
                        </div>
                        {/* <div
                          className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
                        >
                          <span className={classes.greenDot} />

                          <Typography className={classes.tagHeading}>
                            Global
                          </Typography>
                        </div> */}
                      </div>
                    </div>
                  ) : (
                    <div className="centerAlign">
                      <EmptySavedFilter />
                      <p className={classes.emptyHeading}>{t("filters.youGotThis")}</p>
                      <p className={classes.tagHeading}>
                        {t("filters.clickAddNewFilters")}
                      </p>
                    </div>
                  )}
                </>
              )}

            <SavedFiltersSection
              activeTab={activeTab}
              saveAs={saveAs}
              savedFilterRef={savedFilterRef}
              savedFilterData={savedFiltersShowList}
              setFilterSelected={setFilterSelectedData}
              filterSelected={filterSelected}
              setIsEditModalOpen={setIsEditModalOpen}
              manuallyChangesTabRef={manuallyChangesTabRef}
              setActiveFilter={setActiveFilter}
              isEditModalOpen={isEditModalOpen}
              handleOnClickSave={handleOnClickSave}
              onDeleteFilterClick={onDeleteFilterClick}
              currentSelectedFilterName={currentSelectedFilterName}
              setCurrentSelectedFilterName={setCurrentSelectedFilterName}
              copySavedFilter={copySavedFilter}
              setCopySavedFilter={setCopySavedFilter}
              copyFilterDetailsRef={copyFilterDetailsRef}
              savedFilterSectionRef={savedFilterSectionRef}
              filterDashboardData={filterDashboardData}
              filtersData={filtersData}
            />
          </>
        )}
      </LoadingOverlay>
      <style>
        {`
          .centerAlign {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            height: 75vh;
          }
        `}
      </style>
    </>
  );
};

export default SavedFilters;
