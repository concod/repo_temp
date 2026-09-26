/**
 * Tab Notification Utility
 * Shows a red badge on the browser tab favicon and updates the document title
 * when new step_form chunks arrive while the user is on a different tab.
 * Similar to Facebook's unread message count badge.
 */

const ORIGINAL_TITLE = " Impact Smart ";
const FAVICON_SELECTOR = 'link[rel="icon"]';

let notificationCount = 0;
let originalFaviconHref = null;
let faviconCanvas = null;
let faviconCtx = null;
let faviconImg = null;
let isInitialized = false;
let visibilityListenerAttached = false;
let titleBlinkInterval = null;

/**
 * Initialize the canvas and load the original favicon image.
 * Called lazily on first notification.
 */
function init() {
  if (isInitialized) return;
  isInitialized = true;

  /** @type {HTMLLinkElement|null} */
  const faviconEl = document.querySelector(FAVICON_SELECTOR);
  originalFaviconHref = faviconEl ? faviconEl.href : "/assets/IA.svg";

  faviconCanvas = document.createElement("canvas");
  faviconCanvas.width = 64;
  faviconCanvas.height = 64;
  faviconCtx = faviconCanvas.getContext("2d");

  faviconImg = new Image();
  faviconImg.crossOrigin = "anonymous";
  faviconImg.src = originalFaviconHref;

  if (!visibilityListenerAttached) {
    visibilityListenerAttached = true;
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
}

/**
 * When the user returns to the tab, clear all notifications.
 */
function handleVisibilityChange() {
  if (!document.hidden && notificationCount > 0) {
    clearTabNotification();
  }
}

/**
 * Draw the favicon with a red notification badge showing the count.
 */
function drawBadge(count) {
  if (!faviconCtx || !faviconCanvas) return;

  const size = faviconCanvas.width;
  faviconCtx.clearRect(0, 0, size, size);

  // Draw original favicon
  if (faviconImg && faviconImg.complete && faviconImg.naturalWidth > 0) {
    faviconCtx.drawImage(faviconImg, 0, 0, size, size);
  }

  if (count <= 0) return;

  const text = count > 99 ? "99+" : String(count);

  // Badge dimensions
  const badgeRadius = 14;
  const badgeX = size - badgeRadius - 1;
  const badgeY = badgeRadius + 1;

  // Draw red circle
  faviconCtx.beginPath();
  faviconCtx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
  faviconCtx.fillStyle = "#e53e3e";
  faviconCtx.fill();

  // White border
  faviconCtx.lineWidth = 2;
  faviconCtx.strokeStyle = "#ffffff";
  faviconCtx.stroke();

  // Draw count text
  faviconCtx.fillStyle = "#ffffff";
  faviconCtx.font = `bold ${count > 9 ? 14 : 18}px sans-serif`;
  faviconCtx.textAlign = "center";
  faviconCtx.textBaseline = "middle";
  faviconCtx.fillText(text, badgeX, badgeY + 1);
}

/**
 * Update the favicon element in the DOM.
 */
function applyFavicon(dataUrl) {
  /** @type {HTMLLinkElement|null} */
  let faviconEl = document.querySelector(FAVICON_SELECTOR);
  if (!faviconEl) {
    faviconEl = document.createElement("link");
    faviconEl.rel = "icon";
    document.head.appendChild(faviconEl);
  }
  faviconEl.href = dataUrl;
}

/**
 * Increment the tab notification count.
 * Only shows badge when the tab is not visible (user is on another tab).
 */
export function showTabNotification() {
  // Only notify when user is NOT looking at this tab
  if (!document.hidden) return;

  init();
  notificationCount += 1;

  // Start blinking title to grab attention
  startTitleBlink();

  // Draw and apply badge favicon
  const renderBadge = () => {
    drawBadge(notificationCount);
    applyFavicon(faviconCanvas.toDataURL("image/png"));
  };

  if (faviconImg && faviconImg.complete) {
    renderBadge();
  } else if (faviconImg) {
    faviconImg.onload = renderBadge;
  }
}

/**
 * Alternates the document title between notification message and a blank/attention string
 * to create a blinking effect that catches the user's eye (like WhatsApp Web / Facebook).
 */
function startTitleBlink() {
  if (titleBlinkInterval) clearInterval(titleBlinkInterval);

  let showNotification = true;
  const notificationTitle = `(${notificationCount}) New form awaiting input`;

  // Set immediately
  document.title = notificationTitle;

  titleBlinkInterval = setInterval(() => {
    if (showNotification) {
      document.title = ORIGINAL_TITLE.trim();
    } else {
      document.title = `(${notificationCount}) New form awaiting input`;
    }
    showNotification = !showNotification;
  }, 1000);
}

/**
 * Stop the title blink interval.
 */
function stopTitleBlink() {
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }
}

/**
 * Clear all tab notifications — restore original title and favicon.
 */
export function clearTabNotification() {
  notificationCount = 0;
  stopTitleBlink();
  document.title = ORIGINAL_TITLE;

  if (originalFaviconHref) {
    applyFavicon(originalFaviconHref);
  }
}

/**
 * Get the current notification count.
 */
export function getTabNotificationCount() {
  return notificationCount;
}
