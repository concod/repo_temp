--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalyitcs.co:Added country_origin column runOnChange:true stripComments:false splitStatements:false context:MTP-92478 labels:added_country_origin_column
--comment: Added country_origin column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
   v_pa_sql             text:='';
   v_manual_orders_sql  text:='';
   v_current_date       date:= current_date;
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_manual_orders_sql := '
     select
       *
     from (
            select 
              paf.product_code,
              paf.product_description,
              paf.merchandise_category,
              paf.product_channel_name,
              paf.l0_name,
              paf.l1_name,  
              paf.l2_name,
              paf.planning_ownership,
              paf.new_sku_flag,
              dc.linked_store_code as loc_code,
              dc.name as loc_name,
              paf.primary_wh,
              paf.vendor_code,
              paf.vendor_name,
              paf.sku_grade as grade,
              paf.country_origin,
              oco.min_order_quantity,
              oco.max_order_quantity,
              round(paf.product_cost_price_per_unit::numeric, 2) as product_cost_price_per_unit,
              round(paf.cost::numeric, 2) as cost,
              paf.supplier_pack_size::int as supplier_pack_size,
              ok.store_inv,
              ok.dc_inv,
              ok.system_inv,
              ok.mrpc,
              ok.open_receipt_units,
              ok.safety_stock,
              ok.elt_safety_stock,
              oclt.lead_time,
              ocss.service_level_pct,
              --8 lead_time,
              (select current_date) as order_placement_date,
              --Lead time is in weeks so mul by 7
              --(select current_date+(8*7)) as not_before_date,
              --(select current_date+(8*7)+7) as not_after_date,
              (select current_date+(oclt.lead_time*7)) as not_before_date,
              (select current_date+(oclt.lead_time*7)+7) as not_after_date,
              ocss.inventory_hold                  
            from
              ('||v_pa_sql||') paf
            left join
               (select a.*,coalesce(round(a.ss_base*b.coeff),0) as elt_safety_stock from inventory_smart.oms_kpi as a left join inventory_smart.oms_sl_coeff as b on a.target_service_level=b.service_level ) ok
            on
              paf.product_code = ok.product_code
 		  inner join
               (select product_code, loc_code from 
                inventory_smart.oms_kpi) as paf_loc
            on paf.product_code = paf_loc.product_code
           inner join
              global.distribution_centres dc
            on
              paf_loc.loc_code = dc.linked_store_code
            and
              not dc.is_deleted
            left join
              inventory_smart.oms_constraints_lead_time oclt
            on
              oclt.product_code = paf.product_code
            and
              oclt.loc_code = dc.linked_store_code 
            and        
              oclt.vendor_code = paf.vendor_code 
            left join
              inventory_smart.oms_constraints_ordering oco
            on
              oco.product_code = paf.product_code
            and        
              oco.vendor_code = paf.vendor_code            
            left join
              inventory_smart.oms_constraints_safety_stock ocss
            on
              ocss.product_code = paf.product_code
            and
              ocss.loc_code = dc.linked_store_code
          ) X '|| global.form_table_query($3);
   
   raise notice 'v_manual_orders_sql %',v_manual_orders_sql;
   open $1 for execute v_manual_orders_sql;
   RETURN $1;
 end
 $function$
;
