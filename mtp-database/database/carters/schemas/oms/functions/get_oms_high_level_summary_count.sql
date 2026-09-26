--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_count_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-71824-1
--comment: Added view_by_allowed_values parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_count(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                  text:='';
  v_high_level_summary_count_sql  text:='';
  v_search_cls text := '';
  search_json jsonb:= '{}'; 
  
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
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
		    paf.l1_name AS dc_or_channel,
		    COUNT(distinct paf.article) AS eligible_styles,
		    COUNT(distinct oor.article) AS recom_styles
		FROM
		(select * from "global".product_attributes_filter  where  ordering=''Y'') paf
		 left join 
		(select product_code, article  from inventory_smart.oms_orders_recommended ) oor
		on oor.product_code = paf.product_code
        ' || v_pa_sql || '
		GROUP BY
		    paf.' || hierarchy || ', paf.l1_name
    ) X ' || v_search_cls ;

   raise notice 'v_high_level_summary_count_sql %',v_high_level_summary_count_sql;
   open $1 for execute v_high_level_summary_count_sql;
   RETURN v_high_level_summary_count_sql;
 end
 $function$
;
