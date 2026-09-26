const compareEmptyKeys = (colorObject) => {
  for (let key in colorObject) {
    if (colorObject[key] != 0) {
      return false;
    }
  }
  return true;
};
const metricComparisionFunc = (unique, o) => {
  if (!unique.some((obj) => obj.size === o.size && obj.color === o.color)) {
    unique.push(o);
  }
  return unique;
};
const getMetricsLength = (cellProps, currentCol, type) => {
  if (type === "color") {
    const currentColorMetrics = cellProps.data.metrics.filter((metric) => {
      return metric.color === currentCol;
    });
    return currentColorMetrics.reduce(metricComparisionFunc, []);
  } else {
    const currentSizeMetrics = cellProps.data.metrics.filter((metric) => {
      return metric.size === cellProps.data.size;
    });
    return currentSizeMetrics.reduce(metricComparisionFunc, []);
  }
};
const getEmptyCellProps = () => {
  return { placeholder: "", isDisabled: true };
};
export const getSingleSizeAllColorsStatus = (
  columnType,
  updatedcellProps,
  rowData
) => {
  if (columnType === "color") {
    //For a color name column, if the attribute type is single size - all colors
    //disable cells under color - size combination
    //because for single size all colors
    //only per combination/total is only editable
    return getEmptyCellProps();
  }
  //User can be able to enter only for one size and the value
  //would be distributed to all the color metrics under the style
  //For a style a value is entered, then for other cells it would be
  //disabled or user shouldn't be able enter in other cells
  const uniqueMetrics = getMetricsLength(updatedcellProps, null, "size");
  const colorValues = rowData.filter((element, idx) => {
    return element.size !== "Total" && idx != updatedcellProps.rowIndex;
  });
  if (updatedcellProps.data.size === "Total") {
    return getEmptyCellProps();
  } else if (
    updatedcellProps.data.size !== "Total" &&
    updatedcellProps.value === 0 &&
    colorValues.every((element, idx) => {
      return element.total === 0 || element.total === "";
    }) &&
    uniqueMetrics.length === 0
  ) {
    return getEmptyCellProps();
  } else if (
    updatedcellProps.data.size !== "Total" &&
    updatedcellProps.value === 0 &&
    colorValues.every((element, idx) => {
      return element.total === 0 || element.total === "";
    }) &&
    uniqueMetrics.length !== 0
  ) {
    return { placeholder: `x ${uniqueMetrics.length}`, isDisabled: false };
  } else if (
    updatedcellProps.data.size !== "Total" &&
    updatedcellProps.value === 0 &&
    !colorValues.every((element, idx) => {
      return element.total === 0 || element.total === "";
    })
  ) {
    return getEmptyCellProps();
  } else if (
    updatedcellProps.data.size !== "Total" &&
    updatedcellProps.value !== 0 &&
    colorValues.every((element, idx) => {
      return element.total === 0 || element.total === "";
    })
  ) {
    return { placeholder: `x ${uniqueMetrics.length}`, isDisabled: false };
  } else {
    return { placeholder: `x ${uniqueMetrics.length}`, isDisabled: true };
  }
};
export const getAllSizeSingleColorStatus = (
  columnType,
  updatedcellProps,
  columns,
  currentCol
) => {
  if (columnType === "color") {
    //For a color name coloumn, if attribute type is all size single color
    //we enable total row under the bottom
    const currentColor = currentCol.field;
    const uniqueMetrics = getMetricsLength(
      updatedcellProps,
      currentColor,
      "color"
    );
    const otherColors = {};

    for (let key in updatedcellProps.data) {
      if (
        columns.findIndex((col) => col.colId === key) !== -1 &&
        key !== currentColor &&
        key != "total" &&
        key != "size"
      ) {
        otherColors[key] = updatedcellProps.data[key];
      }
    }
    if (
      updatedcellProps.data.size === "Total" &&
      updatedcellProps.value === 0 &&
      compareEmptyKeys(otherColors)
    ) {
      //If the current row is a total row and all the total cells of colors
      //are zero, then we enable all the total cells for all colors
      return { placeholder: `x ${uniqueMetrics.length}`, isDisabled: false };
    } else if (
      updatedcellProps.data.size === "Total" &&
      updatedcellProps.value === 0 &&
      !compareEmptyKeys(otherColors)
    ) {
      //If the cell value is 0 and other total cell value is greater than 0
      //make the cells disabled, because only one color can be added into the
      //unit if all colors is selected
      //we would be distributing that total value across all the sizes present
      //in the metrics
      return getEmptyCellProps();
    } else if (
      updatedcellProps.data.size === "Total" &&
      updatedcellProps.value !== 0 &&
      compareEmptyKeys(otherColors)
    ) {
      //If the value is greater than 0, have a * metrics length
      //beside the cell
      return { placeholder: `x ${uniqueMetrics.length}`, isDisabled: false };
    } else {
      return getEmptyCellProps();
    }
  }
  return getEmptyCellProps();
};

export const getDifferentColorDifferentStyleStatus = (
  columnType,
  updatedcellProps,
  rowData,
  currentCol
) => {
  if (columnType === "color") {
    //If the attribute type is of different type different color
    //and if the unit type is eaches,
    //then user can only be able to enter into one of the metrics
    //present under the style and the value entered can't be
    //more than 1
    //If the unit type is other than eaches, user can enter any quantity
    //under the metrics and respective values would be summed up to get
    //the pack quantity
    const otherMetricValues = [];
    const otherMetrics = updatedcellProps.data.metrics.filter((metric) => {
      return !(
        metric["color"] === currentCol.field &&
        metric["size"] === updatedcellProps.data.size
      );
    });
    otherMetrics.forEach((metric) => {
      const sizeVals = rowData.filter((sizeData) => {
        return sizeData.size === metric.size;
      })[0];
      otherMetricValues.push(sizeVals[metric.color]);
    });
    let cellProperties = getEmptyCellProps();
    if (updatedcellProps.data.size === "Total") {
      return cellProperties;
    } else if (
      updatedcellProps.data.unit_type === "eaches" &&
      updatedcellProps.data.metrics.filter(
        (metric) =>
          metric["color"] === currentCol.field &&
          metric["size"] === updatedcellProps.data.size
      ).length > 0 &&
      updatedcellProps.value === 0 &&
      otherMetricValues.every((val) => {
        return val === 0;
      })
    ) {
      return {
        ...cellProperties,
        isDisabled: false,
      };
    } else if (
      updatedcellProps.data.unit_type === "eaches" &&
      updatedcellProps.data.metrics.filter(
        (metric) =>
          metric["color"] === currentCol.field &&
          metric["size"] === updatedcellProps.data.size
      ).length > 0 &&
      updatedcellProps.value === 0 &&
      !otherMetricValues.every((val) => {
        return val === 0;
      })
    ) {
      return {
        ...cellProperties,
        isDisabled: true,
      };
    } else if (
      updatedcellProps.data.unit_type === "eaches" &&
      updatedcellProps.data.metrics.filter(
        (metric) =>
          metric["color"] === currentCol.field &&
          metric["size"] === updatedcellProps.data.size
      ).length > 0 &&
      updatedcellProps.value !== 0 &&
      otherMetricValues.every((val) => {
        return val === 0;
      })
    ) {
      return {
        ...cellProperties,
        isDisabled: false,
      };
    } else if (
      updatedcellProps.data.metrics.filter(
        (metric) =>
          metric["color"] === currentCol.field &&
          metric["size"] === updatedcellProps.data.size
      ).length > 0
    ) {
      return {
        ...cellProperties,
        isDisabled: false,
      };
    }
  }
  return getEmptyCellProps();
};
export const getAttributeCellDisabled = (
  updatedcellProps,
  columnType,
  rowData,
  allColumns,
  currentCol
) => {
  //Enters into this block if the coloumn is of color type
  switch (updatedcellProps.data.attributeType) {
    case "single size - all colors":
      return getSingleSizeAllColorsStatus(
        columnType,
        updatedcellProps,
        rowData
      );
    case "all size - single color":
      return getAllSizeSingleColorStatus(
        columnType,
        updatedcellProps,
        allColumns,
        currentCol
      );
    case "different size - different color":
      return getDifferentColorDifferentStyleStatus(
        columnType,
        updatedcellProps,
        rowData,
        currentCol
      );
    default:
      return { placeholder: "", isDisabled: true };
  }
};
