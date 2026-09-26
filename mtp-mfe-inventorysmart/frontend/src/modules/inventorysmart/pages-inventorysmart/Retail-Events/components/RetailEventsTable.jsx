import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { isEmpty } from "lodash";
import { makeStyles } from "@mui/styles";
import UploadIcon from "@mui/icons-material/FileUpload";
import { Badge, Button, Prompt, Tabs, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import {
  activateOrDeactivateRetailEvents,
  getRetailEventsList,
} from "modules/inventorysmart/services-inventorysmart/Retail-Events/retail-events-service";
import {
  RETAIL_EVENTS_MESSAGES,
  RETAIL_EVENTS_TABS,
  RETAIL_EVENTS_UNIQUE_ROW_ID,
} from "../constants";
import {
  buildSetAllPayload,
  withActiveStatusFilter,
  withDerivedDates,
} from "../utils";
import { useRetailEventsColumns } from "../hooks/useRetailEventsColumns";
import RetailEventsFileUpload from "./RetailEventsFileUpload";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  fileUploadContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "360px",
  },
}));

/**
 * Events Data grid with Activated / Deactivated tabs.
 * Tabs always stay visible — empty Activated state shows the uploader under the
 * tabs so the user can still switch to Deactivated.
 */
const RetailEventsTable = ({
  pageSize,
  filters,
  uploadSummary,
  refreshKey,
  onUploadClick,
  onViewErrorsClick,
  onUploaded,
  onError,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const dispatch = useDispatch();
  const gridRef = useRef(null);
  const filtersRef = useRef(filters);
  const activeTabRef = useRef(RETAIL_EVENTS_TABS.ACTIVATED);
  const columns = useRetailEventsColumns();
  const [activeTab, setActiveTab] = useState(RETAIL_EVENTS_TABS.ACTIVATED);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isSetAllOpen, setIsSetAllOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivatedEmpty, setIsActivatedEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  filtersRef.current = filters;
  activeTabRef.current = activeTab;

  const tabNames = [
    {
      value: RETAIL_EVENTS_TABS.ACTIVATED,
      label: t("inventorysmart.activated"),
    },
    {
      value: RETAIL_EVENTS_TABS.DEACTIVATED,
      label: t("inventorysmart.deactivated"),
    },
  ];

  const isActivatedTab = activeTab === RETAIL_EVENTS_TABS.ACTIVATED;
  const setAllDeactivates = isActivatedTab;

  const refreshGrid = () => {
    gridRef.current?.api?.deselectAll?.();
    gridRef.current?.api?.purgeInfiniteCache?.();
    setSelectedCount(0);
  };

  useEffect(() => {
    setIsLoading(true);
    refreshGrid();
  }, [refreshKey, filters, activeTab]);

  const handleTabChange = (_event, value) => {
    // Always remount the Activated grid when returning to the tab so we re-fetch.
    // Otherwise a stale isActivatedEmpty keeps the uploader and skips the API.
    if (value === RETAIL_EVENTS_TABS.ACTIVATED) {
      setIsActivatedEmpty(false);
    }
    setActiveTab(value);
  };

  const manualCallBack = async (body, pageIndex) => {
    if (pageIndex === 0) setIsLoading(true);
    try {
      const isActive = activeTabRef.current === RETAIL_EVENTS_TABS.ACTIVATED;
      const response = await dispatch(
        getRetailEventsList({
          filters: filtersRef.current,
          meta: {
            ...body,
            limit: { limit: pageSize, page: pageIndex + 1 },
            search: [
              ...(body.search || []),
              {
                column: "is_active",
                pattern: isActive ? 1 : 0,
                search_type: "equals",
              },
            ],
          },
        })
      );
      const rows = withDerivedDates(response?.data?.data || []);
      // User-driven search/range should not flip the Activated empty upload.
      const userSearch = (body?.search || []).filter(
        (item) => item?.column !== "is_active"
      );
      if (
        isActive &&
        pageIndex === 0 &&
        isEmpty(userSearch) &&
        isEmpty(body?.range)
      ) {
        setIsActivatedEmpty(rows.length === 0);
      }
      return { data: rows };
    } catch (error) {
      onError?.(error);
      return { data: [] };
    } finally {
      if (pageIndex === 0) setIsLoading(false);
    }
  };

  const handleInlineUploaded = (summary) => {
    onUploaded?.(summary);
    // Successful rows leave the empty upload; only-errors stay on it.
    if (summary.success > 0) {
      setIsActivatedEmpty(false);
    }
  };

  const handleSetAll = async () => {
    try {
      setIsSaving(true);
      const isActive = activeTabRef.current === RETAIL_EVENTS_TABS.ACTIVATED;
      const payload = buildSetAllPayload({
        gridApi: gridRef.current?.api,
        deactivate: setAllDeactivates,
        filters: withActiveStatusFilter(filtersRef.current, isActive),
        uniqueRowId: RETAIL_EVENTS_UNIQUE_ROW_ID,
      });
      await dispatch(activateOrDeactivateRetailEvents(payload));
      onSuccess?.(RETAIL_EVENTS_MESSAGES.setAllSuccess);
      // Activating rows means Activated tab should show the grid again.
      if (!setAllDeactivates) {
        setIsActivatedEmpty(false);
      }
      refreshGrid();
    } catch (error) {
      onError?.(error);
    } finally {
      setIsSaving(false);
      setIsSetAllOpen(false);
    }
  };

  const topRightOptions = (
    <>
      {uploadSummary?.rejected > 0 && activeTab === RETAIL_EVENTS_TABS.ACTIVATED && (
        <Badge
          color="error"
          variant="subtle"
          size="medium"
          onClick={onViewErrorsClick}
          label={`${uploadSummary.rejected}/${uploadSummary.total} errors`}
          sx={{ cursor: "pointer" }}
        />
      )}
      <Button variant="secondary" icon={<UploadIcon />} onClick={onUploadClick}>
        Upload
      </Button>
      {selectedCount > 0 && (
        <Button variant="secondary" onClick={() => setIsSetAllOpen(true)}>
          Set All
        </Button>
      )}
    </>
  );

  return (
    <div className={classes.root}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        orientation="horizontal"
        remountOnTabChange={false}
        tabNames={tabNames}
        tabPanels={[null, null]}
      />

      {isActivatedEmpty && activeTab === RETAIL_EVENTS_TABS.ACTIVATED ? (
        <div className={classes.fileUploadContainer}>
          <RetailEventsFileUpload
            uploadSummary={uploadSummary}
            onUploaded={handleInlineUploaded}
            onViewErrors={onViewErrorsClick}
            onError={onError}
          />
        </div>
      ) : (
        <Loader loader={isLoading || isEmpty(columns)} minHeight="520px">
          {!isEmpty(columns) && (
            <AgGridComponent
              key={activeTab}
              tableHeader={RETAIL_EVENTS_MESSAGES.tableHeader}
              columns={columns}
              manualCallBack={manualCallBack}
              rowModelType="infinite"
              pagination={false}
              cacheBlockSize={pageSize}
              cacheOverflowSize={2}
              hideSelectCurrentPageRecords
              domLayout="normal"
              height="520px"
              uniqueRowId={RETAIL_EVENTS_UNIQUE_ROW_ID}
              rowSelection="multiple"
              selectAllHeaderComponent
              onSelectionChanged={(event) =>
                setSelectedCount(event.api.getSelectedRows().length)
              }
              loadTableInstance={(instance) => {
                gridRef.current = instance;
              }}
              topRightOptions={topRightOptions}
              suppressClickEdit
            />
          )}
        </Loader>
      )}

      <Prompt
        isOpen={isSetAllOpen}
        variant="warning"
        title={
          setAllDeactivates
            ? RETAIL_EVENTS_MESSAGES.deactivateTitle
            : RETAIL_EVENTS_MESSAGES.activateTitle
        }
        primaryButtonLabel="Confirm"
        secondaryButtonLabel="Cancel"
        primaryButtonProps={{ loading: isSaving }}
        onPrimaryButtonClick={handleSetAll}
        onSecondaryButtonClick={() => setIsSetAllOpen(false)}
        handleClose={() => setIsSetAllOpen(false)}
      >
        {setAllDeactivates
          ? RETAIL_EVENTS_MESSAGES.deactivateBody
          : RETAIL_EVENTS_MESSAGES.activateBody}
      </Prompt>
    </div>
  );
};

export default RetailEventsTable;
