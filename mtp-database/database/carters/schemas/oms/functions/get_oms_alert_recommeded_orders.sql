--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_recommended_orders_count_carters_6 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_recommended_orders_count_carters_6
--comment: Added SP for OMS recommended orders count alert 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommeded_orders(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommeded_orders(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql            text:='';
  v_recom_orders_sql  text:='';
  v_week_start_date   date:= date_trunc('week', current_date)::date;
 
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
v_recom_orders_sql := '
    WITH min_rop_helper AS (
        SELECT DISTINCT oor.style, oor.channel, oor.product_code, oor.rop, MIN(oor.rop) OVER (PARTITION BY oor.style, oor.channel) AS min_rop
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_status_id IN (0) 
          AND oor.order_gen_type != ''Manual''
          AND oor.order_quantity > 0 
          AND oor.order_type IN (''Order Cycle'', ''Reorder Point'')
    ),
    recommended_min_rop as(
        select * from min_rop_helper where rop = min_rop
    ),
    recom_orders_cte AS (
        SELECT DISTINCT oasl.style, oasl.channel
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN recommended_min_rop oor
            ON oasl.product_code = oor.product_code AND oasl.channel = oor.channel
        INNER JOIN (
            SELECT l1_name, style, product_code
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code
        WHERE oasl.recom_order
    ),
    resolved_orders_cte AS (
        SELECT DISTINCT oasl.style, oasl.channel
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN recommended_min_rop oor
            ON oasl.product_code = oor.product_code AND oasl.channel = oor.channel
        INNER JOIN (
            SELECT l1_name, style, product_code
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code
        WHERE oasl.is_recom_order_resolved
    )
    SELECT ''total''::text AS label, COUNT(*) AS count FROM recom_orders_cte
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(*) AS count FROM resolved_orders_cte';

  
  raise notice 'v_recom_orders_sql %',v_recom_orders_sql;
  open $1 for execute v_recom_orders_sql;
  RETURN $1;
end
$function$
;