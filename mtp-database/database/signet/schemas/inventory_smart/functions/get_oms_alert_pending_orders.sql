--liquibase formatted sql
--changeset jitendra.singh@impactanalytics.co:get_oms_alert_pending_orders runOnChange:true stripComments:false splitStatements:false context:MTP-17206 labels:pending_alert
--comment: Pending alert
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_pending_orders_sql  text:='';
  v_pending_orders_cnt  int:=0;
  v_week_start_date     date:= date_trunc('week', current_date)::date;
 
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_pending_orders_sql := '
           select 
             ''total''::text as label,count(*) as count
           from
             inventory_smart.oms_alerts_sku_loc_vendor oaslv
           inner join 
             ('||v_pa_sql||') paf
           on
             oaslv.product_code = paf.product_code
           inner join
             inventory_smart.oms_orders_recommended oor
           on
             oor.id = oaslv.ia_order_id
           where
             oaslv.pending_order
             and oor.order_status_id in (1)
           union all
           select 
             ''resolved''::text as label,count(*) as count
           from
             inventory_smart.oms_alerts_sku_loc_vendor oaslv
           inner join 
             ('||v_pa_sql||') paf
           on
             oaslv.product_code = paf.product_code
           inner join
             inventory_smart.oms_orders_recommended oor
           on
             oor.id = oaslv.ia_order_id
           where
             oaslv.is_pending_order_resolved
             and oor.order_status_id in (1)';             
  
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
  open $1 for execute v_pending_orders_sql;
  RETURN $1;
end
$function$
;
