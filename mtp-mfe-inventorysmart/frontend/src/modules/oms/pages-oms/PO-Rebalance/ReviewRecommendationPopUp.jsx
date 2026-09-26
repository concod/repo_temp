import Form from "core/Utils/form";
import { useMemo, useCallback } from "react";
import { isEmpty } from "lodash";
import { BottomSheet, Button } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import InventoryIcon from "assets/impactv3/InventoryIcon.svg";
import DraftIcon from "assets/impactv3/DraftIcon.svg";
import DoneIcon from "assets/impactv3/DoneIcon.svg";
import makeStyles from "@mui/styles/makeStyles";

const usePopupStyles = makeStyles({
  reviewRecommendationTableWrapper: {
    marginTop: "40px",
    "& > div": {
      marginTop: "0 !important",
      height: "auto !important",
      minHeight: "unset !important",
    },
    "& .impact_emptystate": {
      marginBottom: "24px !important",
    },
  },
  reviewRecommendationPopupWrapper: {
    "&.ia_modalPopover": {
      height: "auto !important",
      minHeight: "unset !important",
      maxHeight: "calc(100vh - 64px) !important",
    },
    "& .ia_modalBody": {
      position: "relative",
      top: "auto",
      bottom: "auto",
      flex: "none",
      height: "auto",
      overflow: "visible",
      paddingBottom: "0px !important",
    },
    "& .ia_modalFooter": {
      position: "relative",
    },
  },
  selectedWeeksBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "20px",
    background: "#EEF0F7",
    color: "#1F2937",
    fontSize: "14px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
});

const ICON_LABEL_MAPPING = {
  approve: <DoneIcon />,
  draft: <DraftIcon />,
  pending: <InventoryIcon />,
};

const ReviewRecommendationPopUp = ({
  setShowSetAllModal,
  choiceTableColumns,
  kpiValues,
  selectedRows,
  isDataWeekLevel,
  SetAllData,
  displaySnackMessages,
  topContent,
  formData,
  setFormData,
  flagEdit,
  setFlagEdit,
  renderReviewRecommendationTable,
  onSaveDraft,
  onApprove,
  isApproveDisabled,
  isSaveDraftDisabled,
  isFromSidePanel,
  selectedRowData,
  VIEW_STATUS_FISCAL_WEEK_GROUP,
  selectedChoice,
  isLoading = false,
  hideWeekSelector = false,
  selectedWeeksLabel = "",
  selectedChoiceLabel = "",
}) => {
  const classes = useStyles();
  const popupClasses = usePopupStyles();

  const isWeekLevel = true;

  const getWeekMonthOptions = useCallback(() => {
    try {
      if (VIEW_STATUS_FISCAL_WEEK_GROUP) {
        const matchedRow = Array.isArray(selectedRowData)
          ? selectedRowData.find((row) => row?.aggr_column === selectedChoice)
          : selectedRowData?.aggr_column === selectedChoice
          ? selectedRowData
          : null;

        if (
          matchedRow?.fiscal_week_status_mapping &&
          Object.keys(matchedRow.fiscal_week_status_mapping).length > 0
        ) {
          const statusWeekOptions = Object.keys(
            matchedRow.fiscal_week_status_mapping
          ).map((status) => ({
            label: status,
            icon: ICON_LABEL_MAPPING[String(status || "").toLowerCase()],
            options: matchedRow.fiscal_week_status_mapping[status]
              .map((week) => {
                const foundColumn = choiceTableColumns.find(
                  (col) => col.column_name === String(week)
                );
                if (!foundColumn) return null;
                return {
                  label: foundColumn.label,
                  value: String(week),
                  id: String(week),
                };
              })
              .filter(Boolean),
          }));

          const statusWeekList = new Set(
            statusWeekOptions.flatMap((group) =>
              group.options.map((opt) => opt.value)
            )
          );

          const pendingWeekOptions = {
            label: "Pending",
            icon: ICON_LABEL_MAPPING.pending,
            options: choiceTableColumns
              .filter((data) => !statusWeekList.has(data?.column_name))
              .map((data) => ({
                label: data?.label,
                value: data?.column_name,
                id: data?.column_name,
              })),
          };

          const weekOptions =
            pendingWeekOptions.options.length > 0
              ? [...statusWeekOptions, pendingWeekOptions]
              : statusWeekOptions;

          return weekOptions;
        }
        return [
          {
            label: "Pending",
            options: choiceTableColumns.map((data) => ({
              label: data?.label,
              value: data?.column_name,
              id: data?.column_name,
            })),
          },
        ];
      }
      return choiceTableColumns.map((data) => ({
        label: data?.label,
        value: data?.column_name,
        id: data?.column_name,
      }));
    } catch (error) {
      console.error("Error in getWeekMonthOptions:", error);
      return [];
    }
  }, [
    VIEW_STATUS_FISCAL_WEEK_GROUP,
    selectedRowData,
    choiceTableColumns,
    selectedChoice,
  ]);

  const FISCAL_WEEK_SETALL_FIELDS = useMemo(
    () => [
      {
        accessor: "week_month_list",
        field_type: "list",
        isMulti: false,
        options: getWeekMonthOptions(),
        required: true,
        label: isWeekLevel ? "Select Week" : "Month",
        isGrouped: VIEW_STATUS_FISCAL_WEEK_GROUP,
      },
    ],
    [getWeekMonthOptions, isWeekLevel, selectedRowData, selectedChoice]
  );

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const handleChange = (data) => {
    setFormData(data);

    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
    setFormData({});
  };

  const reviewTableContent =
    !isLoading && renderReviewRecommendationTable
      ? renderReviewRecommendationTable()
      : null;

  return (
    <BottomSheet
      open={true}
      onClose={() => onCancel()}
      title="Review recommendation"
      className={popupClasses.reviewRecommendationPopupWrapper}
      footerOptions={
        <>
          <Button onClick={onCancel} variant="url">
            Cancel
          </Button>
          <Button
            onClick={onSaveDraft}
            variant="secondary"
            disabled={isLoading || isSaveDraftDisabled()}
          >
            Save as draft
          </Button>
          <Button
            onClick={onApprove}
            variant="primary"
            disabled={isLoading || isApproveDisabled()}
          >
            Approve rebalance
          </Button>
        </>
      }
      // isExpanded={false}
    >
      <Loader
        loader={isLoading}
        minHeight="260px"
        isCustomLoader={true}
        wrapperPosition="relative"
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {!isFromSidePanel &&
            !isLoading &&
            (hideWeekSelector ? (
              <>
                {selectedWeeksLabel && (
                  <div className={popupClasses.selectedWeeksBadge}>
                    Selected weeks: {selectedWeeksLabel}
                  </div>
                )}
                {selectedChoiceLabel && (
                  <div className={popupClasses.selectedWeeksBadge}>
                    {selectedChoiceLabel}
                  </div>
                )}
              </>
            ) : (
              <div
                className={classes.flexRow}
                style={{ alignItems: "center" }}
              >
                <div>
                  {FISCAL_WEEK_SETALL_FIELDS?.[0]?.options?.length > 0 && (
                    <Form
                      maxFieldsInRow={2}
                      layout={"vertical"}
                      handleChange={handleChange}
                      fields={FISCAL_WEEK_SETALL_FIELDS}
                      updateDefaultValue={true}
                      defaultValues={{}}
                      selectMinWidth={"300px"}
                    ></Form>
                  )}
                  <label
                    style={{
                      fontSize: "12px",
                      position: "absolute",
                      color: "#60697D",
                      fontWeight: "500",
                    }}
                  >
                    *The subsequent 3 weeks are selected automatically
                  </label>
                </div>
                <div
                  className={classes.lineSeparator}
                  style={{ transform: "translateY(90%)" }}
                ></div>
              </div>
            ))}
          {!isLoading && !hideWeekSelector && topContent}
        </div>
        <div className={popupClasses.reviewRecommendationTableWrapper}>
          {reviewTableContent}
        </div>
      </Loader>
    </BottomSheet>
  );
};

export default ReviewRecommendationPopUp;
