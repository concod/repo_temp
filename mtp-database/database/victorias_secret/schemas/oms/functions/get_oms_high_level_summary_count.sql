--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_count_vs_3 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671-1
--comment: Added view_by_allowed_values parameter
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
  
begin
  v_pa_sql := global.form_main_table_filters(
    'product_attributes_filter',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, 'style', 'paf.style');
  v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');

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
		    COUNT(distinct paf.article) AS eligible_styles,
		    COUNT(distinct oor.article) AS recom_styles
		FROM
		(select * from "global".product_attributes_filter  where  ordering=''Y'') paf
		 left join 
		(select product_code, article, loc_code from inventory_smart.oms_orders_recommended ) oor
		on oor.product_code = paf.product_code
    INNER JOIN
	      global.distribution_centres dc
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
