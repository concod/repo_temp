/**
 * Alpine-style SVG icons for AG Grid's `icons` grid option.
 * Only includes icons that are overridden in ag-theme-mtp.scss.
 * Source assets: coreAssets/alpine-icons/
 */

// --- raw SVG strings — only the icons overridden in the SCSS theme ---

const firstSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M24.273,22.12L18.153,16L24.273,9.88L22.393,8L14.393,16L22.393,24L24.273,22.12ZM7.727,8L10.394,8L10.394,24L7.727,24L7.727,8Z" style="fill-rule:nonzero;"/></svg>`;

const previousSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M21.94,7.88L20.06,6L10.06,16L20.06,26L21.94,24.12L13.833,16L21.94,7.88Z" style="fill-rule:nonzero;"/></svg>`;

const nextSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g transform="matrix(1,0,0,1,1,0)"><path d="M10.94,6L9.06,7.88L17.167,16L9.06,24.12L10.94,26L20.94,16L10.94,6Z" style="fill-rule:nonzero;"/></g></svg>`;

const lastSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M7.727,9.88L13.847,16L7.727,22.12L9.607,24L17.607,16L9.607,8L7.727,9.88ZM21.607,8L24.274,8L24.274,24L21.607,24L21.607,8Z" style="fill-rule:nonzero;"/></svg>`;

const treeClosedSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M11.94,6L10.06,7.88L18.167,16L10.06,24.12L11.94,26L21.94,16L11.94,6Z" style="fill-rule:nonzero;"/></svg>`;

const treeIndeterminateSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g><rect x="6" y="13.5" width="20" height="3"/></g></svg>`;

const treeOpenSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g transform="matrix(1,0,0,1,0,1)"><path d="M24.12,9.06L16,17.167L7.88,9.06L6,10.94L16,20.94L26,10.94L24.12,9.06Z" style="fill-rule:nonzero;"/></g></svg>`;

const menuSvg = `<svg class="override-icons" width="16px" height="16px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#60697d" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g transform="matrix(1,0,0,1,6,9)"><path d="M20,13L0,13L0,11L20,11L20,13ZM20,7L0,7L0,5L20,5L20,7ZM20,1L0,1L0,-1L20,-1L20,1Z" style="fill-rule:nonzero;"/></g></svg>`;

/**
 * AG Grid icon key → inline SVG HTML string map.
 * Ref: https://www.ag-grid.com/javascript-data-grid/custom-icons/
 */
export const alpineIcons = {
  first: firstSvg,
  previous: previousSvg,
  next: nextSvg,
  last: lastSvg,
  treeClosed: treeClosedSvg,
  treeIndeterminate: treeIndeterminateSvg,
  treeOpen: treeOpenSvg,
  groupContracted: treeClosedSvg,
  groupExpanded: treeOpenSvg,
  menu: menuSvg,
};
