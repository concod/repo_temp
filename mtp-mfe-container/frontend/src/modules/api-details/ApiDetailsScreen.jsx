import { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StorageIcon from "@mui/icons-material/Storage";
import DownloadIcon from "@mui/icons-material/Download";
import { useDispatch } from "react-redux";
import { QUERY_INTROSPECTION_IS_GO, QUERY_INTROSPECTION_IS_PYTHON, QUERY_INTROSPECTION_CORE, QUERY_INTROSPECTION_ADA } from "config/api";
import axiosInstance from "core/Utils/axios";
import { addSnack } from "core/actions/snackbarActions";
import { ApiDetailsStyling } from "./ApiDetailsStyling";


/**
 * Parse a cURL command string into { endpoint, method, payload, headers }
 */
const parseCurl = (curlStr) => {
  if (!curlStr || !curlStr.trim()) {
    throw new Error("Empty input. Please paste a cURL command.");
  }

  // Normalize line continuations: backslash-newline (Unix/macOS) and ^-newline (Windows cmd)
  const cleaned = curlStr
    .replace(/\^\r?\n/g, " ")
    .replace(/\\\r?\n/g, " ")
    .trim();

  if (!cleaned.toLowerCase().startsWith("curl")) {
    throw new Error("Input does not look like a cURL command. It should start with 'curl'.");
  }

  // Extract URL — handle --url flag (Chrome 151+), positional, quoted or unquoted
  const urlMatch =
    cleaned.match(/--url\s+(?:'([^']*)'|"([^"]*)"|(\S+))/) ||
    cleaned.match(/curl\s+(?:'([^']*)'|"([^"]*)"|(\S+))/);
  if (!urlMatch) {
    throw new Error("Could not find a URL in the cURL command. Make sure it contains a valid URL.");
  }
  const fullUrl = urlMatch[1] || urlMatch[2] || urlMatch[3];

  // Extract path from URL
  let urlObj;
  try {
    urlObj = new URL(fullUrl);
  } catch {
    throw new Error(`Invalid URL: "${fullUrl.length > 80 ? fullUrl.substring(0, 80) + "..." : fullUrl}". Expected a full URL starting with http:// or https://.`);
  }
  const endpoint = urlObj.pathname;

  // Extract headers — handle both single-quoted and double-quoted -H values
  const headers = {};
  const headerRegex = /-H\s+(?:'([^']*)'|"([^"]*)")/g;
  let hMatch;
  while ((hMatch = headerRegex.exec(cleaned)) !== null) {
    const headerVal = hMatch[1] ?? hMatch[2];
    const colonIdx = headerVal.indexOf(":");
    if (colonIdx > 0) {
      headers[headerVal.substring(0, colonIdx).trim().toLowerCase()] =
        headerVal.substring(colonIdx + 1).trim();
    }
  }

  // Extract body — handle --data-raw / --data / -d with single or double quotes
  let payload = {};
  const hasDataFlag = /(?:--data(?:-raw)?|-d)\s/.test(cleaned);
  const dataMatch =
    cleaned.match(/--data(?:-raw)?\s+'([\s\S]*?)'\s*(?:--|$)/) ||
    cleaned.match(/--data(?:-raw)?\s+'([\s\S]*)'/) ||
    cleaned.match(/--data(?:-raw)?\s+"([\s\S]*?)"\s*(?:--|$)/) ||
    cleaned.match(/--data(?:-raw)?\s+"([\s\S]*)"/) ||
    cleaned.match(/-d\s+'([\s\S]*?)'\s*(?:--|$)/) ||
    cleaned.match(/-d\s+'([\s\S]*)'/) ||
    cleaned.match(/-d\s+"([\s\S]*?)"\s*(?:--|$)/) ||
    cleaned.match(/-d\s+"([\s\S]*)"/);
  if (dataMatch) {
    const raw = dataMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("Request body found but contains invalid JSON. Check that the --data-raw value is valid JSON.");
    }
  } else if (hasDataFlag) {
    throw new Error("Found a --data/--data-raw flag but could not extract its value. The body might be missing quotes.");
  }

  // Detect method
  const methodMatch = cleaned.match(/-X\s+(\w+)/);
  const method = methodMatch ? methodMatch[1].toUpperCase() : (dataMatch ? "POST" : "GET");

  return { endpoint, method, payload, headers };
};

/**
 * Parse the plain-text introspection response into structured query objects.
 * Format: lines starting with "-- [N] type" followed by SQL until next marker.
 */
const parseIntrospectionResponse = (text) => {
  const result = { endpoint: "", method: "", service: "", totalQueries: 0, totalTimeMs: null, error: null, queries: [] };

  const serviceMatch = text.match(/-- Service:\s*(.+)/);
  if (serviceMatch) result.service = serviceMatch[1].trim();

  const endpointMatch = text.match(/-- Endpoint:\s*(.+)/);
  if (endpointMatch) result.endpoint = endpointMatch[1].trim();

  const methodMatch = text.match(/-- Method:\s*(.+)/);
  if (methodMatch) result.method = methodMatch[1].trim();

  const totalMatch = text.match(/-- Total Queries:\s*(\d+)/);
  if (totalMatch) result.totalQueries = parseInt(totalMatch[1], 10);

  const totalTimeMatch = text.match(/-- Total Time:\s*([\d.]+)\s*ms/);
  if (totalTimeMatch) result.totalTimeMs = parseFloat(totalTimeMatch[1]);

  const errorMatch = text.match(/-- Error:\s*(.+)/);
  if (errorMatch) result.error = errorMatch[1].trim();

  // Split into individual queries by "-- [N]" markers
  const queryBlocks = text.split(/^-- \[(\d+)\]\s*/m);
  for (let i = 1; i < queryBlocks.length; i += 2) {
    const index = parseInt(queryBlocks[i], 10);
    const block = (queryBlocks[i + 1] || "").trim();
    const firstNewline = block.indexOf("\n");
    const headerLine = firstNewline > -1 ? block.substring(0, firstNewline).trim() : block;
    const sql = firstNewline > -1 ? block.substring(firstNewline + 1).trim() : "";

    // Parse header: "Parameterized Query (123.45 ms) [50 rows]"
    const headerParts = headerLine.match(/^(.+?)(?:\s+\(([\d.]+)\s*ms\))?(?:\s+\[(\d+)\s*rows?\])?\s*$/);
    const type = headerParts ? headerParts[1].trim() : headerLine;
    const timeMs = headerParts && headerParts[2] ? parseFloat(headerParts[2]) : null;
    const rowCount = headerParts && headerParts[3] ? parseInt(headerParts[3], 10) : null;

    result.queries.push({ index, type, sql, timeMs, rowCount });
  }

  return result;
};

const ApiDetailsScreen = () => {
  const [curlInput, setCurlInput] = useState("");
  const [outputJson, setOutputJson] = useState("");
  const [parsedResult, setParsedResult] = useState(null);
  const [showOutput, setShowOutput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [responseEndpoint, setResponseEndpoint] = useState("");
  const [responseMethod, setResponseMethod] = useState("");
  const [expandedQueries, setExpandedQueries] = useState({});

  const toggleQuery = (index) => {
    setExpandedQueries((prev) => ({ ...prev, [index]: !prev[index] }));
  };
  const expandAll = () => {
    if (!parsedResult) return;
    const all = {};
    parsedResult.queries.forEach((q) => { all[q.index] = true; });
    setExpandedQueries(all);
  };
  const collapseAll = () => setExpandedQueries({});

  const classes = ApiDetailsStyling();
  const dispatch = useDispatch();

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: { variant: variance },
      })
    );
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputJson);
    displaySnackMessages("Output copied to clipboard", "success");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSQL = () => {
    if (!parsedResult) return;
    const lines = parsedResult.queries.map((q, i) => {
      const header = `-- [${q.index}] ${q.type}${q.timeMs !== null ? ` (${q.timeMs} ms)` : ""}${q.rowCount !== null ? ` [${q.rowCount} rows]` : ""}`;
      return `${header}\n${q.sql}\n`;
    });
    const serviceLine = parsedResult.service ? `-- Service: ${parsedResult.service}\n` : "";
    const content = `${serviceLine}-- Endpoint: ${parsedResult.endpoint}\n-- Method: ${parsedResult.method}\n-- Total Queries: ${parsedResult.totalQueries}\n-- Total Time: ${parsedResult.totalTimeMs ?? "N/A"} ms\n\n${lines.join("\n")}`;
    downloadFile(content, "introspection_queries.sql", "text/sql");
    displaySnackMessages("Exported as SQL", "success");
  };


  const handleGenerate = async () => {
    // Clear old results immediately
    setShowOutput(false);
    setOutputJson("");
    setParsedResult(null);
    setQueryCount(0);
    setExpandedQueries({});

    let parsedInput;

    if (!curlInput || !curlInput.trim()) {
      displaySnackMessages("Please paste a cURL command.", "error");
      return;
    }
    try {
      const parsed = parseCurl(curlInput);
      parsedInput = {
        endpoint: parsed.endpoint,
        method: parsed.method,
        payload: parsed.payload,
      };
    } catch (error) {
      displaySnackMessages(`Invalid cURL: ${error.message}`, "error");
      return;
    }

    setLoading(true);
    try {
      // Route to the correct backend based on endpoint prefix.
      // Go-served endpoints are explicitly listed; everything else → Python.
      const endpoint = parsedInput.endpoint || "";

      // Endpoints served by the Go backend
      const GO_SERVED_PREFIXES = [
        "/api/v2/inventory-smart/configuration/",
        "/api/v2/inventory-smart/product-profile/",
        "/api/v2/inventory-smart/supersession/",
        "/api/v2/inventory-smart/kpi/",
        "/api/v2/inventory-smart/constraint/",
        "/api/v2/inventory-smart/dashboard/",
        "/api/v2/inventory-smart/reporting/",
        "/api/v2/inventory-smart/plan/search",
        "/api/v2/inventory-smart/plan/delete",
        "/api/v2/inventory-smart/plan/summary",
        "/api/v2/inventory-smart/plan/view-past-plans",
        "/api/v2/inventory-smart/new-store/",
        "/api/v2/inventory-smart/strategy/plan/",
        "/api/v2/inventory-smart/strategy/get-store-groups",
        "/api/v2/inventory-smart/strategy/get-setall-defaults",
        "/api/v2/inventory-smart/configurations/",
        "/api/v2/inventory-smart/refresh-cache",
        "/api/v2/inventory-smart/tenant-config",
        "/api/v2/inventory-smart/kpi-configurator/",
        "/api/v2/inventory-smart/inventory-hold/",
        "/api/v2/inventory-smart/download-generic",
        "/api/v2/core/rcl/",
        "/api/v2/core/rcl-mapping/",
        "/api/v2/core/group/",
        "/api/v2/core/table/download-table",
        "/api/v2/master/dc",
        "/api/v2/master/dc-list",
        "/api/v2/master/dimension-table/",
        "/api/v2/master/background/dimension-table/",
        "/api/v2/store-mapping/",
        "/api/v2/product-mapping",
        "/api/v3/inventory-smart/plan/finalize/",
      ];
      const isGoServed = GO_SERVED_PREFIXES.some((prefix) => endpoint.startsWith(prefix));

      let introspectionUrl = QUERY_INTROSPECTION_CORE;
      if (isGoServed) {
        introspectionUrl = QUERY_INTROSPECTION_IS_GO;
      } else if (endpoint.startsWith("/api/v2/inventory-smart/") || endpoint.startsWith("/api/v3/inventory-smart/")) {
        introspectionUrl = QUERY_INTROSPECTION_IS_PYTHON;
      } else if (endpoint.startsWith("/api/v2/ada-visual/")) {
        introspectionUrl = QUERY_INTROSPECTION_ADA;
      }

      const response = await axiosInstance({
        url: introspectionUrl,
        method: "POST",
        data: parsedInput,
      });
      const rawText = typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2);
      setOutputJson(rawText);
      const parsed = parseIntrospectionResponse(rawText);
      setParsedResult(parsed);
      setShowOutput(true);
      setResponseEndpoint(parsed.endpoint || parsedInput.endpoint || "");
      setResponseMethod(parsed.method || parsedInput.method || "");
      setQueryCount(parsed.totalQueries || 0);
      // Auto-expand if 5 or fewer queries
      if (parsed.queries.length <= 5) {
        const all = {};
        parsed.queries.forEach((q) => { all[q.index] = true; });
        setExpandedQueries(all);
      } else {
        setExpandedQueries({});
      }

      displaySnackMessages("Query introspection successful", "success");
    } catch (error) {
      console.error("Query introspection failed:", error);
      setOutputJson(JSON.stringify(error?.response?.data || { error: error.message }, null, 2));
      setShowOutput(true);
      setQueryCount(0);
      displaySnackMessages("Query introspection failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.page}>
        <div className={classes.container}>
          {/* Header */}
          <div className={classes.header}>
            <div className={classes.titleRow}>
              <StorageIcon className={classes.titleIcon} />
              <Typography className={classes.title}>
                Query Introspection
              </Typography>
            </div>
            <Typography className={classes.subtitle}>
              Capture SQL queries executed by any API endpoint. Paste a cURL command to introspect.
            </Typography>
          </div>

          {/* cURL Input */}
          <TextField
            id="curl-input"
            label="Paste cURL command"
            multiline
            rows={8}
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            placeholder={"curl 'https://...' \\\n  -H 'authorization: ...' \\\n  --data-raw '{...}'"}
            variant="outlined"
            fullWidth
            className={classes.textArea}
          />

          {/* Generate Button */}
          <div className={classes.buttonWrap}>
            <Button
              variant="contained"
              color="primary"
              className={classes.generateBtn}
              onClick={handleGenerate}
              disabled={loading || !curlInput.trim()}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            >
              {loading ? "Running..." : "Run Introspection"}
            </Button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className={classes.loadingSection}>
              <LinearProgress className={classes.progressBar} />
              <div className={classes.loadingContent}>
                <CircularProgress size={40} thickness={4} />
                <Typography className={classes.loadingText}>
                  Executing API and capturing SQL queries...
                </Typography>
                <Typography className={classes.loadingSubtext}>
                  This may take a moment for complex endpoints
                </Typography>
              </div>
            </div>
          )}

          {/* Output Section */}
          {showOutput && parsedResult && (
            <div className={classes.outputSection}>
              {/* Summary Row */}
              <div className={classes.summaryRow}>
                {parsedResult.service && (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "#fff",
                      backgroundColor: parsedResult.service === "go" ? "#00ADD8" : "#3776AB",
                      marginRight: 8,
                    }}
                  >
                    {parsedResult.service}
                  </span>
                )}
                <span className={classes.summaryItem}>
                  <strong>{queryCount}</strong> {queryCount === 1 ? "query" : "queries"}
                </span>
                {parsedResult.totalTimeMs !== null && (
                  <span className={classes.summaryItem}>
                    API responded in <strong>{parsedResult.totalTimeMs >= 1000 ? `${(parsedResult.totalTimeMs / 1000).toFixed(2)}s` : `${parsedResult.totalTimeMs}ms`}</strong>
                  </span>
                )}
                {responseEndpoint && (
                  <span className={classes.summaryItemMono}>{responseMethod && `${responseMethod} `}{responseEndpoint}</span>
                )}
              </div>

              {parsedResult.error && (
                <div className={classes.errorBanner}>
                  <Typography className={classes.errorText}>{parsedResult.error}</Typography>
                </div>
              )}

              {/* Action Bar */}
              <div className={classes.actionBar}>
                <div className={classes.actionBarLeft}>
                  <Button size="small" onClick={expandAll} className={classes.toggleBtn}>Expand All</Button>
                  <Button size="small" onClick={collapseAll} className={classes.toggleBtn}>Collapse All</Button>
                </div>
                <div className={classes.outputActions}>
                  <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportSQL} className={classes.exportBtn}>SQL</Button>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyOutput} className={classes.exportBtn}>Copy All</Button>
                </div>
              </div>

              {/* Query List */}
              {parsedResult.queries.length > 0 ? (
                <div className={classes.queryList}>
                  {parsedResult.queries.map((q) => (
                    <div key={q.index} className={classes.queryCard}>
                      <div className={classes.queryHeader} onClick={() => toggleQuery(q.index)}>
                        {expandedQueries[q.index]
                          ? <KeyboardArrowDownIcon className={classes.expandIcon} />
                          : <KeyboardArrowRightIcon className={classes.expandIcon} />
                        }
                        <span className={classes.queryNumber}>#{q.index}</span>
                        <span className={classes.queryType}>{q.type}</span>
                        {(q.timeMs > 0 || q.rowCount !== null) && <span className={classes.queryDot}>·</span>}
                        {q.timeMs > 0 && <span className={classes.queryTime}>{q.timeMs >= 1000 ? `${(q.timeMs / 1000).toFixed(2)}s` : `${Number.isInteger(q.timeMs) ? q.timeMs : q.timeMs.toFixed(1)}ms`}</span>}
                        {q.rowCount !== null && <span className={classes.queryRows}>{q.rowCount.toLocaleString()} rows</span>}
                        <span className={classes.queryHeaderSpacer} />
                        <Tooltip title="Copy this query">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(q.sql);
                              displaySnackMessages(`Query #${q.index} copied`, "success");
                            }}
                            className={classes.copyBtn}
                          >
                            <ContentCopyIcon style={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </div>
                      {expandedQueries[q.index] && (
                        <pre className={classes.queryPre}>{q.sql}</pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Typography className={classes.noFieldsMessage}>No queries captured for this endpoint.</Typography>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

export default ApiDetailsScreen;
