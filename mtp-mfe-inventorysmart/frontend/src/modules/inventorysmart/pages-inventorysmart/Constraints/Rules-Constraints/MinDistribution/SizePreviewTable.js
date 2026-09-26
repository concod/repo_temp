import { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { Select } from "impact-ui-v3";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import { DISTRIBUTION_STRATEGY_TABLE_CONFIG } from "../../../../constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

/** Preview tables need a min height while loading or rows are empty, or the overlay collapses. */
const PREVIEW_LOADER_MIN_HEIGHT = "280px";

const SHARED_SELECT_PROPS = {
  isWithSearch: false,
  labelOrientation: "left",
  isClearable: false,
  isMulti: false,
  placeholder: "Select",
  setCurrentOptions: () => {},
  setSelectedOptions: () => {},
};

const buildSizePreviewColumns = (sizes) =>
  agGridColumnFormatter(
    [
      {
        ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
        column_name: "store_number",
        label: "Store",
        is_frozen: true,
        order_of_display: 0,
        tc_mapping_code: 5054001,
        is_searchable: true,
        extra: { sortLabelType: "str", ignoreSuppressSizeToFit: true, rightAlign: true },
      },
      ...(sizes || []).map((size, index) => ({
        ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
        column_name: size,
        label: size,
        order_of_display: index + 1,
        tc_mapping_code: 5054002 + index,
        extra: { sortLabelType: "int", ignoreSuppressSizeToFit: true },
        type: "int"
      })),
    ],
    {},
    {},
    false,
    null,
    false,
    false
  );

const toSelectOption = (item, labelKey) => ({
  label: item[labelKey] || item.article,
  value: item.article,
  id: item.article,
});

const SizePreviewTable = ({
  articles = [],
  selectedArticle,
  onArticleChange,
  rows = [],
  sizes = [],
  loader,
  tableKey,
}) => {
  const exceptionClasses = useExceptionStyles();
  const [idSelectOpen, setIdSelectOpen] = useState(false);
  const [descriptionSelectOpen, setDescriptionSelectOpen] = useState(false);
  const [articleCurrentOptions, setArticleCurrentOptions] = useState([]);
  const [articleSelected, setArticleSelected] = useState(null);
  const columns = useMemo(() => buildSizePreviewColumns(sizes), [sizes]);
  const ignoreSelectSyncRef = useRef(true);
  const gridKey = `${tableKey || "size-preview"}-${(rows || [])
    .map((row) => row.key)
    .join("|")}`;

  useLayoutEffect(() => {
    setIdSelectOpen(false);
    setDescriptionSelectOpen(false);
    ignoreSelectSyncRef.current = true;
    const timeoutId = window.setTimeout(() => {
      ignoreSelectSyncRef.current = false;
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [tableKey, selectedArticle]);

  const { articleOptions, selectedId } = useMemo(() => {
      const selected =
        articles.find(
          (item) => String(item.article) === String(selectedArticle)
        ) || (selectedArticle ? { article: selectedArticle } : articles[0]);
      const value = selected?.article;
      const articleOptions = articles.map((item) =>
        toSelectOption(item, "article")
      );
      return {
        articleOptions,
        selectedId:
          articleOptions.find((item) => item.value === value) ||
          (value ? toSelectOption({ article: value }, "article") : null),
      };
    }, [articles, selectedArticle]);

  useEffect(() => {
    setArticleCurrentOptions(articleOptions);
  }, [articleOptions]);

  useEffect(() => {
    setArticleSelected(selectedId);
  }, [selectedArticle]);

  const selectedValue = Array.isArray(articleSelected)
    ? null
    : articleSelected?.value ?? articleSelected?.id;
  const descriptionOptions = selectedValue
    ? articles
        .filter((item) => String(item.article) === String(selectedValue))
        .map((item) => toSelectOption(item, "description"))
    : [];

  const handleArticleSelect = (option) => {
    const value = option?.value ?? option?.id;
    if (value == null || value === "") return;
    if (String(value) === String(selectedArticle)) return;
    if (ignoreSelectSyncRef.current) return;
    onArticleChange?.(String(value));
  };

  const handleArticleClear = () => {
    setArticleSelected(null);
    setArticleCurrentOptions(articleOptions);
  };

  const hasGridData = rows.length > 0 && columns.length > 0;
  const loaderMinHeight =
    loader || !hasGridData ? PREVIEW_LOADER_MIN_HEIGHT : "unset";

  return (
    <Loader loader={loader} minHeight={loaderMinHeight}>
      {hasGridData ? (
      <div className={exceptionClasses.stylePreviewTable}>
        <AgGridComponent
          key={gridKey}
          rowdata={rows}
          columns={columns}
          selectAllHeaderComponent={false}
          sizeColumnsToFitFlag={true}
          uniqueRowId="key"
          tableHeader="Preview"
          topRightOptions={[
            <Select
              key="size-preview-style-color-id"
              {...SHARED_SELECT_PROPS}
              isWithSearch={true}
              isClearable={true}
              searchPlaceholder="Search Here..."
              isOpen={idSelectOpen}
              setIsOpen={setIdSelectOpen}
              label="Style Color ID"
              currentOptions={articleCurrentOptions}
              setCurrentOptions={setArticleCurrentOptions}
              initialOptions={articleOptions}
              selectedOptions={articleSelected}
              setSelectedOptions={setArticleSelected}
              handleChange={handleArticleSelect}
              onClearAll={handleArticleClear}
              width="180px"
              minWidth="180px"
            />,
            <Select
              key="size-preview-description"
              {...SHARED_SELECT_PROPS}
              isOpen={descriptionSelectOpen}
              setIsOpen={setDescriptionSelectOpen}
              label="Description"
              currentOptions={descriptionOptions}
              initialOptions={descriptionOptions}
              selectedOptions={descriptionOptions[0] || null}
              width="170px"
              minWidth="170px"
            />,
          ]}
          tableId={`min-size-distribution-preview-${tableKey || "default"}`}
          pagination={false}
          cardContainer={false}
        />
      </div>
      ) : null}
    </Loader>
  );
};

export default SizePreviewTable;
