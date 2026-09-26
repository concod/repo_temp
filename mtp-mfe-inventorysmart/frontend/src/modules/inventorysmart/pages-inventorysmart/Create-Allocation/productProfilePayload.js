// MTP-148305 follow-up. An article with no mapped product profile renders with
// product_profiles = [] (or undefined). The old inline code called
// getValue(row?.product_profiles, "string"), which returned undefined, and
// JSON.stringify then DROPPED the key -> backend 422 (field required).
// getPPType() separately defaulted the type to "user-defined", routing the
// request to the branch that has no dynamic_ia_profile fallback.
//
// This module is deliberately import-free so it can be unit-tested without
// pulling in the redux store that helperFunctions.js imports.
export const NO_PROFILE_CODE = -1;

export const resolveProductProfile = (productProfiles) => {
  // Read the code and the label off the SAME entry. The old getValue() took
  // mapped[0] strictly, so scanning for the first non-null across entries would
  // pair one profile's code with another's type.
  const entry = Array.isArray(productProfiles)
    ? productProfiles[0]
    : productProfiles;
  const code = Array.isArray(productProfiles)
    ? entry?.valueArray || entry?.value
    : entry?.value ?? entry;

  if (code === undefined || code === null) {
    return { product_profile_code: NO_PROFILE_CODE, product_profile_type: "IA" };
  }
  return {
    product_profile_code: code,
    product_profile_type: entry?.label === "IA Recommended" ? "IA" : "user-defined",
  };
};
