--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_recommended_orders_count_briscoes_5 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_recommended_orders_count_vs_6
--comment: Added SP for OMS recommended orders count alert and added optimisation logic for briscoes
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
    WITH min_rop_helper AS MATERIALIZED (
        SELECT DISTINCT oor.article, oor.loc_code, oor.product_code
        FROM inventory_smart.oms_orders_recommended oor
        join (select linked_store_code from global.distribution_centres where is_active and not is_deleted) dc 
        on dc.linked_store_code = oor.loc_code
        WHERE oor.order_status_id IN (0) 
          AND oor.order_gen_type != ''Manual''
          AND oor.raw_roq > 0
          AND oor.order_type IN (''Order Cycle'', ''Reorder Point'')
          AND oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''28 days''
    ),
    alerts_filtered AS MATERIALIZED (
      SELECT article, loc_code, product_code, recom_order , is_recom_order_resolved 
      FROM inventory_smart.oms_alerts
      WHERE recom_order
    ),

    combined_data AS MATERIALIZED (
      SELECT 
          a.article,
          a.loc_code,
          a.recom_order,
          a.is_recom_order_resolved
      FROM alerts_filtered a
      INNER JOIN min_rop_helper m
          ON a.product_code = m.product_code 
          AND a.loc_code = m.loc_code
      INNER JOIN (
          SELECT article, product_code 
          FROM global.product_attributes_filter 
          ' || v_pa_sql || '
        ) paf ON a.product_code = paf.product_code
    )
    SELECT ''total''::text AS label, COUNT(DISTINCT (article, loc_code)) AS count 
    FROM combined_data 
    WHERE recom_order
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(DISTINCT (article, loc_code)) AS count 
    FROM combined_data 
    WHERE is_recom_order_resolved';
  
  raise notice 'v_recom_orders_sql %',v_recom_orders_sql;
  open $1 for execute v_recom_orders_sql;
  RETURN $1;
end
$function$
;