--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:get_oms_high_level_summary_count_store runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:MTP-93997
--comment: MTP-93997
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_count_store(input refcursor, jsonb, jsonb, hierarchy text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_count_store(input refcursor, jsonb, jsonb, hierarchy text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                        text:='';
  v_sa_sql                        text:='';

  v_high_level_summary_count_sql  text:='';
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  v_sa_sql := inventory_smart.form_main_table_filters(
    'store_attributes_filter'::text,
    $5::jsonb
  );
  v_pa_sql := REPLACE(v_pa_sql, 'style', 'paf.style');
  v_high_level_summary_count_sql := '
	WITH store_filter AS (
	      SELECT store_code
	      FROM global.store_attributes_filter
	      ' || v_sa_sql || '
	    )
  select
          *
    from (
		SELECT
		    DISTINCT ' || hierarchy || '
		FROM inventory_smart.oms_orders_recommended_store oors
		' || v_pa_sql || '
	    AND EXISTS (SELECT 1 FROM store_filter sf WHERE oors.store_code = sf.store_code)
		GROUP BY
		    ' || hierarchy || ', sales_org_name
    ) X ' || global.form_table_query($3);

   raise notice 'v_high_level_summary_count_sql %',v_high_level_summary_count_sql;
   open $1 for execute v_high_level_summary_count_sql;
   RETURN v_high_level_summary_count_sql;
 end
 $function$
;
