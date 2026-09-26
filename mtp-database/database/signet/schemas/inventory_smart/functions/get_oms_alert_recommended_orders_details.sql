--liquibase formatted sql
--changeset liquibase:get_oms_alert_recommended_orders_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_recommended_orders_details
--rollback: SELECT 1
--changeset aman.lakkoju:Added raw_roq column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35034
--comment:Added raw_roq column
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommended_orders_details(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                  text:='';
  v_recommended_orders_sql  text:='';
  v_week_start_date         date:= date_trunc('week', current_date)::date;

begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );

 
  v_recommended_orders_sql := '
    select
       *
     from (
            select
              oaslv.id,
              oor.id as order_id,
              paf.product_code,
              paf.product_description,
              paf.merchandise_category,
              paf.new_sku_flag,
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
              oor.raw_roq,
              oor.expected_receipt_date,
              oor.grade,
              oor.not_after_date,
              oor.not_before_date,
              oaslv.is_recom_order_resolved as is_resolved,
              oor.is_deleted
            from
              inventory_smart.oms_alerts_sku_loc_vendor oaslv
            inner join
              inventory_smart.oms_orders_recommended oor
            on
              oaslv.ia_order_id =oor.id
            and
              oaslv.recom_order
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
             oor.order_status_id IN (0,1,-1,2,3) AND oor.order_gen_type!=''Manual'' AND
 			 oor.created_at >= (select max(created_at)::date from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'')
            --and
              --not oor.is_deleted
           ) X  '|| global.form_table_query($3);
  
  raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
  open $1 for execute v_recommended_orders_sql;
  RETURN $1;
end
$function$
;
