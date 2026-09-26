--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_expedite_orders_count_carters_6 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_expedite_orders_count_carters_6
--comment: Added SP for OMS expedite orders count alert with product level details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_expedite_orders_sql  text:='';
 
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );

  v_expedite_orders_sql := '
    WITH min_rop_helper AS (
        SELECT DISTINCT oor.style, oor.channel, oor.product_code
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_gen_type = ''Recommended'' and oor.order_type = ''Immediate''
    ),
    expedite_orders_cte AS (
        SELECT DISTINCT oasl.style, oasl.channel
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN min_rop_helper oor
            ON oasl.product_code = oor.product_code AND oasl.channel = oor.channel
        INNER JOIN (
            SELECT product_code, l1_name
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code AND oasl.channel = paf.l1_name
        WHERE oasl.expedite_order
    ),
    resolved_orders_cte AS (
        SELECT DISTINCT oasl.style, oasl.channel
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN min_rop_helper oor
            ON oasl.product_code = oor.product_code AND oasl.channel = oor.channel
        INNER JOIN (
            SELECT l1_name, product_code 
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code AND oasl.channel = paf.l1_name
        WHERE oasl.is_expedite_order_resolved
    )
    SELECT ''total''::text AS label, COUNT(*) AS count FROM expedite_orders_cte
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(*) AS count FROM resolved_orders_cte';
  
  raise notice 'v_expedite_orders_sql %',v_expedite_orders_sql;
  open $1 for execute v_expedite_orders_sql;
  RETURN $1;
end
$function$
;