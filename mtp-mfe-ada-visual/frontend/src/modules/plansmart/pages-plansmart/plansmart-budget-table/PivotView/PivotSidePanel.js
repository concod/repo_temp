import React from "react";
import {
  Checkbox,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";

const useStyles = makeStyles(() => ({
  container: {
    padding: "0px",
    maxHeight: "70vh",
    overflowY: "auto",
  },
  groupList: {
    paddingLeft: "20px",
  },
  divider: {
    borderColor: colours.gullGray,
  },
}));

const CreateGroup = ({
  groupData,
  handleChecked,
  handleGroupChecked,
  handleGroupCheckbox,
}) => {
  const [groupOpen, setGroupOpen] = useState(true);
  const classes = useStyles();
  const isChecked = handleGroupChecked(
    groupData.options,
    groupData.selectedOptions
  );
  return (
    <>
      <ListItem
        secondaryAction={
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={() => setGroupOpen(!groupOpen)}
          >
            {groupOpen ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
      >
        <ListItemIcon>
          <Checkbox
            disableRipple
            edge="start"
            checked={isChecked}
            onChange={() =>
              handleGroupCheckbox(
                isChecked,
                false,
                {},
                groupData.options,
                groupData.selectedOptions
              )
            }
          />
        </ListItemIcon>
        <ListItemText primary={groupData.label} />
      </ListItem>
      <Collapse in={groupOpen}>
        <RenderCheckboxWithLabel
          options={groupData.options}
          handleChecked={(option) =>
            handleChecked(option, groupData.selectedOptions)
          }
          className={classes.groupList}
          handleCheckbox={(checked, selectionOption) =>
            handleGroupCheckbox(
              checked,
              true,
              selectionOption,
              groupData.options,
              groupData.selectedOptions
            )
          }
        />
      </Collapse>
    </>
  );
};

const GroupedCheckboxWithLabel = ({
  groupObj,
  handleChecked,
  handleGroupChecked,
  handleGroupCheckbox,
}) => {
  return (
    <List disablePadding>
      {Object.keys(groupObj).map((groupKey) => {
        const groupData = groupObj[groupKey];
        return (
          <CreateGroup
            groupData={groupData}
            handleChecked={handleChecked}
            handleGroupChecked={handleGroupChecked}
            handleGroupCheckbox={(
              isChecked,
              isChild,
              changedOption,
              options,
              selectionOption
            ) =>
              handleGroupCheckbox(
                groupKey,
                isChecked,
                isChild,
                changedOption,
                options,
                selectionOption
              )
            }
          />
        );
      })}
    </List>
  );
};

const RenderCheckboxWithLabel = ({
  options,
  handleChecked,
  handleCheckbox,
  className = "",
}) => (
  <List disablePadding className={className}>
    {options.map((option, inx) => {
      const isChecked = handleChecked(option.value);
      return (
        <ListItem dense key={`${inx}-${option.label}`}>
          <ListItemIcon>
            <Checkbox
              disableRipple
              edge="start"
              checked={isChecked}
              onChange={() => handleCheckbox(isChecked, option)}
            />
          </ListItemIcon>
          <ListItemText primary={option.label} />
        </ListItem>
      );
    })}
  </List>
);

function PivotSidePanel(props) {
  const { updateFilters } = props;
  const [filters, setFilters] = useState(props.filters);
  const classes = useStyles();

  const handleChecked = (value, selectedOptions = []) => {
    return selectedOptions.some((option) => option.value === value);
  };

  const handleGroupChecked = (options = [], selectedOptions = []) => {
    return options.length === selectedOptions.length;
  };

  const handleCheckbox = (
    filterKey,
    isChecked,
    changedOption,
    options,
    selectedOptions
  ) => {
    if (isChecked) {
      const updatedSelectedOptions = selectedOptions.filter(
        (option) => option.value !== changedOption.value
      );
      const updatedFilter = updateFilters(filterKey, updatedSelectedOptions);
      setFilters(updatedFilter);
    } else {
      const updatedSelectedOptions = [...selectedOptions, changedOption];
      const updatedFilter = updateFilters(filterKey, updatedSelectedOptions);
      setFilters(updatedFilter);
    }
  };

  const handleGroupCheckbox = (
    groupKey,
    filterKey,
    isChecked,
    isChildLevel,
    changedOption,
    options,
    selectedOptions = []
  ) => {
    if (isChildLevel) {
      if (isChecked) {
        const updatedSelectedOptions = selectedOptions.filter(
          (option) => option.value !== changedOption.value
        );
        const updatedFilter = updateFilters(
          filterKey,
          updatedSelectedOptions,
          true,
          groupKey
        );
        setFilters(updatedFilter);
      } else {
        selectedOptions.push(changedOption);
        const updatedFilter = updateFilters(
          filterKey,
          selectedOptions,
          true,
          groupKey
        );
        setFilters(updatedFilter);
      }
    } else {
      const updatedSelectedOptions = isChecked ? [] : options;
      const updatedFilter = updateFilters(
        filterKey,
        updatedSelectedOptions,
        true,
        groupKey
      );
      setFilters(updatedFilter);
    }
  };

  return (
    <div className={classes.container}>
      {Object.keys(filters).map((filterKey, filterInx) => {
        if (filters[filterKey].groupedFilter) {
          return (
            <>
              {filterInx > 0 && <Divider classes={{ root: classes.divider }} />}
              <GroupedCheckboxWithLabel
                groupObj={filters[filterKey].filterDetails}
                filterKey={filterKey}
                handleChecked={handleChecked}
                handleGroupChecked={handleGroupChecked}
                handleGroupCheckbox={(
                  groupKey,
                  isChecked,
                  isChild,
                  changedOption,
                  options,
                  selectedOptions
                ) =>
                  handleGroupCheckbox(
                    filterKey,
                    groupKey,
                    isChecked,
                    isChild,
                    changedOption,
                    options,
                    selectedOptions
                  )
                }
              />
            </>
          );
        } else {
          const options = filters[filterKey].options;
          const selectedOptions = filters[filterKey].selectedOptions;
          return (
            <>
              {filterInx > 0 && <Divider classes={{ root: classes.divider }} />}
              <RenderCheckboxWithLabel
                options={options}
                handleChecked={(value) => handleChecked(value, selectedOptions)}
                handleCheckbox={(isChecked, option) =>
                  handleCheckbox(
                    filterKey,
                    isChecked,
                    option,
                    options,
                    selectedOptions
                  )
                }
              />
            </>
          );
        }
      })}
    </div>
  );
}

export default PivotSidePanel;
