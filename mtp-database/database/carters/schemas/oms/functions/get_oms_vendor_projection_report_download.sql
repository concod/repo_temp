--liquibase formatted sql
--changeset Dharshan.patil:get_oms_vendor_projection_report_download_2 runOnChange:true stripComments:false splitStatements:false context:MTP-75255 labels:MTP-91059.
--comment: MTP-91059 vendor download fix
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
        paf.style,
        X.channel,
        X.size,
        MAX(paf.l2_name) AS l2_name,
        MAX(paf.l3_name) AS l3_name,
        MAX(paf.l4_name) AS l4_name,
        MAX(paf.l5_name) AS l5_name,
        MAX(paf.season) AS season,
        MAX(paf.class) AS class,
        MAX(paf.style_description) AS style_description,
        MAX(X.vendor_code) AS vendor_code,
        MAX(X.vendor_name) AS vendor_name,
        '||v_sum_fiscal_year_months||'
      FROM (
        SELECT 
          split_part(pls, ''::'', 1) AS product_code,
          split_part(pls, ''::'', 2) AS channel,
          split_part(pls, ''::'', 3) AS size,
          vendor_code,
          vendor_name,
          '||v_fiscal_year_months||'
        FROM crosstab(
          $$
            SELECT 
              product_code || ''::'' || channel || ''::'' || size AS pls,
              vendor_code,
              vendor_name,  
              fiscal_year_month, 
              coalesce(sum('||v_col_value||'::numeric)::int, 0)
            FROM inventory_smart.oms_vendor_projection
            GROUP BY 1,2,3,4
            ORDER BY 1,2,3,4
          $$,
          $$
            SELECT DISTINCT fiscal_year_month 
            FROM inventory_smart.oms_vendor_projection 
            ORDER BY fiscal_year_month
          $$
        ) AS pivot_table(pls TEXT, vendor_code TEXT, vendor_name TEXT, '||v_int_fiscal_year_months||')
      ) X 
      JOIN ('||v_pa_sql||') paf ON paf.product_code = X.product_code AND paf.ordering = ''Y''
      GROUP BY 1,2,3
    ),
    aggregated_data AS (
      SELECT 
        style,
        vendor_code,
        vendor_name,
        '||v_sum_fiscal_year_months||'
      FROM detailed_data 
      GROUP BY style, vendor_code, vendor_name
    ),
    filtered_data AS (
      SELECT style 
      FROM aggregated_data '||v_meta_cls||'
    )
    SELECT 
      dp.style,
      dp.channel,
      dp.size,
      dp.l2_name,
      dp.l3_name,
      dp.l4_name,
      dp.l5_name,
      dp.season,
      dp.class,
      dp.style_description,
      dp.vendor_code,
      dp.vendor_name,
      '||v_fiscal_year_months||'
    FROM detailed_data dp
    JOIN filtered_data fa ON fa.style = dp.style
    ORDER BY dp.style, dp.channel, dp.size';       
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;
