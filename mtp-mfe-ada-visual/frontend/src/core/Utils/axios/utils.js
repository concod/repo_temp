export const buildValidUrl = (baseUrl, requestUrl, params = {}) => {
  if (!baseUrl || !requestUrl) {
    throw new Error("baseUrl and requestUrl are required");
  }
  let queryParamString = '';
  for (const key in params) {
    const value = params[key];
    if (value != null) {
      queryParamString += queryParamString ? `&${key}=${value}` : `?${key}=${value}`;
    }
  }
  const tenatsBaseUrl = baseUrl.replace(window.location.origin, `https://${localStorage.getItem("baseUrl")}`)
  const fullUrl = `${tenatsBaseUrl}/${requestUrl.replace(/^\/+/, "")}${queryParamString}`;
  try {
    new URL(fullUrl);
    return fullUrl;
  } catch {
    console.error("Invalid URL:", fullUrl);
    return null;
  }
};
