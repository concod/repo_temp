import moment from "moment";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

// Safe date format validation to prevent corrupted display format
export const getSafeDisplayFormat = () => {
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const fallbackFormat = "MM-DD-YYYY";
  try {
    const validFormatPattern = /^[DMYHmsaA\-\/\.\s:]+$/; // Valid moment.js format characters

    // Check if tenantDateFormat exists and is a valid string
    if (
      tenantDateFormat &&
      typeof tenantDateFormat === "string" &&
      tenantDateFormat.length > 0 &&
      tenantDateFormat.length < 20 && // Reasonable length check
      validFormatPattern.test(tenantDateFormat)
    ) {
      // Test the format with a known date to ensure it doesn't produce garbage
      try {
        const testDate = moment("2023-01-01");
        const testFormatted = testDate.format(tenantDateFormat);

        // If the formatted result contains unexpected characters, use fallback
        if (
          testFormatted &&
          !testFormatted.includes("ricpm") &&
          !testFormatted.includes("PM00")
        ) {
          return tenantDateFormat;
        }
      } catch (error) {
        console.warn(
          "Invalid tenant date format detected, using fallback:",
          tenantDateFormat
        );
        return fallbackFormat;
      }
    }

    return fallbackFormat;
  } catch (error) {
    console.error("getSafeDisplayFormat error:", error);
    return fallbackFormat;
  }
};