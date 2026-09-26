--liquibase formatted sql
--changeset cascade:get_oms_receipts_projection_store_report_download_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:receipt_projection_store
--comment: Initial creation of receipts projection store report download
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_projection_store_report_download(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_projection_store_report_download(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_meta_cls             text:='';
   v_dynamic_columns_detailed      text:='';
   v_dynamic_columns_agg           text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
   
   if $4 <> '{}'
   then 
     v_meta_cls := global.form_table_query($4);
   end if;

   -- Dynamically generate the CASE statements for detailed data
   if $5 = 'unit'
   then
     SELECT 
       string_agg(
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
         ', '
       ),
       string_agg(
         'SUM(fym' || fiscal_year_month::text || '_recommended) as fym' || fiscal_year_month::text || '_recommended, ' ||
         'SUM(fym' || fiscal_year_month::text || '_committed) as fym' || fiscal_year_month::text || '_committed, ' ||
         'SUM(fym' || fiscal_year_month::text || '_approved) as fym' || fiscal_year_month::text || '_approved',
         ', '
       )
     INTO v_dynamic_columns_detailed, v_dynamic_columns_agg
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection_store 
       ORDER BY fiscal_year_month
     ) t;
   else
     SELECT 
       string_agg(
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
         'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
         ', '
       ),
       string_agg(
         'SUM(fym' || fiscal_year_month::text || '_recommended) as fym' || fiscal_year_month::text || '_recommended, ' ||
         'SUM(fym' || fiscal_year_month::text || '_committed) as fym' || fiscal_year_month::text || '_committed, ' ||
         'SUM(fym' || fiscal_year_month::text || '_approved) as fym' || fiscal_year_month::text || '_approved',
         ', '
       )
     INTO v_dynamic_columns_detailed, v_dynamic_columns_agg
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection_store 
       ORDER BY fiscal_year_month
     ) t;
   end if;

   v_dynamic_columns_detailed := trim(trailing ', ' from v_dynamic_columns_detailed);
   v_dynamic_columns_agg := trim(trailing ', ' from v_dynamic_columns_agg);

   IF v_dynamic_columns_detailed IS NULL THEN
     OPEN $1 FOR SELECT 'No data in oms_receipt_projection_store table' AS message;
     RETURN $1;
   END IF;

   v_receipts_projection_report_sql := '
   WITH detailed_data AS (
      SELECT 
        SPLIT_PART(X.pls, ''::'', 1) AS product_code,
        SPLIT_PART(X.pls, ''::'', 2) AS store_code,
        SPLIT_PART(X.pls, ''::'', 3) AS size,
        paf.article,
        MAX(paf.product_description) AS product_description,
        MAX(paf.l0_name) AS l0_name,
        MAX(paf.l1_name) AS l1_name,
        MAX(paf.l2_name) AS l2_name,
        MAX(paf.l3_name) AS l3_name,
        MAX(paf.merchandise_category_name) AS merchandise_category_name,
        MAX(paf.local_flag) AS local_flag,
        MAX(paf.article_value_stream) AS article_value_stream,
        '||v_dynamic_columns_detailed||'
      FROM (
        SELECT *
        FROM crosstab(
          $$
            SELECT 
              product_code || ''::'' || store_code || ''::'' || size_desc AS pls,
              fiscal_year_month, 
              coalesce(sum(receipt_quantity::numeric)::int, 0)
            FROM inventory_smart.oms_receipt_projection_store
            WHERE store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
            GROUP BY 1,2
            ORDER BY 1,2
          $$,
          $$
            SELECT DISTINCT fiscal_year_month 
            FROM inventory_smart.oms_receipt_projection_store 
            ORDER BY fiscal_year_month
          $$
        ) AS pivot_table(pls TEXT, '||v_dynamic_columns_agg||')
      ) X 
      JOIN ('||v_pa_sql||') paf ON paf.product_code = X.product_code AND paf.ordering = ''Y''
      GROUP BY 1,2,3,4
    ),
    filtered_data AS (
     SELECT article 
     FROM detailed_data '||v_meta_cls||'
   )
   SELECT 
     dp.product_code,
     dp.store_code,
     dp.size,
     dp.product_description,
     dp.l0_name,
     dp.l1_name,
     dp.l2_name,
     dp.l3_name,
     dp.merchandise_category_name,
     dp.product_code,
     dp.local_flag,
     dp.article_value_stream,
     dp.article_value_stream,
     ' || v_dynamic_columns_agg || '
   FROM detailed_data dp
   JOIN filtered_data fa ON fa.article = dp.article
   ORDER BY dp.article, dp.store_code, dp.size';
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN v_receipts_projection_report_sql;
 end
 $function$
;
