import React, { useState } from "react";
import { Button, Grid } from "@mui/material";
import colours from "core/Styles/colours";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { handleExclusion } from "./helper";

const Exclusion = ({
  exclusions,
  addNewRow,
  selectedData = [],
  staticExclusion = [],
  level,
}) => {
  const [selectedExclusions, setSelectedExclusions] = useState(selectedData);

  const [currLevel, setCurrLevel] = useState(level?.[0]);

  const renderSelectComponent = (exclusionType) => {
    return exclusionType?.map(({ component: Component, ...exclusionRow }) => {
      if (currLevel === exclusionRow?.levelLabel || !exclusionRow?.levelLabel) {
        return (
          <Grid key={exclusionRow.label} xs={2.5} item>
            <Component
              {...exclusionRow}
              type="exclusion"
              updateDependency={(key, val) =>
                handleExclusion(key, val, setSelectedExclusions)
              }
              selectedOptions={
                selectedExclusions.find(
                  (el) => el.key === exclusionRow.filter_keyword
                )?.value
              }
            />
          </Grid>
        );
      } else {
        return null;
      }
    });
  };

  return (
    <CustomAccordion
      label="Add Exclusions"
      defaultExpanded={selectedData?.length}
    >
      {level?.map((levelName) => (
        <Button
          key={levelName}
          sx={{
            backgroundColor:
              currLevel === levelName
                ? colours.lightGray
                : colours.aircraftWhite,
          }}
          onClick={() => setCurrLevel(levelName)}
        >
          {levelName}
        </Button>
      ))}
      <Grid container>
        {renderSelectComponent(exclusions)}
        {renderSelectComponent(staticExclusion)}
      </Grid>

      <Button
        disabled={!selectedExclusions?.length}
        onClick={() => addNewRow(selectedExclusions)}
      >
        {selectedData?.length ? "Edit Exclusion" : "Add New Exclusion"}
      </Button>
    </CustomAccordion>
  );
};

export default Exclusion;
