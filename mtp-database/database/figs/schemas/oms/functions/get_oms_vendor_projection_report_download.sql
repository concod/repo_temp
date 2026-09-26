--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_vendor_projection_report_download_figs_5 runOnChange:true stripComments:false splitStatements:false context:MTP-75255 labels:MTP-91059
--comment: Changed the group by and order by clauses to include the loc_code and size columns
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_vendor_projection_report_download(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_report_download(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';
   v_int_fiscal_year_months text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;

   if $4 = 'unit'
   then
     v_col_value := 'order_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'order_quantity_cost';
   end if;

   SELECT 
     string_agg('fym' || fiscal_year_month::text, ', '),
     string_agg('"fym' || fiscal_year_month::text || '" int', ', '),
     string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ')
   INTO v_fiscal_year_months, v_int_fiscal_year_months, v_sum_fiscal_year_months
   FROM (
     SELECT DISTINCT fiscal_year_month 
     FROM inventory_smart.oms_vendor_projection 
     ORDER BY fiscal_year_month
   ) t;

   v_vendor_projection_report_sql := 'WITH detailed_data AS (
      SELECT 
        paf.article,
        X.loc_code,
        X.size,
        MAX(paf.l0_name) AS l0_name,
        MAX(paf.style_name) AS style_name,
        MAX(paf.vendor_desc) AS vendor_desc,
        MAX(paf.vendor_id) AS vendor_id,
        MAX(paf.l1_name) AS l1_name,
        MAX(paf.l2_name) AS l2_name,
        MAX(paf.l3_name) AS l3_name,
        MAX(paf.l4_name) AS l4_name,
        MAX(paf.product_code) AS product_code,
        '||v_sum_fiscal_year_months||'
      FROM (
        SELECT 
          split_part(pls, ''::'', 1) AS product_code,
          split_part(pls, ''::'', 2) AS loc_code,
          split_part(pls, ''::'', 3) AS size,
          '||v_fiscal_year_months||'
        FROM crosstab(
          $$
            SELECT 
              product_code || ''::'' || loc_code || ''::'' || size AS pls,
              fiscal_year_month, 
              coalesce(sum('||v_col_value||'::numeric)::int, 0)
            FROM inventory_smart.oms_vendor_projection
            GROUP BY 1,2
            ORDER BY 1,2
          $$,
          $$
            SELECT DISTINCT fiscal_year_month 
            FROM inventory_smart.oms_vendor_projection 
            ORDER BY fiscal_year_month
          $$
        ) AS pivot_table(pls TEXT, '||v_int_fiscal_year_months||')
      ) X 
      JOIN ('||v_pa_sql||') paf ON paf.product_code = X.product_code AND paf.ordering = ''Y''
      GROUP BY 1,2,3
    ),
    aggregated_data AS (
      SELECT 
        article,
        '||v_sum_fiscal_year_months||'
      FROM detailed_data 
      GROUP BY article
    ),
    filtered_data AS (
      SELECT article 
      FROM aggregated_data '||v_meta_cls||'
    )
    SELECT 
      dp.article,
      dp.loc_code,
      dp.size,
      dp.l0_name,
      dp.style_name,
      dp.vendor_desc,
      dp.vendor_id,
      dp.l1_name,
      dp.l2_name,
      dp.l3_name,
      dp.l4_name,
      dp.product_code,
      '||v_fiscal_year_months||'
    FROM detailed_data dp
    JOIN filtered_data fa ON fa.article = dp.article
    ORDER BY dp.article, dp.loc_code, dp.size';         
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;