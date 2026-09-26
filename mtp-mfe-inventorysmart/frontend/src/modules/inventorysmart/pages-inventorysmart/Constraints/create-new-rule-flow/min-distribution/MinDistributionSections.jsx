import { Input, useTranslation } from "impact-ui-v3";
import ErrorIcon16 from "assets/errorIcon16.svg";
import StylePreviewTable from "../../Rules-Constraints/MinDistribution/StylePreviewTable";
import SizePreviewTable from "../../Rules-Constraints/MinDistribution/SizePreviewTable";
import {
  STYLE_OPTIONS,
  SIZE_OPTIONS,
  STYLE_HELP_TEXT,
  SIZE_HELP_TEXT,
} from "./constants";
import { DistributionChipGroup } from "./DistributionChipGroup";
import { DistributionHelpRow } from "./DistributionHelpRow";
import { StyleUnitsBox } from "./StyleUnitsBox";
import { SizeUnitsBox } from "./SizeUnitsBox";

export const MinValueRow = ({
  classes,
  minValue,
  isMinInvalid,
  onChange,
}) => {
  const { t } = useTranslation();
  const showMinError =
    isMinInvalid && minValue !== "" && minValue != null;
  return (
    <div className={classes.minRow}>
      <p className={classes.minLabel}>
        {t("inventorysmart.rclMinLabel")}
        <span className={classes.required}>*</span>:
      </p>
      <div className={classes.minInput}>
        <Input
          type="number"
          value={minValue}
          onChange={onChange}
          isError={showMinError}
          helperText={
            showMinError ? t("inventorysmart.rclEnterValidMinValue") : ""
          }
          isHelperText={showMinError}
          rightIcon={showMinError ? <ErrorIcon16 /> : undefined}
          inputProps={{
            min: 1,
          }}
        />
      </div>
    </div>
  );
};

export const StyleDistributionSection = ({
  classes,
  selectedStyleType,
  onTypeChange,
  showPreview,
  onPreviewClick,
  previewLoader,
  previewDisabled,
  styleUnitsPerArticle,
  onUnitsChange,
  onUnitsBlur,
  styleUnitsError,
  styleUnitsHelperText,
  maxUnits,
  previewRows,
}) => (
  <div className={classes.section}>
    <p className={classes.sectionTitle}>
      Distribute Minimum by Style-Color ID
    </p>
    <div className={classes.optionsBlock}>
      <DistributionChipGroup
        name="style-distribution"
        options={STYLE_OPTIONS}
        selectedValue={selectedStyleType}
        onChange={onTypeChange}
        classes={classes}
      />
      <DistributionHelpRow
        helpText={STYLE_HELP_TEXT[selectedStyleType]}
        classes={classes}
        previewLabel={showPreview ? "Hide Preview" : "Show Preview"}
        onPreviewClick={onPreviewClick}
        previewDisabled={typeof previewDisabled !== "undefined" ? previewDisabled : previewLoader}
      />
    </div>
    {selectedStyleType === "x_units_per_article" ? (
      <StyleUnitsBox
        units={styleUnitsPerArticle}
        onChange={onUnitsChange}
        onBlur={onUnitsBlur}
        unitsError={styleUnitsError}
        unitsHelperText={styleUnitsHelperText}
        maxUnits={maxUnits}
        classes={classes}
      />
    ) : null}
    {showPreview ? (
      <StylePreviewTable
        tableKey={`${selectedStyleType}-${previewRows
          .map((row) => `${row.article}:${row.min}`)
          .join("|")}`}
        rows={previewRows}
        loader={previewLoader}
      />
    ) : null}
  </div>
);

export const SizeDistributionSection = ({
  classes,
  selectedSizeType,
  onTypeChange,
  showPreview,
  onPreviewClick,
  previewLoader,
  previewDisabled,
  sizeUnitsPerSize,
  onUnitsChange,
  onUnitsBlur,
  maxUnits,
  sizeFieldsTouched,
  isSizeUnitsInvalid,
  sizeSelectOptions,
  selectedSizeValues,
  selectedSizeOptions,
  setSelectedSizeOptions,
  onSizesChange,
  onSizesMenuClose,
  sizeSelectOpen,
  setSizeSelectOpen,
  sizeSelectAll,
  setSizeSelectAll,
  styleArticleOptions,
  selectedSizeArticle,
  onArticleChange,
  previewRows,
  previewSizes,
  unitsError,
  unitsHelperText,
}) => {
  const { t } = useTranslation();
  return (
    <div className={classes.section}>
      <p className={classes.sectionTitle}>Distribute Minimum by Size</p>
      <div className={classes.optionsBlock}>
        <DistributionChipGroup
          name="size-distribution"
          options={SIZE_OPTIONS}
          selectedValue={selectedSizeType}
          onChange={onTypeChange}
          classes={classes}
        />
        <DistributionHelpRow
          helpText={SIZE_HELP_TEXT[selectedSizeType]}
          classes={classes}
          previewLabel={showPreview ? "Hide Preview" : "Show Preview"}
          onPreviewClick={onPreviewClick}
          previewDisabled={typeof previewDisabled !== "undefined" ? previewDisabled : previewLoader}
        />
      </div>
      {selectedSizeType === "x_units_per_size" ? (
        <SizeUnitsBox
          units={sizeUnitsPerSize}
          onUnitsChange={onUnitsChange}
          onUnitsBlur={onUnitsBlur}
          maxUnits={maxUnits}
          unitsError={
            typeof unitsError !== "undefined"
              ? unitsError
              : isSizeUnitsInvalid
          }
          unitsHelperText={
            typeof unitsHelperText !== "undefined"
              ? unitsHelperText
              : isSizeUnitsInvalid
              ? t("inventorysmart.rclEnterUnitsPerSize")
              : ""
          }
          sizeOptions={sizeSelectOptions}
          selectedSizes={selectedSizeOptions}
          setSelectedSizes={setSelectedSizeOptions}
          onSizesChange={onSizesChange}
          onSizesMenuClose={onSizesMenuClose}
          sizeSelectOpen={sizeSelectOpen}
          setSizeSelectOpen={setSizeSelectOpen}
          isSelectAll={sizeSelectAll}
          setIsSelectAll={setSizeSelectAll}
          sizesError={sizeFieldsTouched && selectedSizeValues.length === 0}
          classes={classes}
        />
      ) : null}
      {showPreview ? (
        <SizePreviewTable
          tableKey={`${selectedSizeType}-${selectedSizeArticle}`}
          articles={styleArticleOptions}
          selectedArticle={selectedSizeArticle}
          onArticleChange={onArticleChange}
          rows={previewRows}
          sizes={previewSizes}
          loader={previewLoader}
        />
      ) : null}
    </div>
  );
};
