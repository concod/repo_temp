import globalStyles from "core/Styles/globalStyles";
import { useEffect, useState } from "react";
import { useStyles as sharedStyles } from "core/pages/ticketing-system/styles-ticketing";
import { Checkbox, FormControlLabel } from "@mui/material";
import { cloneDeep } from "lodash";
import { getCheckboxInfo } from "core/actions/ticketActions";
import DetailedViewTable from "../../../detailed-view-table/detailed-view-table";
import { findIndexOfValueFromArrayOfObjects } from "core/pages/ticketing-system/utils";

const IndividualDetailedView = (props) => {
  const {
    noOfTickets,
    tickets,
    isLoading,
    checkboxFilters,
    setCheckboxFilters,
  } = props;
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();

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

  return (
    <>
      <div className={sharedClasses.outerContainerDetailedView}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
        >
          <p
            className={`${sharedClasses.mb5} ${sharedClasses.outerContainerDetailedViewHeader}`}
          >
            Detailed view :{" "}
            <span
              className={sharedClasses.outerContainerDetailedViewHeaderNumber}
            >
              {noOfTickets}
            </span>
            <span
              className={sharedClasses.outerContainerDetailedViewHeaderInfo}
            >
              {" "}
              Total Ticket{noOfTickets > 1 ? "s" : ""}
            </span>
          </p>
          <div>
            {checkboxFilters?.slice(0, 1)?.map((filter) => (
              <FormControlLabel
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
            <div className={sharedClasses.openCheckboxFieldsContainer}>
              {checkboxFilters
                ?.slice(1, checkboxFilters?.length - 1)
                ?.map((filter) => (
                  <FormControlLabel
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

            {checkboxFilters
              ?.slice(checkboxFilters?.length - 1)
              ?.map((filter) => (
                <FormControlLabel
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
        </div>
      </div>
      <DetailedViewTable tickets={tickets} loader={isLoading} />
    </>
  );
};

export default IndividualDetailedView;
