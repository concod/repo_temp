--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_alert_pending_orders_vendor_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-102139
--comment: MTP-102139. Scoped alerts + alert_store_keys + LATERAL min_rop_helper (Immediate oor rows); paf from form_main_table_filters.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders_vendor_store(input refcursor, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders_vendor_store(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_pending_orders_sql  text:='';
 
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  v_pending_orders_sql := '
    WITH paf AS MATERIALIZED (
        SELECT product_code
        FROM global.product_attributes_filter
        ' || v_pa_sql || ' and ordering = ''Y'' and active
      ),
      alerts_scoped AS MATERIALIZED (
        SELECT oasl.article, oasl.store_code, oasl.product_code,
               oasl.pending_order, oasl.is_pending_order_resolved
        FROM inventory_smart.oms_alerts_store oasl
        WHERE (oasl.pending_order OR oasl.is_pending_order_resolved)
          AND EXISTS (SELECT 1 FROM paf p WHERE oasl.product_code = p.product_code)
      ),
      alert_store_keys AS MATERIALIZED (
        SELECT DISTINCT product_code, store_code FROM alerts_scoped
      ),
      min_rop_helper AS MATERIALIZED (
        SELECT DISTINCT x.article, x.store_code, x.product_code
        FROM (SELECT ak_inner.* FROM alert_store_keys ak_inner OFFSET 0) ak
        CROSS JOIN LATERAL (
          SELECT oor.article, oor.store_code, oor.product_code
          FROM inventory_smart.oms_orders_recommended_store oor
          WHERE oor.product_code = ak.product_code
            AND oor.store_code = ak.store_code
            AND oor.order_gen_type != ''Manual''
            AND oor.order_type = ''Immediate''
            AND oor.order_status_id != 3
        ) x
      ),
    pending_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.store_code
        FROM alerts_scoped oasl
        WHERE oasl.pending_order
        AND EXISTS (SELECT 1 FROM min_rop_helper oor WHERE oasl.product_code = oor.product_code AND oasl.store_code = oor.store_code)
    ),
    resolved_orders_cte AS (
        SELECT DISTINCT oasl.article, oasl.store_code
        FROM alerts_scoped oasl
        WHERE oasl.is_pending_order_resolved
        AND EXISTS (SELECT 1 FROM min_rop_helper oor WHERE oasl.product_code = oor.product_code AND oasl.store_code = oor.store_code)
    )
    SELECT ''total''::text AS label, COUNT(*) AS count FROM pending_orders_cte
    UNION ALL
    SELECT ''resolved''::text AS label, COUNT(*) AS count FROM resolved_orders_cte';
  
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
  open $1 for execute v_pending_orders_sql;
  RETURN $1;
end
$function$
;
