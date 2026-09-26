--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_high_level_summary_count_updated_l4_name_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-132980
--comment: Added view_by_allowed_values parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_count(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                        text:='';
  v_high_level_summary_count_sql  text:='';
  v_search_cls text := '';
  search_json jsonb:= '{}';
  v_loc_filter text := '';
  v_product_filter_for_pa   jsonb;
begin
  IF jsonb_array_length(($2->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text(($2->'linked_store_codes')->0->'values') AS elem;
  END IF;
  v_product_filter_for_pa := $2 - 'linked_store_codes';
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    v_product_filter_for_pa
  );
  v_pa_sql := REPLACE(v_pa_sql, 'style', 'paf.style');

  search_json = $3;
     if $3 <> '{}' and  $3 -> 'limit' is not null then
        search_json := search_json - 'limit';
      end if;

	v_search_cls := global.form_table_query(search_json);

  v_high_level_summary_count_sql := '
  select
          DISTINCT ' || hierarchy || '
    from (
		SELECT
		    paf.' || hierarchy || ',
		    dc.name AS dc_or_channel,
		    COUNT(distinct paf.l4_name) AS eligible_styles,
		    COUNT(distinct oor.article) AS recom_styles
		FROM
		(select * from "global".product_attributes_filter  where  ordering=''Y'') paf
		 left join 
		(select product_code, article, loc_code from inventory_smart.oms_orders_recommended where order_quantity > 0) oor
		on oor.article = paf.l4_name
    		
INNER JOIN
	      (SELECT linked_store_code, name FROM global.distribution_centres WHERE is_active AND NOT is_deleted' || v_loc_filter || ') dc
	      ON oor.loc_code = dc.linked_store_code
			' || v_pa_sql || '
		GROUP BY
		    paf.' || hierarchy || ', dc.name
    ) X ' || v_search_cls ;

   raise notice 'v_high_level_summary_count_sql %',v_high_level_summary_count_sql;
   open $1 for execute v_high_level_summary_count_sql;
   RETURN v_high_level_summary_count_sql;
 end
 $function$
;
