import { isUndefined } from "lodash";

export const applyPreferenceToColumn = (column, columnPreference) => {
  const updatedColumn = columnPreference?.[column.column_name];

  if (updatedColumn) {
    column = {
      ...column,
      ...updatedColumn,
    };

    if (!isUndefined(column?.extra?.width) && !isUndefined(updatedColumn?.width)) {
      column.extra = { ...column.extra, width: updatedColumn.width };
    }
  }

  // Process children recursively
  if (column.children && Array.isArray(column.children)) {
    column.children = column.children.map((child) =>
      applyPreferenceToColumn(child, columnPreference)
    );
  }

  return column;
};

export const applyViewPreferences = ({
  agGrid,
  columnPreference,
  setTableFontSize,
  setContentDensity,
  contentDensityRef,
  applyRowHeightForDensity,
  defaultToolPanelFormat,
}) => {
  // handling the filter model for saved views
  const savedFilterModel = {};

  Object.values(columnPreference || {}).forEach((column) => {
    const filterConfig = column?.extra?.filter_config;

    if (filterConfig?.isSaved) {
      const filter = {
        ...filterConfig,
      };
      delete filter.isSaved;

      savedFilterModel[column.column_name] = filter;
    }
  });

  agGrid?.api?.setFilterModel(savedFilterModel);

  // Handle sort configuration
  let sortConfig = null;
  Object.values(columnPreference || {}).forEach((column) => {
    if (column?.extra?.sort_config) {
      sortConfig = column.extra.sort_config;
    }
  });

  if (sortConfig && sortConfig.isSaved) {
    agGrid?.columnApi?.applyColumnState({
      state: [
        {
          colId: sortConfig.colId,
          sort: sortConfig.sort,
        },
      ],
      defaultState: { sort: null },
    });
  } else {
    agGrid?.columnApi?.applyColumnState({
      state: [],
      defaultState: { sort: null },
    });
  }

  // Restore saved table formatting
  let tableFormatting = null;

  Object.values(columnPreference || {}).some((column) => {
    if (column?.extra?.table_formatting) {
      tableFormatting = column.extra.table_formatting;
      return true;
    }
    return false;
  });

  if (tableFormatting) {
    if (tableFormatting.font_size !== undefined) {
      setTableFontSize(tableFormatting.font_size);
    } else {
      setTableFontSize(defaultToolPanelFormat.DEFAULT_FONT_SIZE);
    }

    if (tableFormatting.content_density !== undefined) {
      setContentDensity(tableFormatting.content_density);
      contentDensityRef.current = tableFormatting.content_density;
      applyRowHeightForDensity(tableFormatting.content_density);
    }
  } else {
    setTableFontSize(defaultToolPanelFormat.DEFAULT_FONT_SIZE);
  }
};

export const applyNumberFormatToColumns = (columns, numericFormat, nonFormattingCoulumnHeaders, numberFormattingDataTypes, formatNumber) => {
  const  applyRecursively = (cols) => {
    return cols?.map((column) => {
      if (column?.children && Array.isArray(column.children)) {
        column.children = applyRecursively(column.children);
      } else {
        if (
          numericFormat &&
          column?.field !== "Selection" &&
          !nonFormattingCoulumnHeaders.includes(column.column_name) &&
          numberFormattingDataTypes.includes(column.type) &&
          column.cellRenderer !== "agGroupCellRenderer" &&
          !column.is_editable
        ) {
          column.cellRenderer = (params, props) =>
            formatNumber(
              params.data?.[column?.column_name] || "0",
              numericFormat,
              params,
              column
            );
        }
      }
      return column;
    });
  };
  return applyRecursively(columns);
};
