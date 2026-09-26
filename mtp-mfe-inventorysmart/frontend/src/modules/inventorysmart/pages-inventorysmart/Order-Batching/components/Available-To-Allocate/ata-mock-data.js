/**
 * ATA Exceedance Check - Mock Response Data
 * Based on the API contract in ob_ata_exceedance_gate_92d618cd.plan.md
 */

const generateViolationRow = (index, styleColorId, packId, source, allocatedQty, ata) => {
  const excessQty = allocatedQty - ata;
  const planSuffixes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const codeCount = 2 + (index % 11);
  const codes = planSuffixes
    .slice(0, codeCount)
    .map((s) => `6_51_Women_20260731T010307_${s}`);

  return {
    violation_key: {
      article: styleColorId,
      pack_type_id: packId.split(" / ")[0],
      dc_code: source === "PO" ? `PO-${88421 + index}` : `DC-${10100 + index}`,
    },
    style_color_id: styleColorId,
    pack_type_id: packId,
    sizes: [packId.split(" / ")[1]],
    source,
    source_code: source === "PO" ? `PO-${88421 + index}` : `DC-${10100 + index}`,
    allocated_qty: allocatedQty,
    ata,
    excess_qty: excessQty > 0 ? excessQty : 0,
    new_allocated_qty: null,
    resolved: false,
    allocation_codes: codes,
  };
};

const generateAllocationPlanRow = (index, planCode, planName, violationsRemaining, styleColorsAffected) => ({
  allocation_code: planCode,
  allocation_name: planName,
  status: "breached",
  violations_remaining: violationsRemaining,
  style_colors_affected: styleColorsAffected,
  review_action: "Review recommendation >",
});

export const ATA_MOCK_RESPONSE = {
  status: true,
  message: "ATA exceedances found",
  data: {
    has_violations: true,
    counts: { violations: 20, allocation_plans: 8 },
    violations: [
      generateViolationRow(0, "982512", "PK-3104734M / M", "PO", 1600, 1290),
      generateViolationRow(1, "982512", "PK-2201156M / L", "DC", 840, 640),
      generateViolationRow(2, "982512", "PK-2201156M / L", "DC", 1490, 1290),
      generateViolationRow(3, "982512", "PK-2201156M / L", "DC", 780, 640),
      generateViolationRow(4, "982512", "PK-2201156M / L", "DC", 920, 640),
      generateViolationRow(5, "982512", "PK-2201156M / L", "DC", 750, 640),
      generateViolationRow(6, "983201", "PK-4401289M / S", "PO", 2100, 1800),
      generateViolationRow(7, "983201", "PK-4401289M / M", "DC", 950, 800),
      generateViolationRow(8, "983455", "PK-5501122M / L", "PO", 1800, 1500),
      generateViolationRow(9, "983455", "PK-5501122M / XL", "DC", 720, 600),
      generateViolationRow(10, "984102", "PK-6601890M / S", "PO", 3200, 2900),
      generateViolationRow(11, "984102", "PK-6601890M / M", "DC", 1100, 950),
      generateViolationRow(12, "984567", "PK-7701456M / L", "PO", 1450, 1200),
      generateViolationRow(13, "984567", "PK-7701456M / XL", "DC", 880, 700),
      generateViolationRow(14, "985234", "PK-8801234M / S", "PO", 2400, 2100),
      generateViolationRow(15, "985234", "PK-8801234M / M", "DC", 560, 450),
      generateViolationRow(16, "985890", "PK-9901567M / L", "PO", 1900, 1600),
      generateViolationRow(17, "985890", "PK-9901567M / XL", "DC", 1050, 900),
      generateViolationRow(18, "986123", "PK-1102345M / S", "PO", 2700, 2400),
      generateViolationRow(19, "986123", "PK-1102345M / M", "DC", 780, 650),
    ],
    allocation_plans: [
      generateAllocationPlanRow(0, "6_51_Women_20260301_A", "AP-2291", 2, 2),
      generateAllocationPlanRow(1, "6_51_Women_20260301_B", "AP-2291", 2, 2),
      generateAllocationPlanRow(2, "6_51_Women_20260301_C", "AP-2291", 2, 2),
      generateAllocationPlanRow(3, "6_51_Women_20260301_D", "AP-2291", 3, 2),
      generateAllocationPlanRow(4, "6_51_Women_20260301_E", "AP-2291", 2, 2),
      generateAllocationPlanRow(5, "6_51_Women_20260301_F", "AP-2291", 2, 2),
      generateAllocationPlanRow(6, "6_51_Women_20260401_A", "AP-3340", 1, 3),
      generateAllocationPlanRow(7, "6_51_Women_20260401_B", "AP-3340", 2, 1),
    ],
  },
};

export const ATA_CLEAN_RESPONSE = {
  status: true,
  message: "No ATA exceedances",
  data: {
    has_violations: false,
    violations: [],
    allocation_plans: [],
    counts: { violations: 0, allocation_plans: 0 },
  },
};
