--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:get_oms_high_level_summary_storev2 runOnChange:true stripComments:false splitStatements:false context:Release_1_14 labels:MTP-93997
--comment: MTP-103380.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_store(input refcursor, jsonb, jsonb, hierarchy text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_store(input refcursor, jsonb, jsonb, hierarchy text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                  text:='';
  v_high_level_summary_sql  text:='';
  v_sa_sql text:='';
  v_search_cls text := '';
  v_limit_cls text := '';
  store_codes_condition text := '';
  search_json jsonb:= '{}'; 
  limit_json jsonb:= '{}';
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  
  -- Extract store codes from store attributes parameter ($5)
  v_sa_sql := global.form_main_table_filters(
    'store_attributes_filter'::Text,
    $5::jsonb
  );

  search_json = $3;
     if $3 <> '{}' and  $3 -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := $3 -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
      end if;

	v_search_cls := global.form_table_query(search_json);

  v_high_level_summary_sql := '
  WITH store_filter AS (
      SELECT store_code
      FROM global.store_attributes_filter
      ' || v_sa_sql || '
    ),
  base_data AS (
      SELECT
          ' || hierarchy || ',
          sales_org_name AS store_tier,
          article,
          order_quantity
      FROM inventory_smart.oms_orders_recommended_store oors
	  ' || v_pa_sql || '
      AND EXISTS (SELECT 1 FROM store_filter sf WHERE oors.store_code = sf.store_code)
      
  ),

  cte1 AS (
    select * from (
      SELECT
          ' || hierarchy || ',
          store_tier,
          COUNT(DISTINCT article) AS eligible_styles,
          COUNT(DISTINCT CASE WHEN order_quantity > 0 THEN article END) AS recom_styles
      FROM base_data
      GROUP BY 
	  ' || hierarchy || ', store_tier) X1
    ' || v_search_cls || '
  ),

  cte2 AS (
      SELECT DISTINCT ' || hierarchy || '
      FROM cte1
      ORDER BY ' || hierarchy || '
      ' || v_limit_cls || '
  ),

  cte3 AS (
    select * from (
      SELECT
          ' || hierarchy || ',
          ''-'' AS store_tier,
          COUNT(DISTINCT article) AS eligible_styles,
          COUNT(DISTINCT CASE WHEN order_quantity > 0 THEN article END) AS recom_styles
      FROM base_data
      GROUP BY ' || hierarchy || ') X2
      ' || v_search_cls || '
  )

  SELECT c.*
  FROM (
      SELECT * FROM cte1
      UNION ALL
      SELECT * FROM cte3
  ) c
  JOIN cte2 ON c.' || hierarchy || ' = cte2.' || hierarchy || '';

   raise notice 'v_high_level_summary_sql %',v_high_level_summary_sql;
   open $1 for execute v_high_level_summary_sql;
   RETURN v_high_level_summary_sql;
 end
 $function$
;
