--liquibase formatted sql
--changeset cascade:get_oms_receipts_dc_size_projection_store_report_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:receipt_projection_store
--comment: Initial creation of receipts DC size projection store report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_dc_size_projection_store_report(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_dc_size_projection_store_report(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_receipts_dc_size_projection_report_sql  text:='';
   v_meta_cls             text:='';
   v_dynamic_columns      text:='';
   v_meta_cls_json        jsonb := $4;

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
   
   if v_meta_cls_json <> '{}' then 
     -- Replace size with size_order in the sort array if sort exists
		IF jsonb_array_length(v_meta_cls_json -> 'sort') > 0 THEN
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				COALESCE((
				SELECT jsonb_agg(
					CASE 
					WHEN lower(item ->> 'column') = 'size' 
					THEN jsonb_build_object('column', 'size_order', 'order', item ->> 'order')
					ELSE item
					END
				)
				FROM jsonb_array_elements(v_meta_cls_json -> 'sort') item
				), '[]'::jsonb)
			);
		ELSE
		-- Add a new sort object with size_order ASC when sort is empty
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				jsonb_build_array(
				jsonb_build_object('column', 'size_order', 'order', 'asc')
				)
			);
		END IF;
		v_meta_cls := global.form_table_query(v_meta_cls_json);
   end if;

   -- Dynamically generate the CASE statements based on unit vs cost
   if $5 = 'unit'
   then
     SELECT string_agg(
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection_store 
       ORDER BY fiscal_year_month
     ) t;
   else
     SELECT string_agg(
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection_store 
       ORDER BY fiscal_year_month
     ) t;
   end if;

   v_dynamic_columns := trim(trailing ', ' from v_dynamic_columns);

   IF v_dynamic_columns IS NULL THEN
     OPEN $1 FOR SELECT 'No data in oms_receipt_projection_store table' AS message;
     RETURN $1;
   END IF;

   v_receipts_dc_size_projection_report_sql := '
   SELECT * from (
     SELECT 
       orp.store_code,
       paf.size,
       concat(orp.store_code, paf.size) as unique_row_id,
       ast."order" as size_order,
       ' || v_dynamic_columns || '
     FROM inventory_smart.oms_receipt_projection_store orp
     JOIN ('||v_pa_sql||') paf ON paf.product_code = orp.product_code AND paf.ordering = ''Y''
     LEFT JOIN inventory_smart.article_status_tag ast ON ast.product_code = paf.product_code AND ast.size = paf.size
     WHERE orp.store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
     GROUP BY orp.store_code, paf.size, ast."order"
     ORDER BY orp.store_code, paf.size
   )Z
   '||v_meta_cls;
   
   raise notice 'v_receipts_dc_size_projection_report_sql %',v_receipts_dc_size_projection_report_sql;
   open $1 for execute v_receipts_dc_size_projection_report_sql;
   RETURN v_receipts_dc_size_projection_report_sql;
 end
 $function$
;
