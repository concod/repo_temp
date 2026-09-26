import {
  getContributionCells,
  getChannelDependantCells
} from "../cellRenderer.util";

describe("getPrimaryColAccessor", () => {
  const { getPrimaryColAccessor } = require("../cellRenderer.util");
  it("should return primary accessor when colAccessor ends with CHANNEL_CLASS_CONTRIBUTION", () => {
    const input = "202301_Retail_channel_contr";
    const expected = "202301_Retail";
    expect(getPrimaryColAccessor(input)).toBe(expected);
  });

  it("should return primary accessor when colAccessor ends with CLASS_CONTRIBUTION", () => {
    const input = "jan_Total_contr";
    const expected = "jan_Total";
    expect(getPrimaryColAccessor(input)).toBe(expected);
  });

  it("should return the same string when colAccessor does not end with either suffix", () => {
    const input = "202301_Retail";
    const expected = "202301_Retail";
    expect(getPrimaryColAccessor(input)).toBe(expected);
  });

  test("should return an empty string when colAccessor is an empty string", () => {
    const input = "";
    const expected = "";
    expect(getPrimaryColAccessor(input)).toBe(expected);
  });

  test("should return the same string when colAccessor does not contain the suffixes but ends with other text", () => {
    const input = "202301_Retail_othertext";
    const expected = "202301_Retail_othertext";
    expect(getPrimaryColAccessor(input)).toBe(expected);
  });
});

describe("getContributionCells", () => {
  it('should handle colAccessor with "Total" ending with CHANNEL_CLASS_CONTRIBUTION', () => {
    const colAccessor = "202301_Retail_channel_contr";
    const rowIndex = 1;

    const expected = {
      "202301_Retail_channel_contr": rowIndex,
      "202301_Retail": rowIndex,
      "202301_Retail_contr": rowIndex
    };

    expect(getContributionCells(colAccessor, rowIndex)).toEqual(expected);
  });

  it('should handle colAccessor with "Total" ending with CLASS_CONTRIBUTION', () => {
    const colAccessor = "example_contr_Total";
    const rowIndex = 2;

    const expected = {
      example_contr_Total: rowIndex,
      example_contr_Total_contr: rowIndex
    };

    expect(getContributionCells(colAccessor, rowIndex)).toEqual(expected);
  });

  it('should handle colAccessor without "Total" and ending with CHANNEL_CLASS_CONTRIBUTION', () => {
    const colAccessor = "202301_Retail_channel_contr";
    const rowIndex = 1;

    const expected = {
      "202301_Retail_channel_contr": rowIndex,
      "202301_Retail": rowIndex,
      "202301_Retail_contr": rowIndex
    };

    expect(getContributionCells(colAccessor, rowIndex)).toEqual(expected);
  });

  it('should handle colAccessor without "Total" and ending with CLASS_CONTRIBUTION', () => {
    const colAccessor = "202301_Retail_contr";
    const rowIndex = 1;

    const expected = {
      [colAccessor]: rowIndex,
      "202301_Retail_channel_contr": rowIndex,
      "202301_Retail": rowIndex
    };

    expect(getContributionCells(colAccessor, rowIndex)).toEqual(expected);
  });
});

describe("getChannelDependantCells", () => {
  const channelRollUpMapping = {
    "202301_Retail_channel_contr": ["202301_Retail"],
    "202301_Retail": ["202301"]
  };

  const channelRollDownMapping = {
    "202301": ["202301_Retail"],
    "202301_Retail": ["202301_Retail_channel_contr"],
    "202301_Retail_channel_contr": []
  };

  const updatedLockedCells = {
    "202301": [1],
    "202301_Retail": [1],
    "202301_Retail_channel_contr": [1]
  };

  it("should handle channel parent with all child channels locked", () => {
    const colAccessor = "202301_Retail";
    const rowIndex = 1;
    const expected = {
      "202301": rowIndex,
      [colAccessor]: rowIndex,
      "202301_Retail_channel_contr": rowIndex,
      "202301_Retail_contr": rowIndex,
      "202301_channel_contr": rowIndex,
      "202301_contr": rowIndex
    };

    expect(
      getChannelDependantCells(
        colAccessor,
        rowIndex,
        updatedLockedCells,
        channelRollUpMapping,
        channelRollDownMapping
      )
    ).toEqual(expected);
  });

  it("should handle channel parent with not all child channels locked", () => {
    const colAccessor = "202301_Retail";
    const rowIndex = 1;

    const updatedLockedCellsPartial = {
      "202301": [rowIndex],
      "202301_Retail": [rowIndex]
    };

    const expected = {
      "202301": rowIndex,
      "202301_Retail": rowIndex,
      "202301_Retail_channel_contr": rowIndex,
      "202301_Retail_contr": rowIndex,
      "202301_channel_contr": rowIndex,
      "202301_contr": rowIndex
    };

    expect(
      getChannelDependantCells(
        colAccessor,
        rowIndex,
        updatedLockedCellsPartial,
        channelRollUpMapping,
        channelRollDownMapping
      )
    ).toEqual(expected);
  });
});
