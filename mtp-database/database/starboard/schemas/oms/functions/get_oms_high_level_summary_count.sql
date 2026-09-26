--liquibase formatted sql
--changeset sumit1.kumar@impactanalytics.co:get_oms_high_level_summary_count_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-130093
--comment: MTP-71824..
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary_count(refcursor, jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_high_level_summary_count(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                        text:='';
  v_high_level_summary_count_sql  text:='';
  v_hierarchies_list        text[];
  v_higher_hierarchies_list text := '';
begin
  v_pa_sql := oms.form_main_table_filters(
    'ph_master',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, 'article', 'paf.article');

   -- FETCH HIERARCHY LIST DYNAMICALLY
  SELECT 
      array_agg(format('paf.%I', attribute_name))
  INTO 
      v_hierarchies_list
  FROM oms.get_oms_view_by_hierarchy(hierarchy, view_by_allowed_values::jsonb);
  
  v_higher_hierarchies_list := array_to_string(v_hierarchies_list, ', ');
  RAISE NOTICE 'v_higher_hierarchies_list: %', v_higher_hierarchies_list;

  v_high_level_summary_count_sql := '
  select
          *
    from (
		SELECT
		    DISTINCT ' || v_higher_hierarchies_list || '
		FROM
		(select * from "global".product_attributes_filter) paf
		 left join 
		(select product_code, article, loc_code from oms.oms_orders_recommended) oor
		on oor.product_code = paf.product_code
    INNER JOIN
	      global.distribution_centres dc
	      ON oor.loc_code = dc.linked_store_code
		' || v_pa_sql || '
		GROUP BY
		    ' || v_higher_hierarchies_list || ', dc.name
    ) X ' || global.form_table_query($3);

   raise notice 'v_high_level_summary_count_sql %',v_high_level_summary_count_sql;
   open $1 for execute v_high_level_summary_count_sql;
   RETURN v_high_level_summary_count_sql;
 end
 $function$
;
