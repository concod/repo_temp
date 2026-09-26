--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_expedite_orders_count_vs_8 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_expedite_orders_count_vs_8
--comment: Expedite alert count; DC filter via linked_store_codes; qualify dc.is_active in min_rop_helper EXISTS
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_expedite_orders_sql  text:='';
  v_loc_filter           text:='';
  v_product_filter_for_pa jsonb;
  product_filter jsonb := $2 || '{}';
 
begin
  IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
  END IF;
    v_product_filter_for_pa := product_filter - 'linked_store_codes';
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        v_product_filter_for_pa
    );
 v_expedite_orders_sql := '
    WITH  paf AS Materialized(
      SELECT DISTINCT ON (l4_name) l4_name
      FROM global.product_attributes_filter
      ' || v_pa_sql || ' and ordering = ''Y'' and active
    ),
    dc_filter AS (
        SELECT linked_store_code
        FROM global.distribution_centres
        WHERE is_active and not is_deleted
        ' || v_loc_filter || '
    ),
    min_rop_helper AS (
        SELECT DISTINCT oor.article, oor.loc_code, oor.product_code
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_gen_type != ''Manual'' and oor.order_type = ''Immediate'' and oor.order_status_id != 3
		AND EXISTS (SELECT 1 FROM global.distribution_centres dc WHERE dc.linked_store_code = oor.loc_code AND dc.is_active AND NOT dc.is_deleted )
    ),
    combined_cte AS (
        SELECT  
            oasl.article, 
            oasl.loc_code,
            oasl.expedite_order,
            oasl.is_expedite_order_resolved
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN dc_filter dc ON oasl.loc_code = dc.linked_store_code
        WHERE oasl.expedite_order 
		AND EXISTS (SELECT 1 FROM paf WHERE oasl.product_code = paf.l4_name)
		AND EXISTS (SELECT 1 FROM min_rop_helper oor WHERE oasl.product_code = oor.product_code AND oasl.loc_code = oor.loc_code)
		UNION 
		SELECT  
            oasl.article, 
            oasl.loc_code,
            oasl.expedite_order,
            oasl.is_expedite_order_resolved
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN dc_filter dc ON oasl.loc_code = dc.linked_store_code
        WHERE oasl.is_expedite_order_resolved
		AND EXISTS (SELECT 1 FROM paf WHERE oasl.product_code = paf.l4_name)
		AND EXISTS (SELECT 1 FROM min_rop_helper oor WHERE oasl.product_code = oor.product_code AND oasl.loc_code = oor.loc_code)
    )
    SELECT ''total''::text AS label, COUNT(*) AS count 
    FROM combined_cte WHERE expedite_order
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(*) AS count 
    FROM combined_cte WHERE is_expedite_order_resolved';
  
  raise notice 'v_expedite_orders_sql %',v_expedite_orders_sql;
  open $1 for execute v_expedite_orders_sql;
  RETURN $1;
end
$function$
;