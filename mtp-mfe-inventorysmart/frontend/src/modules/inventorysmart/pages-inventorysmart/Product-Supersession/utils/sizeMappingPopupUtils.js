export const sizesMatch = (left, right) =>
  left != null && right != null && String(left) === String(right);

export const toSizeOption = (size) => ({ label: size, value: size });

export const isNullCode = (code) =>
  code == null || code === "null" || code === "";

export const buildNewStyleSizeOptions = (sizes = []) => {
  const seen = new Set();
  return sizes.reduce((options, size) => {
    if (size == null || size === "") return options;
    const key = String(size);
    if (seen.has(key)) return options;
    seen.add(key);
    options.push(toSizeOption(size));
    return options;
  }, []);
};

export const getSelectedOption = (selection) => {
  if (!selection) return null;
  if (Array.isArray(selection)) return selection[0] || null;
  return selection;
};

export const findNewSizeForOldSku = ({
  oldProductCode,
  oldSize,
  newAllSizes = [],
  mappedOldCodes = [],
  mappedNewSizes = [],
}) => {
  const mappedIndex = mappedOldCodes.findIndex((code) =>
    sizesMatch(code, oldProductCode)
  );
  if (mappedIndex > -1 && !isNullCode(mappedNewSizes[mappedIndex])) {
    return mappedNewSizes[mappedIndex];
  }
  return newAllSizes.find((size) => sizesMatch(size, oldSize)) || null;
};

export const getNewMetaForSize = (newSize, ref) => {
  const index = (ref?.new_all_sizes || []).findIndex(
    (size, i) =>
      sizesMatch(size, newSize) && !isNullCode(ref?.new_all_product_codes?.[i])
  );
  if (index < 0) {
    return { productCode: null, sizeName: "" };
  }
  return {
    productCode: ref.new_all_product_codes?.[index] ?? null,
    sizeName: ref.new_all_sizes_name?.[index] ?? "",
  };
};

export const areAllOldSizesMapped = (ref) => {
  const oldProductCodes = (ref?.old_all_product_codes || []).filter(
    (code) => !isNullCode(code)
  );
  return (
    oldProductCodes.length > 0 &&
    oldProductCodes.every(
      (oldProductCode) =>
        !isNullCode(ref?.product_mappings?.[oldProductCode]) &&
        !isNullCode(ref?.size_mappings?.[oldProductCode])
    )
  );
};
