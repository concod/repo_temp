--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_alert_recommeded_orders_vs_2 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Updated to replace product_code with paf.product_code

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
  v_pa_sql :=global.form_main_table_filters(
    'product_attributes_filter',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');

  v_recom_orders_sql := '
               WITH min_rop_helper AS (
        SELECT DISTINCT oor.article, oor.loc_code, oor.product_code
        FROM inventory_smart.oms_orders_recommended oor
        join (select linked_store_code from global.distribution_centres where is_active and not is_deleted) dc 
        on dc.linked_store_code = oor.loc_code
        WHERE oor.order_status_id IN (0) 
          AND oor.order_gen_type != ''Manual''
          AND oor.raw_roq > 0
          AND oor.order_type IN (''Order Cycle'', ''Reorder Point'')
          AND oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''14 days''
    ),
    
    recom_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.loc_code
        FROM inventory_smart.oms_alerts oasl
        INNER JOIN min_rop_helper oor
            ON oasl.product_code = oor.product_code AND oasl.loc_code = oor.loc_code
        INNER JOIN (
            SELECT article, product_code 
            FROM global.product_attributes_filter 
            ' || v_pa_sql || '
        ) paf ON oasl.product_code = paf.product_code
        WHERE oasl.recom_order
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