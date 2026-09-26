export const flattenSelectedSizeOptions = (options) => {
  const list = Array.isArray(options) ? options : options ? [options] : [];
  return list.flatMap((option) => {
    if (Array.isArray(option?.options)) return option.options;
    if (option?.value || option?.id) return [option];
    return [];
  });
};
