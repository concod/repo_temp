--liquibase formatted sql
--changeset jitendra.singh@impactanalytics.co:get_oms_alert_pending_orders_details runOnChange:true stripComments:false splitStatements:false context:MTP-17206 labels:pending_alert
--comment: Pending alert
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_pending_orders_details(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql              text:='';
  v_pending_orders_sql  text:='';
  v_week_start_date     date:= date_trunc('week', current_date)::date;

begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );

 
  v_pending_orders_sql := '
    select
      *
    from (
           select
             oor.id,
             paf.product_code,
             paf.product_description,
             paf.merchandise_category,
             paf.product_channel_name,
             paf.l0_name,
             paf.l1_name,  
             paf.l2_name,
             paf.planning_ownership,
             dc.linked_store_code as loc_code,
             dc.name as loc_name,
             paf.primary_wh,
             paf.vendor_code,
             paf.vendor_name,
             ok.store_inv,
             ok.dc_inv,
             ok.system_inv,
             ok.mrpc,
             ok.open_receipt_units,
             ok.safety_stock,
             oor.order_placement_date,
             oor.order_placement_recom_date,
             oaslv.recom_receipt_date,
             oor.order_quantity,
             oor.roq_constrained,
             oor.roq_unconstrained,
             oor.expected_receipt_date,
             oor.expected_receipt_date+oor.lead_time as not_after_date, 
             --oaslv.ideal_receipt_date    
             oaslv.is_pending_order_resolved as is_resolved,
             oor.is_deleted
           from
             inventory_smart.oms_alerts_sku_loc_vendor oaslv
           inner join
             inventory_smart.oms_orders_recommended oor
           on
             oaslv.ia_order_id = oor.id
           and
             oaslv.pending_order
           inner join 
             ('||v_pa_sql||') paf
           on
             oor.product_code = paf.product_code
           inner join
             global.distribution_centres dc
           on
             oor.loc_code = dc.linked_store_code
           and
             not dc.is_deleted 
           left join
              inventory_smart.oms_kpi ok
           on
             oor.product_code = ok.product_code
           and 
             oor.loc_code = ok.loc_code
           where
             oor.order_status_id in (1)
           --and
             --oor.rop between '''||v_week_start_date||'''::date and ''' ||v_week_start_date+7||'''::date 
           --and
			 --oor.created_at >= (select max(created_at)::date from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'')
             --not oor.is_deleted
          ) X '|| global.form_table_query($3);
  
  raise notice 'v_pending_orders_sql %',v_pending_orders_sql;
  open $1 for execute v_pending_orders_sql;
  RETURN $1;
end
$function$
;
