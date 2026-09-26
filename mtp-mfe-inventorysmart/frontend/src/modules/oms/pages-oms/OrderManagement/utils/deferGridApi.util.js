/**
 * Schedule AG Grid API work after the current draw/render cycle.
 * AG Grid throws if refreshCells/redrawRows/etc. run mid-draw.
 */
export function deferGridApiCall(api, fn) {
  if (typeof fn !== "function") return;
  setTimeout(() => {
    if (api?.isDestroyed?.()) return;
    fn();
  }, 0);
}
