import { groupByCustom } from "core/Utils/formatter";
export const generateCarryoverTotalFooter = (tableData) => {
  const updatedTableData = [];
  const groupBy_properties = ["l3_name"];

  const groupedDataArray = groupByCustom({
    Group: tableData,
    By: groupBy_properties,
  });

  groupedDataArray?.length &&
    groupedDataArray.forEach((groupedData) => {
      let totalVar = {
        reg_weeks_ly_arr: [],
        reg_weeks_ty_arr: [],
        old_store_list_arr: [],
        new_store_list_arr: [],
        total_style_color: 0,
      };
      Object.keys(groupedData[0]).forEach((key) => {
        totalVar[`total_${key}`] = 0;
      });

      groupedData.forEach((data) => {
        if (!data.is_active) {
          totalVar.total_style_color += 1;
          totalVar.total_reg_weeks_ly += data.reg_weeks_ly;
          totalVar.total_reg_weeks_ty += data.reg_weeks_ty;
          totalVar.total_old_store_list += data.old_store_list;
          totalVar.total_new_store_list += data.new_store_list;
          totalVar.total_st_ly += data.st_ly * data.sales_ly;
          totalVar.total_st_ty += data.st_ty * data.sales_ty;
          totalVar.total_cost_ly += data.cost_ly;
          totalVar.total_cost_ty += data.cost_ty;
          totalVar.total_sales_ly += data.sales_ly;
          totalVar.total_sales_ty += data.sales_ty;
          totalVar.total_buy_units_ly += data.buy_units_ly;
          totalVar.total_buy_units_ty += data.buy_units_ty;
          totalVar.reg_weeks_ly_arr.push(data.reg_weeks_ly);
          totalVar.reg_weeks_ty_arr.push(data.reg_weeks_ty);
          totalVar.total_sales_units_ly += data.sales_units_ly;
          totalVar.total_sales_units_ty += data.sales_units_ty;
          totalVar.total_gross_margin_ly += data.gross_margin_ly;
          totalVar.total_gross_margin_ty += data.gross_margin_ty;
          totalVar.total_ia_recommended_aur += data.ia_recommended_aur;
          totalVar.total_retail_receipts_ly += data.retail_receipts_ly;
          totalVar.total_retail_receipts_ty += data.retail_receipts_ty;
          totalVar.total_gross_margin_perc_ly +=
            data.gross_margin_perc_ly * data.sales_ly;
          totalVar.total_gross_margin_perc_ty +=
            data.gross_margin_perc_ty * data.sales_ty;
          totalVar.total_ia_recommended_sales += data.ia_recommended_sales;
          totalVar.total_ia_recommended_sales_units +=
            data.ia_recommended_sales_units;
          totalVar.old_store_list_arr.push(data.old_store_list);
          totalVar.new_store_list_arr.push(data.new_store_list);
        }
      });
      let totalObj = {
        plan_code: groupedData?.[0].plan_code,
        channel: "",
        l0_name: groupedData?.[0].l0_name,
        l1_name: groupedData?.[0].l1_name,
        l2_name: groupedData?.[0].l2_name,
        l3_name: groupedData?.[0].l3_name,
        style_id: "",
        style_color_id: "Total",
        st_ly: totalVar.total_st_ly / totalVar.total_sales_ly || 0,
        st_ty: totalVar.total_st_ty / totalVar.total_sales_ty || 0,
        aur_ly: totalVar.total_sales_ly / totalVar.total_sales_units_ly || 0,
        aur_ty: totalVar.total_sales_ty / totalVar.total_sales_units_ty || 0,
        cost_ly: totalVar.total_cost_ly || 0,
        cost_ty: totalVar.total_cost_ty || 0,
        sales_ly: totalVar.total_sales_ly || 0,
        sales_ty: totalVar.total_sales_ty || 0,
        buy_units_ly: totalVar.total_buy_units_ly || 0,
        buy_units_ty: totalVar.total_buy_units_ty || 0,
        reg_weeks_ly: Math.max(...totalVar.reg_weeks_ly_arr),
        reg_weeks_ty: Math.max(...totalVar.reg_weeks_ty_arr),
        sales_units_ly: totalVar.total_sales_units_ly || 0,
        sales_units_ty: totalVar.total_sales_units_ty || 0,
        gross_margin_ly: totalVar.total_gross_margin_ly || 0,
        gross_margin_ty: totalVar.total_gross_margin_ty || 0,
        ia_recommended_aur:
          totalVar.total_ia_recommended_sales /
            totalVar.total_ia_recommended_sales_units || 0,
        retail_receipts_ly: totalVar.total_retail_receipts_ly || 0,
        retail_receipts_ty: totalVar.total_retail_receipts_ty || 0,
        gross_margin_perc_ly:
          totalVar.total_gross_margin_perc_ly / totalVar.total_sales_ly || 0,
        gross_margin_perc_ty:
          totalVar.total_gross_margin_perc_ty / totalVar.total_sales_ty || 0,
        ia_recommended_sales: totalVar.total_ia_recommended_sales || 0,
        ia_recommended_sales_units:
          totalVar.total_ia_recommended_sales_units || 0,
        old_store_list: Math.max(...totalVar.old_store_list_arr) || 0,
        new_store_list: Math.max(...totalVar.new_store_list_arr) || 0,
        uniqueRowId: groupedData?.[0].l3_name + "Total",
      };
      totalObj.aps_ly =
        (totalObj.sales_units_ly *
          totalVar.total_style_color) /
          totalVar.total_reg_weeks_ly /
          totalVar.total_old_store_list || 0;
      totalObj.aps_ty =
        (totalObj.sales_units_ty *
          totalVar.total_style_color) /
          totalVar.total_reg_weeks_ty /
          totalVar.total_new_store_list || 0;
      updatedTableData.push(totalObj);
    });
  return updatedTableData;
};
