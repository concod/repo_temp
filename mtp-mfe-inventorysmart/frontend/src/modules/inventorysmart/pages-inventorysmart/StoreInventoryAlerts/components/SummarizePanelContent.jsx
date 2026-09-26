import { useRef } from "react";
import "./SummarizePanelContent.css";
import "../../Decision-Dashboard/AISummaryData/AISummaryCard.css";
import AI from "assets/AI.png";
import AgGridComponent from "core/Utils/agGrid";
import OverflowTooltip from "core/Utils/agGrid/OverflowTooltip";
import { Tooltip } from "impact-ui-v3";
import { THEME, QC_COLUMN_FLEX, TABLE_TEXT_FLEX, TABLE_NUMERIC_FLEX } from "./SummarizePanelContent.constants";

const SectionHeading = ({ text }) => (
  <div className="summ-categorySection">
    <div className="ais-categoryLine" />
    <div className="ais-categoryPill">
      <span className="ais-highlight">{text}</span>
    </div>
  </div>
);

const MetricsSection = ({ section }) => (
  <div className="spc-metrics-section">
    <SectionHeading text={section.title} />
    <div
      className="spc-metrics-grid"
      style={{ gridTemplateColumns: `repeat(${section.metrics.length}, 1fr)` }}
    >
      {section.metrics.map((metric, i) => {
        const t = THEME[metric.theme] || THEME.blue;
        return (
          <div
            key={i}
            className="spc-metric-card"
            style={{
              background: t.bg,
              borderRight: i < section.metrics.length - 1 ? "1px solid #d1d5db" : "none",
            }}
          >
            <div className="ais-value spc-metric-label" style={{ color: t.label }}>
              {metric.label}
            </div>
            <div className="spc-metric-value" style={{ color: t.value }}>
              {metric.value}
            </div>
            <div className="ais-value spc-metric-detail" style={{ color: t.label }}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Text rendering helpers ────────────────────────────────────────────────────

// Converts **text** → <strong>text</strong>
const renderWithBold = (text) => {
  if (!text || !text.includes("**")) return text;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
};

// Splits a string into plain-text and [[id]] button segments
const buildSegments = (text = "") => {
  if (!text) return [{ type: "text", value: "" }];
  const segments = [];
  const regex = /\[\[(.*?)\]\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "button", id: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
};

// Builds the hover content shown inside the Tooltip for a given [[id]]
const getTooltipContent = (id, tooltipData) => {
  const tooltipInfo = (tooltipData || []).find((t) => t.id === id);
  if (!tooltipInfo?.data) {
    return <div className="spc-tooltip-no-data">No data available.</div>;
  }
  const entries = Object.entries(tooltipInfo.data);
  if (!entries.length) {
    return <div className="spc-tooltip-no-data">No data available.</div>;
  }
  return (
    <div className="spc-tooltip-container">
      <div className="spc-tooltip-header">Details</div>
      <div className="spc-tooltip-body">
        {entries.map(([key, value], i) => (
          <div key={key} className="spc-tooltip-entry">
            <div className="spc-tooltip-key">{i + 1}. {key}</div>
            {value && value.split(",").map((v, j) => (
              <div key={j} className="spc-tooltip-value">• {v.trim()}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Master renderer — handles **bold** and [[id]] info buttons in one pass
const renderText = (text, tooltipData) => {
  if (!text) return text;
  const segments = buildSegments(text);
  if (segments.length === 1 && segments[0].type === "text") {
    return renderWithBold(text);
  }
  return segments.map((seg, i) => {
    if (seg.type === "button") {
      return (
        <Tooltip key={i} title={getTooltipContent(seg.id, tooltipData)} variant="secondary">
          <button type="button" className="alan-inline-info-btn">i</button>
        </Tooltip>
      );
    }
    return renderWithBold(seg.value);
  });
};

const InsightsSection = ({ section, tooltipData }) => {
  const { content } = section;

  const renderContent = () => {
    if (!content) return null;

    // "paragraph" — single block of text
    if (content.type === "paragraph") {
      return (
        <p className="spc-insights-paragraph">
          {renderText(content.text, tooltipData)}
        </p>
      );
    }

    // "list" — flat array of plain strings (e.g. priority_actions)
    if (content.type === "list") {
      return (
        <div className="spc-insights-item">
          <ul className="ais-recoList bullet spc-insights-list">
            {content.items?.map((item, i) => (
              <li key={i}>{renderText(item, tooltipData)}</li>
            ))}
          </ul>
        </div>
      );
    }

    // "numbered" (or any other type) — array of { title, children[] } objects
    return content.items?.map((item, i) => (
      <div key={i} className="spc-insights-item">
        <div className="ais-subTitle spc-insights-title">
          {i + 1}. {renderText(item.title, tooltipData)}
        </div>
        <ul className="ais-recoList bullet spc-insights-list">
          {item.children?.map((child, j) => (
            <li key={j}>{renderText(child, tooltipData)}</li>
          ))}
        </ul>
      </div>
    ));
  };

  return (
    <div className="spc-insights-section">
      <SectionHeading text={section.heading} />
      <div className="spc-insights-body">{renderContent()}</div>
    </div>
  );
};


const buildQCColDefs = (columns, flexMap) =>
  (columns || []).map((col) => ({
    headerName:        col.label || col.key || "",
    field:             col.key,
    flex:              flexMap[col.key] ?? 1,
    suppressSizeToFit: true,
    cellRenderer:      (params) => <OverflowTooltip {...params} />,
  }));

const buildTableColDefs = (columns) =>
  (columns || []).map((col) => ({
    headerName:        col.label || col.key || "",
    field:             col.key,
    flex:              col.numeric ? TABLE_NUMERIC_FLEX : TABLE_TEXT_FLEX,
    suppressSizeToFit: true,
    cellRenderer:      (params) => <OverflowTooltip {...params} />,
  }));

const deriveColumns = (rows) =>
  Object.keys(rows[0] || {}).map((key) => ({
    key,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

const QualityChecksSection = ({ section }) => {
  const tableInstance = useRef(null);
  const rows = section.qualityChecks.rows || [];
  const columns = section.qualityChecks.columns?.length
    ? section.qualityChecks.columns
    : deriveColumns(rows);

  const colDefs = buildQCColDefs(columns, QC_COLUMN_FLEX);
  return (
    <div className="spc-qc-section">
      <SectionHeading text={section.title} />
      <AgGridComponent
        columns={colDefs}
        rowdata={rows}
        uniqueRowId="check"
        pagination={false}
        showSaveTableConfig={false}
        sideBar={false}
        sizeColumnsToFitFlag={true}
        height="300px"
        loadTableInstance={(params) => { tableInstance.current = params; }}
        showDownloadButton={rows.length > 0}
        onDownloadButtonClick={() =>
          tableInstance.current?.api?.exportDataAsExcel({ fileName: "quality_checks" })
        }
      />
    </div>
  );
};

const TableSection = ({ section }) => {
  const tableInstance = useRef(null);
  const rows = section.rows || [];
  const rawColumns = section.columns?.length
    ? section.columns
    : deriveColumns(rows);
  const colDefs = buildTableColDefs(rawColumns);

  return (
    <div className="spc-table-section">
      <SectionHeading text={section.title} />
      <AgGridComponent
        columns={colDefs}
        rowdata={rows}
        pagination={false}
        showSaveTableConfig={false}
        sideBar={false}
        sizeColumnsToFitFlag={true}
        height="450px"
        loadTableInstance={(params) => { tableInstance.current = params; }}
        showDownloadButton={rows.length > 0}
        onDownloadButtonClick={() =>
          tableInstance.current?.api?.exportDataAsExcel({ fileName: section.title || "table" })
        }
      />
    </div>
  );
};

const renderSection = (section, idx, tooltipData) => {
  if (section.kind === "metrics") return <MetricsSection key={idx} section={section} />;
  if (section.type === "section") return <InsightsSection key={idx} section={section} tooltipData={tooltipData} />;
  if (section.qualityChecks)      return <QualityChecksSection key={idx} section={section} />;
  if (section.kind === "table")   return <TableSection key={idx} section={section} />;
  return null;
};

const SummarizePanelContent = ({ data }) => {
  if (!data) return null;
  const tooltipData = data?.tooltip;
  return (
    <div className="ais-card spc-root">
      <div className="ais-header">
        <div className="ais-headerRow">
          <div className="ais-lineLeft" />
          <div className="ais-pill">
            <img src={AI} alt="AI Icon" className="ais-aiIcon" />
            <span className="ais-pillText">Generated by Alan</span>
          </div>
          <div className="ais-lineRight" />
        </div>
      </div>

      {/* Sections */}
      {(data.sections || []).map((section, idx) => renderSection(section, idx, tooltipData))}
    </div>
  );
};

export default SummarizePanelContent;
