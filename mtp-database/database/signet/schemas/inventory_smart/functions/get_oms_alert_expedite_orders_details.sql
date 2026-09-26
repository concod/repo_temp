--liquibase formatted sql
--changeset liquibase:get_oms_alert_expedite_orders_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_alert_expedite_orders_details
--rollback: SELECT 1
--changeset aman.lakkoju:Added new_sku_flag column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-28188
--comment: Added new_sku_flag column
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql               text:='';
  v_expedite_orders_sql  text:='';
 
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_expedite_orders_sql := '
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
        paf.sku_grade,
              paf.new_sku_flag,
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
              oor.inventory_deficit_agg,
		          oor.lost_sales_agg,
        oor.roq_unconstrained,
        ok.open_receipt_units,
        oasl.recom_receipt_date,
              ok.safety_stock,
              (select count(*) from inventory_smart.oms_po_master po where po.product_code = paf.product_code ) as po_count,
              oasl.is_expedite_order_resolved as is_resolved
            from
              inventory_smart.oms_alerts_sku_loc oasl
            inner join 
              ('||v_pa_sql||') paf
            on
              oasl.product_code = paf.product_code
            inner join
              global.distribution_centres dc
            on
              oasl.loc_code = dc.linked_store_code
            and
              not dc.is_deleted
            left join
                inventory_smart.oms_kpi ok
            on
              oasl.product_code = ok.product_code 
            and
              oasl.loc_code = ok.loc_code
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
              oasl.expedite_order
            ) X '|| global.form_table_query($3);
    
    raise notice 'v_expedite_orders_sql %',v_expedite_orders_sql;
    open $1 for execute v_expedite_orders_sql;
    RETURN $1;
  end
  $function$
  ;
