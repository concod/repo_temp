--liquibase formatted sql
--changeset liquibase:get_oms_alert_count_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_count_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_count_summary(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_count_summary(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_alert_count_sql     text:='';
  v_week_start_date     date:= date_trunc('week', current_date)::date;
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_alert_count_sql := '
   select is_resolved, sum(count) as alert_count
   from 
   (   
   select
     is_recom_order_resolved as is_resolved,
     count(*) 
   from inventory_smart.oms_alerts_sku_loc_vendor oaslv
   inner join 
     ('||v_pa_sql||') paf
   on
     oaslv.product_code = paf.product_code 
   group by
     is_recom_order_resolved
   union all
   select
     is_pending_order_resolved as is_resolved,
     count(*) 
   from inventory_smart.oms_alerts_sku_loc_vendor oaslv
   inner join 
     ('||v_pa_sql||') paf
   on
     oaslv.product_code = paf.product_code 
   group by
     is_pending_order_resolved
   union all
   select
     is_expedite_order_resolved as is_resolved,
     count(*) 
   from inventory_smart.oms_alerts_sku_loc oasl 
   inner join 
     ('||v_pa_sql||') paf
   on
     oasl.product_code = paf.product_code 
   group by
     is_expedite_order_resolved
   union all
   select
     is_need_before_next_roq_resolved as is_resolved,
     count(*) 
   from inventory_smart.oms_alerts_sku_loc oasl 
   inner join 
     ('||v_pa_sql||') paf
   on
     oasl.product_code = paf.product_code 
   group by
     is_need_before_next_roq_resolved
   ) a group by is_resolved';

  raise notice 'v_alert_count_sql %',v_alert_count_sql;
  open $1 for execute v_alert_count_sql;
  RETURN $1;
end
$function$
;
