--liquibase formatted sql
--changeset liquibase:get_oms_alert_need_before_next_roq_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_need_before_next_roq_details
--rollback: SELECT 1
--changeset aman.lakkoju:Added lead_time colulmn runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35179
--comment: Added lead_time colulmn
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_need_before_next_roq_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_need_before_next_roq_details(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                    text:='';
  v_need_before_next_roq_sql  text:='';

begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_need_before_next_roq_sql := '
    select
      *
    from (
            select
              oasl.id,
              paf.product_code,
              paf.product_description,
              paf.merchandise_category,
              paf.product_channel_name,
              paf.l0_name,
              paf.l1_name,  
              paf.l2_name,
              paf.planning_ownership,
        paf.sku_grade,
              paf.new_sku_flag,
              dc.linked_store_code as loc_code,
              dc.name as loc_name,
              paf.primary_wh,
              paf.vendor_code,
              paf.vendor_name,
              oclt.lead_time,
              ok.store_inv,
              ok.dc_inv,
              ok.system_inv,
              ok.mrpc,
              oor.inventory_deficit_agg,
		          oor.lost_sales_agg_1,
              ok.open_receipt_units,
              ok.safety_stock,
        oasl.next_order_cycle_date,	
        oasl.recom_receipt_date,
        oor.roq_unconstrained,
              oasl.is_need_before_next_roq_resolved as is_resolved
            from
              inventory_smart.oms_alerts_sku_loc oasl
            inner join 
              ('||v_pa_sql||') paf
            on
              oasl.product_code = paf.product_code
            left join
                inventory_smart.oms_kpi ok
            on
              paf.product_code = ok.product_code
            inner join
              global.distribution_centres dc
            on
              ok.loc_code = dc.linked_store_code
            and
              not dc.is_deleted
            left join 
              inventory_smart.oms_constraints_lead_time oclt 
            on 
              paf.product_code = oclt.product_code
	          and 
              paf.vendor_code = oclt.vendor_code
      inner join 
        (select a.* from inventory_smart.oms_orders_recommended as a
         inner join 
         (select product_code,loc_code,created_at,min(rop) as rop from inventory_smart.oms_orders_recommended 
          where created_at = (select max(created_at) from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'')  group by 1,2,3) b
         using(product_code,loc_code,rop)
         ) oor 
      on 
        oasl.product_code = oor.product_code 
      and 
        oasl.loc_code = oor.loc_code 	 
      and 
        oor.created_at = (select max(created_at) from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'') 
            where
              oasl.need_before_next_roq
            ) X '|| global.form_table_query($3);
    
    raise notice 'v_need_before_next_roq_sql %',v_need_before_next_roq_sql;
    open $1 for execute v_need_before_next_roq_sql;
    RETURN $1;
  end
  $function$
  ;
