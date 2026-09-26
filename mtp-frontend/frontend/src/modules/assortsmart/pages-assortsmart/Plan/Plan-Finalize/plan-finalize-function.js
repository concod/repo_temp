import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep, isEmpty, max, uniqBy } from "lodash";
import {
  addDropToPayload,
  attributeFormatter,
  getDefaultChannelValue,
  getPlanPayload,
  isDropPlan,
  isEcomPlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import moment from "moment";

export const displaySnackMessage = (msg, type, props) => {
  props.set2_4_Loader(false);
  props.addSnack({
    message: msg,
    options: {
      variant: type,
    },
  });
};

export const generateDropDownOptions = (dropDownValues) => {
  return (
    dropDownValues?.length &&
    dropDownValues.map((obj) => {
      return {
        value: (obj),
        label: obj === "-" ? "ALL" : attributeFormatter(replaceSpecialCharacter(obj)),
        id: (obj),
      };
    })
  );
};

export const getTotalFooter = (formattedClusterGradeData) => {
  let total_receipt_units_ly = 0,
    total_receipt_units_ty = 0,
    total_receipts_ly = 0,
    total_receipts_ty = 0,
    total_aps_ly = 0,
    total_aps_ty = 0,
    total_avg_depth_ly = 0,
    total_avg_depth_ty = 0,
    total_choice_count_ly = 0,
    total_choice_count_ty = 0,
    total_st_ly = 0,
    total_st_ty = 0,
    total_penetration_ly = 0,
    total_penetration_ty = 0,
    total_receipt$_ly = 0,
    total_receipt$_ty = 0;
  let attributeName = formattedClusterGradeData?.[0]?.attribute_name || "-";
  formattedClusterGradeData.forEach((item) => {
    total_receipt_units_ly += parseInt(item.receipt_units_ly) || 0;
    total_receipt_units_ty += parseInt(item.receipt_units_ty) || 0;
    total_receipts_ly +=
      parseInt(item.receipts_ly) || parseInt(item.receipt_units_ly) || 0;
    total_receipts_ty +=
      parseInt(item.receipts_ty) || parseInt(item.receipt_units_ty) || 0;
    total_aps_ly += parseFloat(item.aps_ly * item.receipt_units_ly) || 0;
    total_aps_ty += parseFloat(item.aps_ty * item.receipt_units_ty) || 0;
    total_avg_depth_ly +=
      parseFloat(item.avg_depth_ly * item.receipt_units_ly) || 0;
    total_avg_depth_ty +=
      parseFloat(item.avg_depth_ty * item.receipt_units_ty) || 0;
    if (attributeName === item.attribute_name) {
      total_choice_count_ly +=
        parseInt(item.choice_count_ly) || parseInt(item.cc_ly) || 0;
      total_choice_count_ty +=
        parseInt(item.choice_count_ty) || parseInt(item.cc_ty) || 0;
      total_receipt$_ly += parseFloat(item.receipt$_ly) || 0;
      total_receipt$_ty += parseFloat(item.receipt$_ty) || 0;
    }
    total_st_ly += parseFloat(item.st_ly * item.receipt_units_ly) || 0;
    total_st_ty += parseFloat(item.st_ty * item.receipt_units_ty) || 0;
    total_penetration_ly += parseFloat(item.pen_ly) || 0;
    total_penetration_ty += parseFloat(item.pen_ty) || 0;
  });
  formattedClusterGradeData.push({
    l3_name: "Total",
    attribute_name: "Total",
    receipt_units_ly: total_receipt_units_ly,
    receipt_units_ty: total_receipt_units_ty,
    receipts_ly: total_receipts_ly,
    receipts_ty: total_receipts_ty,
    aps_ly: total_receipt_units_ly ? total_aps_ly / total_receipt_units_ly : 0,
    aps_ty: total_receipt_units_ty ? total_aps_ty / total_receipt_units_ty : 0,
    aur_ly: total_receipt_units_ly
      ? total_receipts_ly / total_receipt_units_ly
      : 0,
    aur_ty: total_receipt_units_ty
      ? total_receipts_ty / total_receipt_units_ty
      : 0,
    avg_depth_ly: total_receipt_units_ly
      ? total_avg_depth_ly / total_receipt_units_ly
      : 0,
    avg_depth_ty: total_receipt_units_ty
      ? total_avg_depth_ty / total_receipt_units_ly
      : 0,
    choice_count_ly: total_choice_count_ly,
    choice_count_ty: total_choice_count_ty,
    st_ly: total_receipt_units_ly ? total_st_ly / total_receipt_units_ly : 0,
    st_ty: total_receipt_units_ty ? total_st_ty / total_receipt_units_ty : 0,
    cc_ly: total_choice_count_ly,
    cc_ty: total_choice_count_ty,
    pen_ly: total_penetration_ly,
    pen_ty: total_penetration_ty,
    receipt$_ly: total_receipt$_ly,
    receipt$_ty: total_receipt$_ty,
  });
};

export const getOptimizeReviewSizePayload = (props) => {
  let startDate = moment(props.planDetails.selling_period_sdate).format(
    "YYYY-MM-DD"
  );
  let endDate = moment(props.planDetails.selling_period_edate).format(
    "YYYY-MM-DD"
  );

  let planData = cloneDeep(props.planDetails);
  let payload = getPlanPayload(planData, props.planLevels);
  payload.filters.push(
    {
      attribute_name: "date",
      operator: "between",
      value: [`'${startDate}' and '${endDate}'`],
    },
    {
      attribute_name: "store_type",
      operator: "in",
      value: props.planDetails?.channel,
    },
    {
      attribute_name: "channel",
      prefix: "levels",
      operator: "in",
      value: props.planDetails?.channel,
    },
    {
      attribute_name: "sub_channel",
      operator: "in",
      value: props.planDetails?.sub_channel || props.planDetails?.channel,
      prefix: "levels",
    }
  );
  payload = addDropToPayload(
    props.planDetails,
    payload,
    props.screenConfiguration?.common?.drop_key
  );
  payload = {
    ...payload,
    compare_type: props.planDetails.compare_year,
    run_size_curve_flag: true,
    compare_season: props.planDetails?.compare_season || "",
  };
  if (props.planDetails?.data_pull_source) {
    payload.data_pull_source = props.planDetails?.data_pull_source;
  }
  return payload;
};

export const getFinalizeDownloadHeaderData = (sizeColumns, props) => {
  const sizeAtrributes = [];
  const sizeHeaders = uniqBy(sizeColumns); //Getting unique values of the size keys
  sizeHeaders &&
    sizeHeaders.map((col) => {
      let tempAttr = col; // generating attributes for each size
      sizeAtrributes.push(tempAttr);
      return null;
    });

  let list = sizeAtrributes.map((item) => {
    //In size label only alphabets, "-" and "/" are allowed
    let allowedSpecialcharacter = /[-/]/g;
    var alphabets = /[a-zA-Z]/g;
    return {
      label:
        !item.toString().match(alphabets) && item.match(allowedSpecialcharacter)
          ? "'" + item
          : item,
      key: item.replace(".", ""),
    };
  });

  let poSheetHeadersValue = [
    { label: "Choice", key: "choice_name" },
    { label: "Total Buy Units", key: "Quantity" },
    { label: "Cost", key: "cost" },
    { label: "#Style", key: "style" },
    { label: "Article Number", key: "article_number" },
    { label: "Style Desc", key: "style_name" },
  ];
  Object.keys(props.levelsJson).forEach((level) => {
    poSheetHeadersValue.push({ label: props.levelsJson[level], key: level });
  });
  poSheetHeadersValue.push(
    {
      label: attributeFormatter(
        props.screenConfiguration?.common?.drop_key || "drop"
      ),
      key: props.screenConfiguration?.common?.drop_key || "drop",
    },
    ...list
  );
  return poSheetHeadersValue;
};

export const getFormattedClusterGradeData = (props) => {
  let reviewByClusterGradeResponseData =
    props.reviewByAttributeGrade?.data?.data;
  const formattedClusterGradeData = [];
  reviewByClusterGradeResponseData.length &&
    reviewByClusterGradeResponseData.map((value) => {
      const attributeItem = {};
      attributeItem.plan_finalize_grade_id = value.plan_finalize_grade_id;
      attributeItem.l0_name = value.l0_name;
      attributeItem.l1_name = value.l1_name;
      attributeItem.l2_name = replaceSpecialCharacter(value.l2_name);
      attributeItem.l3_name = replaceSpecialCharacter(value.l3_name);
      attributeItem.receipts_ly = value?.attributes?.receipt$?.ly;
      attributeItem.receipts_ty = value?.attributes?.receipt$?.ty;
      attributeItem.receipt_units_ly = value?.attributes?.receipt_units.ly;
      attributeItem.receipt_units_ty = value?.attributes?.receipt_units.ty;
      attributeItem.choice_count_ly = value?.attributes?.cc.ly;
      attributeItem.choice_count_ty = value?.attributes?.cc.ty;
      attributeItem.avg_depth_ly = value?.attributes?.avg_depth.ly;
      attributeItem.avg_depth_ty = value?.attributes?.avg_depth.ty;
      attributeItem.aps_ly = value?.attributes?.aps_grade.ly;
      attributeItem.aps_ty = value?.attributes?.aps_grade.ty;
      attributeItem.st_ly = value?.attributes?.st_grade.ly;
      attributeItem.st_ty = value?.attributes?.st_grade.ty;
      attributeItem.aur_ly =
        value?.attributes?.rppu_grade?.ly || value?.attributes?.aur_grade?.ly;
      attributeItem.aur_ty =
        value?.attributes?.rppu_grade?.ty || value?.attributes?.aur_grade?.ty;
      attributeItem.uniqueID =
        value?.l3_name +
        value[props.screenConfiguration?.common?.drop_key || "drop"] +
        value?.l2_name +
        value?.plan_finalize_grade_id;
      formattedClusterGradeData.push(attributeItem);
      return attributeItem;
    });
  return formattedClusterGradeData;
};

export const getReviewByClusterGradeDataPayload = (formData, props) => {
  let planData = cloneDeep(props.planDetails);
  planData.l1_name = Array.isArray(formData.l1_name_list)
    ? formData.l1_name_list
    : [formData.l1_name_list];
  planData.l2_name = Array.isArray(formData.l2_name_list)
    ? formData.l2_name_list
    : [formData.l2_name_list];
  let payload = getPlanPayload(planData, props.planLevels);
  payload.filters.push({
    attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
    prefix: "levels",
    operator: "in",
    value: [formData.attribute_list],
  });
  payload.filters.push({
    attribute_name: props.screenConfiguration?.common?.flow_key || "flow",
    prefix: "levels",
    operator: "in",
    value: Array.isArray(
      formData[`${props.screenConfiguration?.common?.flow_key || "flow"}_list`]
    )
      ? formData[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]
      : [
          formData[
            `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
          ],
        ],
  });
  payload.filters.push({
    attribute_name: "channel",
    prefix: "levels",
    operator: "in",
    value: Array.isArray(formData.channel_list)
      ? formData.channel_list
      : [formData.channel_list],
  });
  if (!isEcomPlan(props.planDetails)) {
    payload.filters.push({
      attribute_name: "cluster_grade",
      prefix: "levels",
      operator: "in",
      value: Array.isArray(formData.grade_list)
        ? formData.grade_list
        : [formData.grade_list],
    });
  }
  if(props.screenConfiguration?.common?.final_level === "l2_name"){
    payload.filters.push({
      attribute_name: "l2_name",
      prefix: "levels",
      operator: "in",
      value: planData.l2_name,
    });
  }
  payload.optimization_level =
    props.screenConfiguration?.common?.final_level || "l3_name";
  return payload;
};

export const fetchGradeListBasedOnChannel = (channel, props) => {
  let grade_list =
    props.finalisePlanMetricsData?.[0]?.l1FilterValue?.[0]?.grade_list;
  const grades = [];
  if (Array.isArray(channel)) {
    channel.forEach((chan) => {
      grade_list.forEach((list) => {
        if (list.includes(chan)) {
          grades.push(list);
        }
      });
    });
    grade_list = grades;
  } else {
    grade_list = grade_list.filter((list) => {
      return list.includes(channel);
    });
  }
  return grade_list;
};

export const getReviewSizeTotalFooter = (formatedData) => {
  let totalSize = {},
    total_buy_units = 0,
    footerObj = {},
    footers = [],
    storesArr = [];
  formatedData.forEach((data) => {
    for (const key in data) {
      footerObj["l2_name"] = data["l2_name"];
      if (key.includes("size")) {
        totalSize[key] = totalSize[key]
          ? totalSize[key] + (parseInt(data[key]) || 0)
          : parseInt(data[key]);
      } else if (key === "stores") {
        storesArr.push(parseInt(data[key]));
      } else if (key === "total_buy_units") {
        total_buy_units += data[key];
      }
    }
  });
  footerObj = {
    ...footerObj,
    choice_name: "Total",
    stores: Math.max(...storesArr),
    total_buy_units: total_buy_units,
  };
  for (const key in totalSize) {
    footerObj[key] = totalSize[key];
  }
  footers.push(footerObj);
  return footers;
};

export const getFormattedReviewSizeData = (props, sizePercentageView) => {
  const formatedData = [];
  props.reviewBySizeData.data.data?.map((value) => {
    const item = {};
    const { attributes } = value;
    item.master_ids = value.master_ids
      ? value.master_ids
      : value.plan_finalize_size_id[0];
    if (attributes) {
      item.choice_name = value.attributes.choice_name;
      item.stores = parseInt(checkFalseValues(attributes.stores));
      item.l0_name = value.l0_name;
      item.l1_name = value.l1_name;
      item.l2_name = replaceSpecialCharacter(value.l2_name);
      item.l3_name = value.l3_name
      item.article_number = value.article_number || "-";
      item.style_number = value.style_number || "-";
      item.style_desc = checkFalseValues(value.style_des);
      item.style_name = value.style_name || "-";
      item.size_curve = value.size_curve || "-";
      item.launch = value.launch || "-";
      item.delivery = value.delivery || "-";
      item.stores = value.stores || "1";
      item.launch_date = value.launch_date || null;
      const { size } = attributes;
      if (size) {
        let tempSizeColumn = Object.keys(size).sort((a, b) => a - b); //getting keys of size
        tempSizeColumn?.map((data) => {
          item["size_" + data.replace(".", "-")] = size[data].toFixed();
          item["size_pen_" + data.replace(".", "-")] = attributes.Quantity
            ? size[data] / attributes.Quantity
            : 0;
          return data;
        });
      }
      item.total_buy_units = sizePercentageView ? 100 : attributes.Quantity;
      item.total_buy_pen = 1;
    }
    item.uniqueID =
      value.attributes.choice_name +
      value[props.screenConfiguration?.common?.drop_key || "drop"] +
      value.stores +
      value.l2_name;
    formatedData.push(item);
    return item;
  });

  return formatedData;
};

export const checkFalseValues = (value) => {
  if (value === "nan" || value === null) return 0;
  else if (value === "-" || value === undefined) return "-";
  else return value;
};

export const getReviewBySizeDataPayload = (formData, props) => {
  let planData = cloneDeep(props.planDetails);
  planData.l1_name = [formData.l1_name_list];
  planData.l2_name = [formData.l2_name_list];
  let payload = getPlanPayload(planData, props.planLevels);
  payload.filters.push(
    {
      attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
      prefix: "levels",
      operator: "in",
      value: [formData.attribute_list],
    },
    {
      attribute_name: props.screenConfiguration?.common?.flow_key || "flow",
      prefix: "levels",
      operator: "in",
      value: [
        formData[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ] || "-",
      ],
    },
    {
      attribute_name: "channel",
      prefix: "levels",
      operator: "in",
      value: [formData.channel_list],
    }
  );
  if (
    !(props.screenConfiguration?.common?.final_level !== "l3_name") ||
    !props.screenConfiguration?.common?.final_level
  ) {
    payload.filters.push({
      attribute_name: "l3_name",
      prefix: "levels",
      operator: "in",
      value: [formData.l3_name_list],
    });
  }
  if (
    props.screenConfiguration?.common?.final_level === "l2_name"
  ) {
    payload.filters.push({
      attribute_name: "l2_name",
      prefix: "levels",
      operator: "in",
      value: [formData.l2_name_list],
    });
  }
  return payload;
};

export const configureFormFields = (
  reviewFormValues,
  reviewFormData,
  selectedDrop,
  defaultChannel,
  setFormFields,
  setFormData,
  setDropData,
  type,
  props
) => {
  const l1FilterValues = reviewFormValues.l1FilterValue;
  const l2FilterValues = reviewFormValues.l2FilterValue;
  let dropOptions = generateDropDownOptions(
    reviewFormValues.l1FilterValue?.[0]?.attribute_list
  );
  let flowOptions = generateDropDownOptions(
    reviewFormValues.l1FilterValue?.[0]?.[
      `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
    ][selectedDrop]
  );
  reviewFormData.attribute_list = props.selectedDropData
    ? props.selectedDropData
    : l1FilterValues?.[0]?.attribute_list?.[0];
  const reviewForm = [];
  for (const key in l1FilterValues?.[0]) {
    let formObj = {};
    if (
      (key === "l1_name_list" || key === "l2_name_list") &&
      type !== "review_assortment_plan"
    ) {
      formObj = {
        accessor: key,
        field_type: "dropdown",
        label: props.levelsJson?.[key.split("_list")[0]],
        key: key.split("_list")[0],
        required: false,
        options: generateDropDownOptions(l1FilterValues[0]?.[key]),
        isMulti: type === "size" ? false : true,
        isSearchable: true,
        isClearable: type === "size" ? false : true,
      };
      if (!reviewFormData[key]) {
        reviewFormData[key] = l1FilterValues[0]?.[key]?.[0];
      }
    } else if (
      key === `${props.screenConfiguration?.common?.flow_key || "flow"}_list` &&
      isDropPlan(
        props.planDetails,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
      type !== "review_assortment_plan"
    ) {
      formObj = {
        accessor: key,
        field_type: "dropdown",
        label: key.split("_list")[0],
        key: key.split("_list")[0],
        required: false,
        options: generateDropDownOptions(
          l1FilterValues?.[0]?.[key]?.[selectedDrop]
        ),
        isMulti: type === "size" ? false : true,
        isSearchable: true,
        isClearable: type === "size" ? false : true,
      };
      reviewFormData[key] = l1FilterValues?.[0]?.[key]?.[selectedDrop]?.[0];
    }
    if (!isEmpty(formObj)) {
      reviewForm.push(formObj);
    }
  }
  if (type === "size" || type === "review_assortment_plan") {
    let formObj = {
      accessor: "l3_name_list",
      field_type: "dropdown",
      label: props.levelsJson?.["l3_name_list".split("_list")[0]],
      key: "l3_name_list".split("_list")[0],
      required: false,
      options: generateDropDownOptions(l2FilterValues?.[0]?.["l3_name_list"]),
      isMulti: false,
      isSearchable: true,
    };
    reviewForm.splice(2, 0, formObj);
    reviewFormData.l3_name_list = (l2FilterValues?.[0]?.l3_name_list?.[0]);
  }
  //For single drop plan, only display drop & flow values with "-"
  let checkLabel = dropOptions?.filter((obj) => {
    return obj.value === "-";
  });
  if (checkLabel?.length > 0) {
    dropOptions?.splice(1, 2);
    flowOptions?.splice(1, 2);
  }
  dropOptions = dropOptions?.filter((obj) => {
    return obj.value !== "-";
  });
  let dropArrData = [];
  dropOptions?.forEach((obj) => {
    dropArrData[obj.value] = obj.value;
  });
  setDropData(dropArrData);

  let formFields = [],
    grade_list = reviewFormValues.l1FilterValue?.[0]?.grade_list;
  if (props.planDetails?.channel?.length > 1) {
    let channelOpt = props.planDetails?.channel.map((data) => {
      return {
        label: data,
        value: data,
        id: data,
      };
    });
    defaultChannel = getDefaultChannelValue(channelOpt, props.planDetails);
    if (type === "cluster_grade") {
      const gradeList = fetchGradeListBasedOnChannel(
        defaultChannel?.value,
        props
      );
      grade_list = gradeList?.length ? gradeList : grade_list;
    }
    reviewFormData.channel_list =
      getDefaultChannelValue(channelOpt, props.planDetails)?.value ||
      channelOpt?.[0]?.value;
    formFields.push({
      accessor: "channel_list",
      field_type: "dropdown",
      label: "Channel",
      key: "channel",
      required: false,
      options: channelOpt,
      isMulti: false,
      isSearchable: true,
    });
  } else {
    reviewFormData.channel_list = props.planDetails.channel?.[0];
  }
  if (type === "cluster_grade") {
    let formObj = {
      accessor: "grade_list",
      field_type: "dropdown",
      label: "Cluster grade",
      key: "cluster_grade",
      required: false,
      options: generateDropDownOptions(grade_list),
      isMulti: true,
      isSearchable: true,
      isClearable: true,
    };
    reviewForm.splice(2, 0, formObj);
    reviewFormData.grade_list = grade_list?.[0];
    //For ecom plan, don't display flow list dropdown on cluster grade table
    if (isEcomPlan(props.planDetails)) {
      formFields = formFields.concat(reviewForm.slice(0, 3));
    } else {
      formFields.push(...reviewForm);
    }
  } else {
    formFields.push(...reviewForm);
  }
  if (type === "review_assortment_plan") {
    let formObj = {
      accessor: "metric_list",
      field_type: "dropdown",
      label: "Metric",
      key: "metric",
      required: false,
      options: [
        {
          label: "Receipt ($)",
          value: "receipts",
          id: "receipts",
        },
        {
          label: "Receipt Units",
          value: "receipt_units",
          id: "receipt_units",
        },
        {
          label: "Sales ($)",
          value: "sales",
          id: "sales",
        },
        {
          label: "Sales Units",
          value: "sales_units",
          id: "sales_units",
        },
      ],
      isMulti: false,
      isSearchable: false,
    };
    formFields.push(formObj);
  }
  setFormFields(formFields);
  setFormData(reviewFormData);
};
