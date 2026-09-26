// Fly-to-tab animation for the "Rule group created" banner: the banner shrinks
// and glides toward the "Rule Groups" tab to cue the user where the created
// group now lives. Split into small helpers so each step is easy to tweak.

const FLY_DURATION_MS = 800;
const FLY_TRANSITION = `transform ${FLY_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${FLY_DURATION_MS}ms ease-out`;
const FLY_END_SCALE = 0.12;

// Center-to-center distance from the banner to the "Rule Groups" tab. Falls back
// to no movement (shrink in place) if the tab can't be found.
const getVectorToRuleGroupsTab = (bannerRect) => {
  const ruleGroupsTab = [...document.querySelectorAll('[role="tab"]')].find(
    (tab) => tab.textContent && tab.textContent.includes("Rule Groups")
  );
  if (!ruleGroupsTab) return { dx: 0, dy: 0 };

  const tabRect = ruleGroupsTab.getBoundingClientRect();
  return {
    dx: tabRect.left + tabRect.width / 2 - (bannerRect.left + bannerRect.width / 2),
    dy: tabRect.top + tabRect.height / 2 - (bannerRect.top + bannerRect.height / 2),
  };
};

// Pins the banner to the viewport at its current spot so it can travel across
// the layout without being clipped by ancestor overflow.
const pinToViewport = (wrap, rect) => {
  wrap.style.position = "fixed";
  wrap.style.top = `${rect.top}px`;
  wrap.style.left = `${rect.left}px`;
  wrap.style.width = `${rect.width}px`;
  wrap.style.margin = "0";
  wrap.style.zIndex = "2000";
  wrap.style.transformOrigin = "center center";
};

// Resolves once the opacity transition finishes.
const runFadeAndTravel = (wrap, { dx, dy }) =>
  new Promise((resolve) => {
    const handleEnd = (event) => {
      if (event.propertyName !== "opacity") return;
      wrap.removeEventListener("transitionend", handleEnd);
      resolve();
    };
    wrap.addEventListener("transitionend", handleEnd);

    wrap.style.transition = FLY_TRANSITION;
    // Defer so the browser paints the pinned start position before transitioning.
    requestAnimationFrame(() => {
      wrap.style.transform = `translate(${dx}px, ${dy}px) scale(${FLY_END_SCALE})`;
      wrap.style.opacity = "0";
    });
  });

export const flyRuleGroupBannerToTab = (wrap, onComplete) => {
  if (!wrap) {
    onComplete && onComplete();
    return;
  }

  const bannerRect = wrap.getBoundingClientRect();
  const vector = getVectorToRuleGroupsTab(bannerRect);

  pinToViewport(wrap, bannerRect);
  runFadeAndTravel(wrap, vector).then(() => onComplete && onComplete());
};
