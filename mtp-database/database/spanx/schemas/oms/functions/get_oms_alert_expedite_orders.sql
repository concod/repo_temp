--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_expedite_orders_count_spanx_2 runOnChange:true stripComments:false splitStatements:false context:MTP-74088 labels:get_oms_alert_expedite_orders_count_spanx_2
--comment: MTP-74088
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
        SELECT DISTINCT oor.article, oor.loc_code, oor.product_code
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_gen_type != ''Manual'' and oor.order_type = ''Immediate'' and oor.order_status_id != 3
    ),
    expedite_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.loc_code
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN min_rop_helper oor
            ON oasl.product_code = oor.product_code AND oasl.loc_code = oor.loc_code
        INNER JOIN (
            SELECT article, product_code
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code
        WHERE oasl.expedite_order
    ),
    resolved_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.loc_code
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN min_rop_helper oor
            ON oasl.product_code = oor.product_code AND oasl.loc_code = oor.loc_code
        INNER JOIN (
            SELECT article, product_code
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code
        WHERE oasl.is_expedite_order_resolved
    )
    SELECT ''total''::text AS label, COUNT(*) AS count FROM expedite_orders_cte
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(*) AS count FROM resolved_orders_cte';
  
  raise notice 'v_expedite_orders_sql %',v_expedite_orders_sql;
  open input for execute v_expedite_orders_sql;
  RETURN input;
end
$function$
;