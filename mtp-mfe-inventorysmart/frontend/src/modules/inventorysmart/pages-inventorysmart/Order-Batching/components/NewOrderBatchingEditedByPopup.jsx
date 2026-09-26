import React, { useState, useEffect } from "react";
import { Modal, Accordion } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import WarningIcon from "assets/IS_icons/IS_warning.svg";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import StarIcon from "assets/IS_icons/IS_StarIcon.svg";
import colors from "core/Styles/colours";

const useStyles = makeStyles(() => ({
  notificationContainer: {
    border: "1px solid #FFE770",
    borderRadius: "8px",
    padding: "8px 16px",
    backgroundColor: "#FFF8D5",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "10px",
  },
  notificationText: {
    fontSize: "14px",
    fontWeight: "600",
    color: colors.darkBlack,
  },
  warningText: {
    fontSize: "14px",
    fontWeight: "500",
    color: colors.darkBlack,
  },
  accordionContainer: {
    marginTop: "16px",
  },
  spanVerticalAlign: {
    marginBottom: "10px",
    display: "block",
  },
  starIcon: {
    width: "16px",
    height: "16px",
    marginRight: "8px",
  },
  customAccordionContent: {
    padding: "16px",
  },
  filtersSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: colors.boldHeadingBlue,
    marginRight: "8px",
  },
  filterValue: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    backgroundColor: colors.backgroundChat,
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
    marginRight: "8px",
    color: colors.lightNeutrals,
  },
}));

const NewOrderBatchingEditedByPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [selectedFilters, setSelectedFilters] = useState([]);

  useEffect(() => {
    if (props.selectedFilters.length > 0) {
      const filterDashboardData = props.filterDashboardData || [];
      let filterMappig = props.selectedFilters
        .filter((item) => item.values.length > 0)
        ?.map((item) => {
          const matchedFilter = filterDashboardData.find(
            (filter) => filter?.column_name === item.attribute_name
          );
          return {
            attribute_name: item.attribute_name,
            display_name: matchedFilter?.label || item.attribute_name,
            values: item.values,
          };
        });
      setSelectedFilters(filterMappig);
    }
  }, [props.selectedFilters, props.filterDashboardData]);

  const moveToViewMode = () => {
    props.closeEditedByPopup();
    props.backToViewMode();
  };

  return (
    <Modal
      onClose={props.closeEditedByPopup}
      onPrimaryButtonClick={() => moveToViewMode()}
      onSecondaryButtonClick={() => moveToViewMode()}
      primaryButtonLabel="Back to View Mode"
      secondaryButtonLabel="Deselect Common Hierarchy"
      size="medium"
      title="Conflict in edit mode"
      open={props.showEditedByPopup}
    >
      <div>
        <div className={classes.notificationContainer}>
          <WarningIcon />
          <span className={classes.notificationText}>
            Edit access temporarily unavailable
          </span>
        </div>
        <span className={classes.warningText}>
          Currently other users are editing the same product hierarchy. You'll
          be notified once their changes are saved and you can switch to Edit
          Mode.
        </span>
        <div className={classes.accordionContainer}>
          <span
            className={`${classes.notificationText} ${classes.spanVerticalAlign}`}
          >
            Who is editing?
          </span>
          {/* Custom Accordion */}
          <div>
            <Accordion
              isSingleItem={true}
              singleData={{
                content: (
                  <div className={classes.customAccordionContent}>
                    <div className={classes.filtersSection}>
                      <span
                        className={`${classes.notificationText} ${classes.spanVerticalAlign}`}
                      >
                        Common Filters
                      </span>
                      <div className={classes.filterRow}>
                        {selectedFilters.map((item) => {
                          return (
                            <div className={globalClasses.centerAlign}>
                              <span className={classes.filterLabel}>
                                {item.display_name} :
                              </span>
                              <div>
                                {item.values.map((value) => {
                                  return (
                                    <span className={classes.filterValue}>
                                      {replaceSpecialCharacter(value)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ),
                header: (
                  <div className={globalClasses.centerAlign}>
                    <StarIcon className={classes.starIcon} />
                    <span className={classes.notificationText}>
                      {props.lockAcquiredBy}
                    </span>
                  </div>
                ),
                value: "accordOne",
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default NewOrderBatchingEditedByPopup;
