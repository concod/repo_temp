import { Button } from "impact-ui-v3";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import "./PackConfigDetailModal.css";

const formatUnits = (num) =>
  num === null || num === undefined ? "—" : num.toLocaleString();

const formatPct = (num) =>
  num === null || num === undefined ? "—" : `${Number(num).toFixed(1)}%`;

const computeUnmet = (demand, allocated) => {
  if (demand === null || demand === undefined || allocated === null || allocated === undefined) {
    return null;
  }
  return demand - allocated;
};

const SummaryStat = ({ label, value }) => (
  <div className="pcd-summaryStat">
    <div className="pcd-summaryStat-label">{label}</div>
    <div className="pcd-summaryStat-value">{value}</div>
  </div>
);

const PackIssueCard = ({ issue }) => {
  const unmet = computeUnmet(issue.demandUnits, issue.allocatedUnits);
  const hasPackSize = issue.packSizeUnits !== null && issue.packSizeUnits !== undefined;

  return (
    <div className="pcd-issueCard">
      <div className="pcd-issueCard-headerRow">
        <span className="pcd-issueCard-packId">{issue.packId}</span>
        <span className="pcd-issueCard-code">{issue.styleColorName}</span>
        {issue.issue && <span className="pcd-issueCard-badge">{issue.issue}</span>}
      </div>

      <div className="pcd-issueCard-statsRow">
        <div className="pcd-issueCard-stat">
          <div className="pcd-issueCard-stat-label">Demand</div>
          <div className="pcd-issueCard-stat-value">{formatUnits(issue.demandUnits)}</div>
        </div>
        <div className="pcd-issueCard-stat">
          <div className="pcd-issueCard-stat-label">Allocated</div>
          <div className="pcd-issueCard-stat-value">{formatUnits(issue.allocatedUnits)}</div>
        </div>
        <div className="pcd-issueCard-stat">
          <div className="pcd-issueCard-stat-label">Unmet</div>
          <div
            className="pcd-issueCard-stat-value"
            style={{ color: unmet !== null ? "#E5484D" : undefined }}
          >
            {unmet !== null ? formatUnits(unmet) : "—"}
          </div>
        </div>
        <div className="pcd-issueCard-stat">
          <div className="pcd-issueCard-stat-label">Affected stores</div>
          <div className="pcd-issueCard-stat-value">
            {formatUnits(issue.affectedStoreCount)}
          </div>
        </div>
        {hasPackSize && (
          <div className="pcd-issueCard-stat">
            <div className="pcd-issueCard-stat-label">Pack size</div>
            <div className="pcd-issueCard-stat-value">
              {formatUnits(issue.packSizeUnits)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Rendered inline inside the "Pack Config -> Under/Over Allocation" insight
// card's expanded content (see InsightsSmartActionsSection's
// `directorySlot`) once "View Affected Style-Colors" is clicked - no modal
// chrome (title/badges/macroImpact are already shown by the accordion
// header/body itself), just the summary stats row followed by the pack
// issues list, matching the real detail API's `content` shape.
const PackConfigDetailSection = ({ detail, loading, error, onExportAll, exportLoading }) => {
  const packIssuesMeta = detail?.content?.packIssues;
  const items = Array.isArray(packIssuesMeta?.items) ? packIssuesMeta.items : [];
  const summary = detail?.summary;
  const totalUnitsOffPackMultiple = detail?.content?.totalUnitsUnderOverPackMultiple;
  const artificialOosRatePct = detail?.content?.artificialOosRatePct;

  return (
    <div className="pcd-inlineSection">
      {loading ? (
        <div className="pcd-statusText">Loading affected style colors...</div>
      ) : error ? (
        <div className="pcd-statusText">Failed to load affected style colors.</div>
      ) : (
        <>
          <div className="pcd-summaryRow">
            {summary?.affectedPlans !== undefined && (
              <SummaryStat label="Affected Plans" value={formatUnits(summary.affectedPlans)} />
            )}
            {summary?.affectedStyleColors !== undefined && (
              <SummaryStat
                label="Affected Style Colors"
                value={formatUnits(summary.affectedStyleColors)}
              />
            )}
            {summary?.affectedStores !== undefined && (
              <SummaryStat label="Affected Stores" value={formatUnits(summary.affectedStores)} />
            )}
            {totalUnitsOffPackMultiple !== undefined && totalUnitsOffPackMultiple !== null && (
              <SummaryStat
                label="Units Off Pack Multiple"
                value={formatUnits(totalUnitsOffPackMultiple)}
              />
            )}
            {artificialOosRatePct !== undefined && artificialOosRatePct !== null && (
              <SummaryStat label="Artificial OOS Rate" value={formatPct(artificialOosRatePct)} />
            )}

            <Button
              variant="secondary"
              size="small"
              className="pcd-exportBtn"
              icon={<FileDownloadOutlinedIcon style={{ fontSize: 16 }} />}
              disabled={exportLoading}
              onClick={(e) => {
                e.stopPropagation();
                onExportAll?.();
              }}
            >
              {exportLoading ? "Exporting..." : "Export All Style Colors"}
            </Button>
          </div>

          {packIssuesMeta && (
            <div className="pcd-metaText">
              Showing {packIssuesMeta.shownCount} of {packIssuesMeta.totalCount} Style Colors by
              impact
            </div>
          )}

          {items.length > 0 ? (
            <div className="pcd-issuesList">
              {items.map((issue) => (
                <PackIssueCard issue={issue} key={issue.packId} />
              ))}
            </div>
          ) : (
            <div className="pcd-statusText">No pack configuration issues found.</div>
          )}
        </>
      )}
    </div>
  );
};

export default PackConfigDetailSection;
