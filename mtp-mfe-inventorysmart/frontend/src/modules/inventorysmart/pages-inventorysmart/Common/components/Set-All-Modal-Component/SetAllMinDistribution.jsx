import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Select } from "impact-ui-v3";
import { STYLE_OPTIONS, SIZE_OPTIONS } from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/min-distribution/constants";
import { flattenSelectedSizeOptions } from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/min-distribution/sizeSelectHelpers";
import {
  DEFAULT_MIN_DIST_STATE,
  buildRclSizesPayload,
  fetchRclConstraintSizesCached,
  findSelectOption,
  resolveSelectOption,
  toSelectOptions,
  validateMinDistState,
} from "./setAllMinDistributionUtils";
import { useSetAllMinDistributionStyles } from "./setAllMinDistributionStyles";

const noopSetOptions = () => {};
const STYLE_SELECT_OPTIONS = toSelectOptions(STYLE_OPTIONS);
const SIZE_SELECT_OPTIONS = toSelectOptions(SIZE_OPTIONS);

export const SetAllMinDistribution = ({
  value = DEFAULT_MIN_DIST_STATE,
  onChange,
  sizeApiProps,
  minStock,
  enableSizesFetch = true,
  variant = "setAll",
}) => {
  const classes = useSetAllMinDistributionStyles();
  const isPartial = variant === "partialSetAll";
  const blockClass = isPartial ? classes.blockPartial : classes.blockSetAll;

  const [styleOpen, setStyleOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [currentSizeOptions, setCurrentSizeOptions] = useState([]);
  const [sizeSelectAll, setSizeSelectAll] = useState(false);
  const sizesFetchIdRef = useRef(0);

  const showStyleUnits = value.styleType === "x_units_per_article";
  const showSizeFields = value.sizeType === "x_units_per_size";

  const ruleCodesKey = useMemo(
    () =>
      (sizeApiProps?.selectedPlan || [])
        .map((row) => row?.rule_code)
        .join(","),
    [sizeApiProps?.selectedPlan]
  );
  const sizesPayloadKey = useMemo(
    () => JSON.stringify(buildRclSizesPayload(sizeApiProps || {})),
    [
      sizeApiProps?.rulesTableName,
      sizeApiProps?.localstoreKeyTableName,
      ruleCodesKey,
    ]
  );

  const validation = useMemo(
    () => validateMinDistState(value, minStock),
    [value, minStock]
  );

  useEffect(() => {
    if (!showSizeFields || !enableSizesFetch) return undefined;
    const payload = JSON.parse(sizesPayloadKey);
    if (!payload.rule_list?.length) return undefined;

    const fetchId = ++sizesFetchIdRef.current;
    let cancelled = false;

    fetchRclConstraintSizesCached(payload)
      .then((options) => {
        if (cancelled || fetchId !== sizesFetchIdRef.current) return;
        setSizeOptions(options);
        setCurrentSizeOptions(options);
      })
      .catch(() => {
        if (cancelled || fetchId !== sizesFetchIdRef.current) return;
        setSizeOptions([]);
        setCurrentSizeOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [showSizeFields, enableSizesFetch, sizesPayloadKey]);

  useEffect(() => {
    setCurrentSizeOptions(sizeOptions);
  }, [sizeOptions]);

  const flatSizes = useMemo(
    () => flattenSelectedSizeOptions(sizeOptions),
    [sizeOptions]
  );

  useEffect(() => {
    setSizeSelectAll(
      flatSizes.length > 0 &&
        (value.selectedSizeOptions || []).length === flatSizes.length
    );
  }, [value.selectedSizeOptions, flatSizes]);

  const patch = (next) => onChange({ ...value, ...next });

  const handleSizeSearch = (searchTerm) => {
    const query = String(
      searchTerm?.target?.value ?? searchTerm ?? ""
    ).toLowerCase();
    if (!query.trim()) {
      setCurrentSizeOptions(sizeOptions);
      return;
    }
    setCurrentSizeOptions(
      sizeOptions
        .map((group) => ({
          ...group,
          options: (group.options || []).filter((o) =>
            String(o.label).toLowerCase().includes(query)
          ),
        }))
        .filter((g) => g.options.length)
    );
  };

  const updateSelectedSizes = (next) => {
    patch({
      selectedSizeOptions: flattenSelectedSizeOptions(
        typeof next === "function" ? next(value.selectedSizeOptions || []) : next
      ),
    });
  };

  const showStyleUnitsError =
    showStyleUnits && validation.errors.styleUnits;
  const showSizeUnitsError = showSizeFields && validation.errors.sizeUnits;
  const showSizesError = showSizeFields && validation.errors.sizes;

  const renderStyleSection = () => (
    <div className={blockClass}>
      <div className={classes.row}>
        <div className={classes.selectCol}>
          <p className={classes.label}>Min Dist by Style Color ID</p>
          <Select
            placeholder="Select"
            isClearable={false}
            isMulti={false}
            isOpen={styleOpen}
            setIsOpen={setStyleOpen}
            currentOptions={STYLE_SELECT_OPTIONS}
            initialOptions={STYLE_SELECT_OPTIONS}
            selectedOptions={
              findSelectOption(STYLE_SELECT_OPTIONS, value.styleType) || []
            }
            setSelectedOptions={noopSetOptions}
            setCurrentOptions={noopSetOptions}
            handleChange={(option) => {
              const selected = resolveSelectOption(option);
              patch({
                styleType: selected?.value || "same_min",
                styleUnits:
                  selected?.value === "x_units_per_article"
                    ? value.styleUnits
                    : "",
              });
              setStyleOpen(false);
            }}
            withPortal={true}
            width="100%"
          />
        </div>
        {showStyleUnits && (
          <div className={classes.unitsGroup}>
            <div className={classes.unitsCol}>
              <p className={classes.label}>Min Units</p>
              <Input
                type="number"
                value={value.styleUnits ?? ""}
                onChange={(e) => patch({ styleUnits: e.target.value })}
                isError={showStyleUnitsError}
                helperText={
                  showStyleUnitsError ? validation.errors.styleUnitsHelper : ""
                }
                isHelperText={Boolean(
                  showStyleUnitsError && validation.errors.styleUnitsHelper
                )}
                inputProps={{ min: 1, step: 1 }}
              />
            </div>
            <p className={classes.hint}>min per style-color ID</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSizeSection = () => (
    <div className={blockClass}>
      <div className={classes.sizeSection}>
        <div className={classes.row}>
          <div className={classes.selectCol}>
            <p className={classes.label}>Min Dist by Size</p>
            <Select
              placeholder="Select"
              isClearable={false}
              isMulti={false}
              isOpen={sizeOpen}
              setIsOpen={setSizeOpen}
              currentOptions={SIZE_SELECT_OPTIONS}
              initialOptions={SIZE_SELECT_OPTIONS}
              selectedOptions={
                findSelectOption(SIZE_SELECT_OPTIONS, value.sizeType) || []
              }
              setSelectedOptions={noopSetOptions}
              setCurrentOptions={noopSetOptions}
              handleChange={(option) => {
                const selected = resolveSelectOption(option);
                patch({
                  sizeType: selected?.value || "same_min",
                  sizeUnits:
                    selected?.value === "x_units_per_size"
                      ? value.sizeUnits
                      : "",
                  selectedSizeOptions:
                    selected?.value === "x_units_per_size"
                      ? value.selectedSizeOptions || []
                      : [],
                });
                setSizeOpen(false);
              }}
              withPortal={true}
              width="100%"
            />
          </div>
          {showSizeFields && (
            <div className={classes.unitsGroup}>
              <div className={classes.unitsCol}>
                <p className={classes.label}>Min Units</p>
                <Input
                  type="number"
                  value={value.sizeUnits ?? ""}
                  onChange={(e) => patch({ sizeUnits: e.target.value })}
                  isError={showSizeUnitsError}
                  helperText={
                    showSizeUnitsError ? validation.errors.sizeUnitsHelper : ""
                  }
                  isHelperText={Boolean(
                    showSizeUnitsError && validation.errors.sizeUnitsHelper
                  )}
                  inputProps={{ min: 1, step: 1 }}
                />
              </div>
              <p className={classes.hint}>min per size</p>
            </div>
          )}
        </div>
        {showSizeFields && (
          <div
            className={`${classes.sizesCol} ${
              sizesOpen ? classes.sizesColOpen : ""
            }`}
          >
            <p className={classes.label}>Sizes</p>
            <Select
              isMulti={true}
              isGrouped={true}
              isClearable={true}
              isWithSearch={true}
              onSearch={handleSizeSearch}
              isCloseWhenClickOutside={true}
              withPortal={false}
              menuPlacement="bottom"
              menuShouldBlockScroll={false}
              toggleSelectAll={true}
              isSelectAll={sizeSelectAll}
              setIsSelectAll={setSizeSelectAll}
              labelOrientation="top"
              placeholder="Select"
              searchPlaceholder="Search Here..."
              dropDownPortalClassName={classes.sizeSelectDropdown}
              isOpen={sizesOpen}
              setIsOpen={setSizesOpen}
              currentOptions={currentSizeOptions}
              initialOptions={sizeOptions}
              selectedOptions={value.selectedSizeOptions || []}
              setSelectedOptions={updateSelectedSizes}
              setCurrentOptions={setCurrentSizeOptions}
              handleChange={updateSelectedSizes}
              isError={showSizesError}
              width="100%"
              minWidth="160px"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={isPartial ? classes.rootPartial : classes.rootSetAll}>
      {renderStyleSection()}
      {renderSizeSection()}
    </div>
  );
};
