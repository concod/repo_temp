// Grid row height for the default content density (from impact-ui's table)
const GRID_ROW_HEIGHT = 46;
// Approx. vertical space taken by everything that isn't table rows:
// app header, breadcrumbs, tabs, filters above + pagination bar below,
// plus the grid's own horizontal scrollbar when columns overflow
const PAGE_CHROME_OFFSET = 556;

/**
 * Rows per page sized to the screen: as many rows as fit in the viewport
 * space below the page chrome, clamped to a 10-50 range. Call once on mount
 * (e.g. useMemo(getViewportPageSize, [])) so the page size stays stable for
 * the session; changing it live would purge the grid's block cache and
 * re-trigger fetches on every resize.
 * Pages with less chrome than the Constraints tabs can pass their own offset.
 */
export const getViewportPageSize = (chromeOffset = PAGE_CHROME_OFFSET) => {
  const availableHeight = window.innerHeight - chromeOffset;
  const rowsThatFit = Math.floor(availableHeight / GRID_ROW_HEIGHT);
  return Math.min(Math.max(rowsThatFit, 10), 50);
};

// Cap for the grid rows area: fill the space below the page chrome when the
// page is full. Note impact-ui applies the AgGridComponent `height` prop as
// a fixed height (not a max-height), so this should only be passed when the
// grid actually has more rows than fit on one page - see
// getGridHeightForRowCount below for the pagination-aware version.
export const getGridHeightCap = (chromeOffset = PAGE_CHROME_OFFSET) =>
  `max(calc(100vh - ${chromeOffset}px), 250px)`;

export const GRID_HEIGHT_CAP = getGridHeightCap();

/**
 * Height to pass to the AgGridComponent `height` prop, aware of whether
 * pagination will actually be shown. When every row fits on a single page
 * (so the pagination bar renders empty/hidden), size the grid's rows area
 * to fit exactly those rows (plus a hairline for the bottom border) instead
 * of the full viewport-based cap, so impact-ui's card hugs the table. Pair
 * with `disablePaginationForSinglePage` on the AgGridComponent, which hides
 * the pagination bar for that same single-page case, and the `customClass="
 * hug-card-bottom-padding"` CSS (agGridHugCard.css), which overrides
 * ag-grid's own 150px min-height floor on the rows canvas that would
 * otherwise fight this smaller height and leave a gap (or a stray
 * scrollbar, if something else forces the canvas taller than this value).
 *
 * Always returns a real (non-undefined/null) pixel value rather than
 * `undefined` - AgGridComponent's internal effect that applies this prop
 * only calls `setTableHeight` when it's defined, so an `undefined` height
 * here would silently be ignored and the previous (larger) height would
 * stick around instead of shrinking.
 *
 * @param {number} [rowCount] Total row count (e.g. rowdata.length).
 * @param {number} [pageSize] The grid's paginationPageSize.
 * @param {number} [chromeOffset]
 */
export const getGridHeightForRowCount = (
  rowCount = 0,
  pageSize = 0,
  chromeOffset = PAGE_CHROME_OFFSET
) =>
  rowCount > 0 && rowCount <= pageSize
    ? `${rowCount * GRID_ROW_HEIGHT + 2}px`
    : getGridHeightCap(chromeOffset);
