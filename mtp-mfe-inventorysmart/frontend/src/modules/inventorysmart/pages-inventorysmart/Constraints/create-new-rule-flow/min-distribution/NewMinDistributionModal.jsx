import { BottomSheet, Button, useTranslation } from "impact-ui-v3";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import { cellStyles } from "../../Rule-Group-Constraints/ruleGroupStyles";
import { useMinDistributionStyles } from "./styles";
import {
  MinValueRow,
  StyleDistributionSection,
  SizeDistributionSection,
} from "./MinDistributionSections";
import { useNewMinDistributionModal } from "./useNewMinDistributionModal";

const NewMinDistributionModal = (props) => {
  const { t } = useTranslation();
  const classes = useMinDistributionStyles();
  const exceptionClasses = useExceptionStyles();
  const {
    minValue,
    isMinInvalid,
    styleUnitsCap,
    styleUnitsCapHelperText,
    sizeUnitsCap,
    sizeUnitsCapHelperText,
    isStyleUnitsOverCap,
    isSizeUnitsOverCap,
    selectedStyleType,
    selectedSizeType,
    styleUnitsPerArticle,
    showStylePreview,
    stylePreviewRows,
    stylePreviewLoader,
    showSizePreview,
    sizePreviewLoader,
    selectedSizeArticle,
    sizePreviewRows,
    sizePreviewSizes,
    sizeUnitsPerSize,
    selectedSizeValues,
    selectedSizeOptions,
    setSelectedSizeOptions,
    sizeSelectOptions,
    sizeSelectOpen,
    setSizeSelectOpen,
    sizeSelectAll,
    setSizeSelectAll,
    sizeFieldsTouched,
    isSizeUnitsInvalid,
    styleArticleOptions,
    closeModal,
    handleMinChange,
    handleSave,
    handleStyleTypeChange,
    handleStylePreviewToggle,
    handleStyleUnitsChange,
    handleStyleUnitsBlur,
    handleSizeTypeChange,
    handleSizePreviewToggle,
    handleSizeUnitsChange,
    handleSizeUnitsBlur,
    handleSelectedSizesChange,
    commitSizePreview,
    handleSizeArticleChange,
  } = useNewMinDistributionModal(props);

  if (!props.isModalOpen) return null;

  // compute derived disabled flags for preview & save buttons
  const stylePreviewDisabled =
    stylePreviewLoader ||
    isMinInvalid ||
    isStyleUnitsOverCap ||
    (selectedStyleType === "x_units_per_article" && !styleUnitsPerArticle);

  const sizePreviewDisabled =
    sizePreviewLoader ||
    isMinInvalid ||
    isSizeUnitsOverCap ||
    (selectedSizeType === "x_units_per_size" && (isSizeUnitsInvalid || !selectedSizeValues?.length));

  const isXUnitsPerSizeInvalid = isSizeUnitsInvalid || !selectedSizeValues?.length;

  const isSaveDisabled =
    isMinInvalid ||
    stylePreviewDisabled ||
    sizePreviewDisabled ||
    (selectedStyleType === "x_units_per_article" &&
      (isNaN(Number(styleUnitsPerArticle)) ||
        Number(styleUnitsPerArticle) < 1)) ||
    (selectedSizeType === "x_units_per_size" && isXUnitsPerSizeInvalid);
 
  return (
    <BottomSheet
      title={t("inventorysmart.rclMinDistributionTitle")}
      open={props.isModalOpen}
      onClose={closeModal}
      withExpandIcon={false}
      className={exceptionClasses.exceptionBottomSheet}
      footerOptions={
        <div style={cellStyles.bottomSheetFooterActions}>
          <Button variant="url" onClick={closeModal}>
            {t("inventorysmart.rclCancelButton")}
          </Button>
          <Button
            variant="primary"
            disabled={isSaveDisabled}
            onClick={handleSave}
          >
            {t("inventorysmart.rclSaveButton")}
          </Button>
        </div>
      }
    >
      <div className={`container ${classes.container}`}>
        <MinValueRow
          classes={classes}
          minValue={minValue}
          isMinInvalid={isMinInvalid}
          onChange={handleMinChange}
        />
        <StyleDistributionSection
          classes={classes}
          selectedStyleType={selectedStyleType}
          onTypeChange={handleStyleTypeChange}
          showPreview={showStylePreview}
          onPreviewClick={handleStylePreviewToggle}
          previewLoader={stylePreviewLoader}
          previewDisabled={stylePreviewDisabled}
          styleUnitsPerArticle={styleUnitsPerArticle}
          onUnitsChange={handleStyleUnitsChange}
          onUnitsBlur={handleStyleUnitsBlur}
          styleUnitsError={isStyleUnitsOverCap}
          styleUnitsHelperText={
            isStyleUnitsOverCap ? styleUnitsCapHelperText : ""
          }
          maxUnits={styleUnitsCap}
          previewRows={stylePreviewRows}
        />
        <hr className={classes.divider} />
        <SizeDistributionSection
          classes={classes}
          selectedSizeType={selectedSizeType}
          onTypeChange={handleSizeTypeChange}
          showPreview={showSizePreview}
          onPreviewClick={handleSizePreviewToggle}
          previewLoader={sizePreviewLoader}
          previewDisabled={sizePreviewDisabled}
          sizeUnitsPerSize={sizeUnitsPerSize}
          onUnitsChange={handleSizeUnitsChange}
          onUnitsBlur={handleSizeUnitsBlur}
          unitsError={isSizeUnitsOverCap}
          unitsHelperText={isSizeUnitsOverCap ? sizeUnitsCapHelperText : ""}
          maxUnits={sizeUnitsCap}
          sizeFieldsTouched={sizeFieldsTouched}
          isSizeUnitsInvalid={isSizeUnitsInvalid}
          sizeSelectOptions={sizeSelectOptions}
          selectedSizeOptions={selectedSizeOptions}
          setSelectedSizeOptions={setSelectedSizeOptions}
          selectedSizeValues={selectedSizeValues}
          onSizesChange={handleSelectedSizesChange}
          onSizesMenuClose={commitSizePreview}
          sizeSelectOpen={sizeSelectOpen}
          setSizeSelectOpen={setSizeSelectOpen}
          sizeSelectAll={sizeSelectAll}
          setSizeSelectAll={setSizeSelectAll}
          styleArticleOptions={styleArticleOptions}
          selectedSizeArticle={selectedSizeArticle}
          onArticleChange={handleSizeArticleChange}
          previewRows={sizePreviewRows}
          previewSizes={sizePreviewSizes}
        />
      </div>
    </BottomSheet>
  );
};

const mapActionToProps = (dispatch) => ({
  addSnack: (body) => dispatch(addSnack(body)),
});

export default connect(null, mapActionToProps)(NewMinDistributionModal);
