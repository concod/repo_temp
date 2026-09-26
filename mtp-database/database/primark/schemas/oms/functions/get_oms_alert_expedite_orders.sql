--liquibase formatted sql
--changeset chaitanyaprasad.reddy:get_oms_alert_expedite_orders_count_briscoes_4 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_alert_expedite_orders_count_vs_3
--comment: Added SP for OMS expedite orders alert count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_alert_expedite_orders(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_alert_expedite_orders(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_expedite_orders_sql  text:='';
 
begin
  v_pa_sql :=oms.form_main_table_filters(
    'ph_master',
    $2
  );
  v_expedite_orders_sql := '
    WITH min_rop_helper AS (
        SELECT DISTINCT oor.article, oor.loc_code, oor.product_code
        FROM oms.oms_orders_recommended oor
        join (select linked_store_code from global.distribution_centres where is_active and not is_deleted) dc 
        on dc.linked_store_code = oor.loc_code
        WHERE oor.order_gen_type != ''Manual'' and oor.order_type = ''Immediate'' and oor.order_status_id != 3
    ),
    expedite_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.loc_code
        FROM oms.oms_alerts oasl
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
        FROM oms.oms_alerts oasl
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
  open $1 for execute v_expedite_orders_sql;
  RETURN $1;
end
$function$
;