/**
 * Function to handle redirection based on a redirect URL stored in sessionStorage. The redirect url is used 
 * in case of redirect via email for cell comments
 * @param {function} navigate - The navigation function to navigate to the app route
 */
export const handleRedirection = (navigate) => {
  const redirectUrl = sessionStorage.getItem("redirectUrl")
  const redirectInfo = redirectUrl.replace(window.location.origin, "")
  const appRoute = redirectInfo.slice(1, redirectInfo.indexOf("/redirect"))
  const redirectEventInfo = redirectInfo.replace(`/${appRoute}/redirect/`, "")
  sessionStorage.setItem("redirectionInfo", redirectEventInfo)
  sessionStorage.removeItem("redirectUrl")
  navigate(appRoute)
}

/**
 * Function to remove query parameters from a URL
 * @param {string} url - The URL from which to remove query parameters
 * @returns {string} - The URL without query parameters
 */
export const stripQuery = (url) => {
  if (!url) return url;
  const idx = url.indexOf("?");
  return idx !== -1 ? url.substring(0, idx) : url;
};