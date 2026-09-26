--liquibase formatted sql
--changeset liquibase:get_oms_alert_recommeded_orders runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_recommeded_orders
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
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_recom_orders_sql := '
           select 
             ''total''::text as label,count(*) as count
           from
             inventory_smart.oms_alerts_sku_loc_vendor oaslv
           inner join 
             ('||v_pa_sql||') paf
           on
             oaslv.product_code = paf.product_code
           where
             oaslv.recom_order
           union all
           select 
             ''resolved''::text as label,count(*) as count
           from
             inventory_smart.oms_alerts_sku_loc_vendor oaslv
           inner join 
             ('||v_pa_sql||') paf
           on
             oaslv.product_code = paf.product_code
           where
             oaslv.is_recom_order_resolved';
  
  raise notice 'v_recom_orders_sql %',v_recom_orders_sql;
  open $1 for execute v_recom_orders_sql;
  RETURN $1;
end
$function$
;
