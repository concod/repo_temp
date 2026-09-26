import globalStyles from "core/Styles/globalStyles";
import { useEffect, useState } from "react";
import { useStyles as sharedStyles } from "modules/ticketing-system/styles-ticketing";
import { FormControlLabel, Typography } from "@mui/material";
import { cloneDeep } from "lodash";
import { getCheckboxInfo } from "modules/ticketing-system/services/ticketActions";
import DetailedViewTable from "../../../detailed-view-table/detailed-view-table";
import { findIndexOfValueFromArrayOfObjects } from "modules/ticketing-system/utils";
import { Checkbox, Badge, Button, useTranslation } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";

const IndividualDetailedView = (props) => {
  const {
    noOfTickets,
    tickets,
    isLoading,
    checkboxFilters,
    setCheckboxFilters,
  } = props;
  const { t } = useTranslation();
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  /**
   * getCheckboxDetails function will get the default
   * checkbox key and value which will be used to
   * display the checkboxes above the table
   */
  const getCheckboxDetails = async () => {
    try {
      const response = await getCheckboxInfo()();
      const data = response?.data?.data[0]?.attribute_value?.values;
      data.forEach((checkboxData, index) => {
        if (
          checkboxData.name === "All Tickets" ||
          checkboxData.name === "Open" ||
          checkboxData.name === "Closed"
        ) {
          checkboxData.disabled = false;
        } else {
          checkboxData.disabled = true;
        }
        checkboxData.index = index;
      });
      let allIndex = findIndexOfValueFromArrayOfObjects(
        data,
        "name",
        "All Tickets"
      );
      data[allIndex].value = true;
      setCheckboxFilters(data);
    } catch (error) {
      console.error("getCheckboxDetails error", error);
    }
  };

  /**
   * handleCheckBoxChange is a function
   * used to handle change in checkboxes
   * and call the getReport function to
   * update the data
   * @param {object} e
   * @param {number} index
   */
  const handleCheckBoxChange = (e, index) => {
    try {
      let checkboxValues = cloneDeep(checkboxFilters);
      let openIndex = findIndexOfValueFromArrayOfObjects(
        checkboxValues,
        "name",
        "Open"
      );
      checkboxValues[index].value = e.target.checked;
      if (checkboxValues[openIndex].value) {
        checkboxValues.forEach((checkBoxData) => {
          if (
            checkBoxData.name === "In Progress" ||
            checkBoxData.name === "Information Requested" ||
            checkBoxData.name === "Solved"
          ) {
            checkBoxData.disabled = false;
          }
        });
      } else {
        checkboxValues.forEach((checkBoxData) => {
          if (
            checkBoxData.name === "In Progress" ||
            checkBoxData.name === "Information Requested" ||
            checkBoxData.name === "Solved"
          ) {
            checkBoxData.disabled = true;
            checkBoxData.value = false;
          }
        });
      }
      setCheckboxFilters(checkboxValues);
    } catch (error) {
      console.error("handleCheckBoxChange error:", error);
    }
  };

  /**
   * used to call getCheckboxDetails initially
   * to set up the checkbox details
   */
  useEffect(() => {
    getCheckboxDetails();
  }, []);

  const navigateToSummaryView = () => {
    navigate(`/ticketing-system`, {
      state: {
        prevScr: location.pathname,
      },
    });
  };  

  return (
    <div
      className={`${globalClasses.cardBg} ${sharedClasses.detailViewContainer}`}
    >
      <div
        className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.fullWidth} ${sharedClasses.detailViewHeader}`}
      >
        <Typography
          variant="text"
          className={`${globalClasses.gap} ${globalClasses.flexRow} ${sharedClasses.detailedViewTitle}`}
        >
          {t("ticketing.detailedViewLabel")}
          <Badge
            label={`${t("ticketing.totalTickets")}${noOfTickets > 1 ? "s" : ""} - ${noOfTickets}`}
            variant="subtle"
            color="info"
          />
        </Typography>
        <div className={`${globalClasses.centerAlign} ${globalClasses.gap}`}>
          {props?.extra}
          <div className={sharedClasses.separator}></div>
          <Button variant="secondary" onClick={navigateToSummaryView}>
            {t("ticketing.summaryView")}
          </Button>
        </div>
      </div>
      <div className={sharedClasses.individualViewFormWrapper}>
        {checkboxFilters?.map((filter) => (
          <FormControlLabel
            className={`${sharedClasses.formWrapper} ${
              filter?.value && sharedClasses.blueBorder
            }`}
            control={
              <Checkbox
                defaultChecked
                checked={filter?.value}
                onChange={(e) => handleCheckBoxChange(e, filter.index)}
                disabled={filter?.disabled}
              />
            }
            label={filter?.name}
          />
        ))}
      </div>
      <DetailedViewTable tickets={tickets} loader={isLoading} />
    </div>
  );
};

export default IndividualDetailedView;
