import type { StructuredDataResponse } from "../types/chat.types";

interface StructuredDataFetcher {
  fetchStructuredData(url: string): Promise<StructuredDataResponse>;
}

export interface ProcessedResponse {
  structuredData?: StructuredDataResponse;
  text: string;
}

/**
 * Extract JSON file URL from response text.
 * Matches "Data File:" followed by URL ending in .json, or markdown-style links.
 */
export function extractJsonUrl(text: string): string | null {
  const candidates: string[] = [];

  // Data File: https://example.com/file.json
  const dataFileMatches = text.matchAll(
    /Data File:\s*(https?:\/\/[^\s\]\)]+\.json)/gi
  );
  for (const match of dataFileMatches) {
    if (match[1]) candidates.push(match[1].trim());
  }

  // Markdown link: [text](https://example.com/file.json)
  const markdownMatches = text.matchAll(/\]\((https?:\/\/[^)]+\.json)\)/gi);
  for (const match of markdownMatches) {
    if (match[1]) candidates.push(match[1].trim());
  }

  // Plain URL ending in .json (e.g. in HTML or plain text)
  const plainMatches = text.matchAll(/(https?:\/\/[^\s\]\)"']+\.json)/gi);
  for (const match of plainMatches) {
    if (match[1]) candidates.push(match[1].trim());
  }

  const uniqueCandidates = [...new Set(candidates)];
  if (!uniqueCandidates.length) return null;

  // Prefer rag_result JSON when both visualization and RAG result files are present.
  const ragResultUrl = uniqueCandidates.find((url) =>
    /(?:^|\/)rag_result[^/]*\.json(?:$|\?)/i.test(url)
  );

  return ragResultUrl ?? uniqueCandidates[0];
}

/**
 * Remove "More Info:", "Visualization:", and "Data File:" URL sections from text.
 * Used when falling back to text rendering so users don't see raw file links.
 */
export function removeVisualizationUrls(text: string): string {
  let cleaned = text;

  // Remove entire "More Info:" block BUT only strip Data File
  cleaned = cleaned.replace(
    /More Info:\s*\n?\s*(?:Visualization:\s*https?:\/\/[^\n]*\.html\s*\n?\s*)?(?:Data File:\s*https?:\/\/[^\n]*\.json)?/gi,
    (match) => {
      // Keep Visualization .html
      const htmlMatch = match.match(/Visualization:\s*(https?:\/\/[^\s\n]+\.html)/i);
      return htmlMatch ? `Visualization: ${htmlMatch[1]}` : "";
    }
  );

  // ❌ REMOVE ONLY Data File (.json)
  cleaned = cleaned.replace(
    /Data File:\s*https?:\/\/[^\s\n]+\.json/gi,
    ""
  );

  // ✅ DO NOT remove Visualization .html anymore

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}


/**
 * Validate that data has the required structure for StructuredDataResponse.
 * Accepts both legacy format (string[] columns, string[][] rows) and
 * new format (TableColumn[] columns, TableRow[] rows).
 */
export function validateStructuredData(data: unknown): data is StructuredDataResponse {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const summary = o.summary;
  if (!summary || typeof summary !== "object") return false;
  const s = summary as Record<string, unknown>;
  if (
    typeof s.title !== "string" ||
    typeof s.answer !== "string" ||
    !Array.isArray(s.key_insights)
  ) {
    return false;
  }
  if (o.tables !== undefined && !Array.isArray(o.tables)) return false;
  if (o.charts !== undefined && !Array.isArray(o.charts)) return false;
  if (o.metrics !== undefined && !Array.isArray(o.metrics)) return false;

  // Validate table structure supports both formats
  if (Array.isArray(o.tables)) {
    for (const table of o.tables as Record<string, unknown>[]) {
      if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) return false;
      // columns: string[] or { name, datatype }[]
      for (const col of table.columns as unknown[]) {
        if (typeof col !== "string" && (typeof col !== "object" || col === null || typeof (col as Record<string, unknown>).name !== "string")) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Process response text: try to load structured JSON from URL if present,
 * otherwise return cleaned text with Visualization/Data File URLs removed.
 */
export async function processResponseText(
  text: string,
  service: StructuredDataFetcher
): Promise<ProcessedResponse> {
  const url = extractJsonUrl(text);
  if (url) {
    try {
      const structuredData = await service.fetchStructuredData(url);
      return { structuredData, text: "" };
    } catch {
      // Fall through to cleaned text
    }
  }
  return {
    text: removeVisualizationUrls(text),
  };
}
