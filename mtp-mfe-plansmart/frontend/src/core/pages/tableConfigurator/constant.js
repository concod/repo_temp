export const staticTableForm = [
  {
    form: [
      {
        accessor: "nameForm",
        default_value: null,
        field_type: "TextField",
        label: "Name of the table",
        required: false,
        options: [],
        isMulti: false,
        isSearchable: false,
        isClearable: false,
      },
    ],
    hasExtraChips: false,
    hasDivider: true,
    formAccessor: "nameForm",
  },
  {
    form: [
      {
        accessor: "renameHeadersOptionForm",
        field_type: "BooleanField",
        label: "Do you want to rename the table headers in configurations?",
        autoSize: true,
        required: false,
        options: [],
        isMulti: false,
        value: true,
      },
    ],
    hasExtraChips: false,
    hasDivider: true,
    formAccessor: "renameHeadersOptionForm",
  },
  // {
  //   form: [
  //     {
  //       accessor: "enableTableDownload",
  //       field_type: "BooleanField",
  //       label: "Do you want to enable table download for this table?",
  //       required: false,
  //       options: [],
  //       value: true,
  //     },
  //   ],
  //   hasExtraChips: false,
  //   hasDivider: true,
  //   formAccessor: "enableTableDownload",
  // },
  {
    form: [
      {
        accessor: "selectSources",
        field_type: "dropdown",
        label: "Column Sources",
        autoSize: true,
        required: true,
        options: [],
        isMulti: true,
        isSearchable: true,
        isClearable: true,
      },
    ],
    hasExtraChips: true,
    hasDivider: false,
    formAccessor: "selectSources",
    showChips: true,
  },
];

export const SEARCHABLE_TYPES = ["text", "date", "number", "list"];