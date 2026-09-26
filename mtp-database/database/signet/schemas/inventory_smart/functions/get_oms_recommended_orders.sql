--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalyitcs.co:Added country_origin column runOnChange:true stripComments:false splitStatements:false context:MTP-119374_1 labels:added_country_origin_column
--comment: Added country_origin column and dc_unavailable column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, text , text );
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_recommended_orders(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get orders from the inventory_smart.oms_orders_recommended as per product, ROP and order status and type filters 
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Date filter
               $4: Order Status ID (source table: invebtory_smart.oms_order_status_master)
               $5: Meta JSON for pagination
               $6: Recommended(R)/All(A)
               $7: Include_custom_orders
               $8: Include only current cycle orders or all orders
   
  Usage:
  select
      *
   from
       inventory_smart.get_oms_recommended_orders(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
           "l2_name" : [],
           "product_description" : [],
           "planning_ownership" : [],
           "merchandise_category" :[],
           "merchandise_brand": []
        }',
        '[{"attribute_name": "ROP", "start_date": "0001-01-01", "end_date": "9999-12-31"}, {"attribute_name": "recom_receipt_date", "start_date": "0001-01-01", "end_date": "9999-12-31"}]',
         0,
         '{
           "search": [],
           "sort": [],
           "range": [],
           "limit": {
                      "limit": 10,
                       "page": 2
                    }
       }',
       'R',
       0
      );
  fetch all in "my_cur";
 */
 declare
   v_pa_sql                  text:='';
   v_recommended_orders_sql  text:='';
   v_recom_filter            text:='';
   v_meta_cls                text:='';
   v_rop_filter              text:='';
   v_include_custom_order  	 text:='';
   v_date_filter             text:='';
   v_flow_filter             text:='';
   v_date_rec                record;
   v_curr_cycle_order        text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $6  = 'R' 
   then
     v_recom_filter :='and oor.roq_unconstrained > 0';
   end if;
  
 
   if $5 <> '{}'
   then 
     v_meta_cls := global.form_table_query($5) ;
   end if;
  
  if not $7
  then 
   v_include_custom_order := 'and oor.order_gen_type in (''Recommended'',''Edited'',''Scenario'')';
  end if;

  if $8
  then
    v_curr_cycle_order := 'and oor.created_at >= (select max(created_at)::date from inventory_smart.oms_orders_recommended where order_gen_type=''Recommended'')';
  end if;
 
  for v_date_rec in select * from jsonb_to_recordset($3) as x(attribute_name text, "start_date" date, "end_date" date)
 	loop
 		v_date_filter := v_date_filter||' and oor.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
 	end loop;
   
  
   raise notice 'v_recom_filter %',v_recom_filter;
  
 v_recommended_orders_sql := '
     select
       *
     from (
            select 
              oor.order_gen_type,
              oor.id,
              oor.product_code,
              oor.loc_code,
              oor.vendor_code,
              oor.rop,
              paf.l0_name,
              paf.l1_name,
              paf.l2_name,
              paf.product_description,
              paf.planning_ownership,
              paf.merchandise_category,
              paf.new_sku_flag,
              paf.country_origin,
              dc.name as loc_name,
              paf.primary_wh,
              paf.vendor_name,
              oor.grade,
              oor.order_quantity,
              oor.raw_roq,
              oor.target_wos,
              oor.unit_cost,
              oor.roq_constrained,
              round((oor.roq_constrained*oor.unit_cost)::numeric, 2) as roq_constrained_order_cost,
              oor.roq_unconstrained,
              round((oor.roq_unconstrained*oor.unit_cost)::numeric, 2) as roq_unconstrained_order_cost,
              oor.order_placement_date,
              oor.order_placement_recom_date,
              oor.expected_receipt_date,
              oor.rop_ideal,
              oor.lead_time,
              oor.effective_lead_time,
              oor.min_order_quantity,
              oor.max_order_quantity,
              oor.pack_size,
              oor.inventory_hold,
              oor.order_status_id,
              oor.created_by,
              oor.created_at,
              oor.updated_by,
              oor.updated_at,
              oor.approve_by_date,
              oor.not_after_date,
              oor.not_before_date,
              oor.editable_not_before_date,
              oor.editable_not_after_date,
              case when (oor.order_type = ''Immediate'' or oor.order_type = ''Immediate (Shifted)'') then (oor.target_qty+oor.elt_projected_safety_stock) else oor.orders_upto_qty end as orders_upto_qty,
		          oor.forecasted_sales,
              oor.elt_projected_bop,
			        oor.elt_projected_safety_stock,
              oor.order_type,
              oor.excess_inv,
              coalesce (oor.unmapped_store_inventory,0) as unmapped_store_inventory,
              coalesce( (oor.excess_inv + oor.unmapped_store_inventory),0) as total_excess_inv,
              kpi.store_inv,
              kpi.dc_inv,
              kpi.dc_unavailable,
              kpi.system_inv,
              kpi.mrpc,
              kpi.open_receipt_units,
              kpi.safety_stock,
              ocss.safety_stock_method,
              kpi.adjusted_forecast_qty_4w,
              kpi.adjusted_forecast_qty_4w_lc,
              kpi.adjusted_forecast_qty_8w,
              kpi.adjusted_forecast_qty_8w_lc,
              kpi.adjusted_forecast_qty_12w,
              kpi.adjusted_forecast_qty_12w_lc,
              kpi.wos,
              kpi.target_service_level*100 as target_service_level,
              ocam.future_conversion_date,
              ocam.cancelled_memo_po_qty,
              ocam.committed_not_oo_qty,
              ocss.service_level_pct,
              oor.store_groups,
		  	      oor.store_counts,
              oor.lost_sales_agg_2*(paf.price-paf.cost) AS lost_sales_agg_2, 
              CASE
                WHEN oor.order_status_id in (1,2,-1) or oor.is_deleted  THEN true
              ELSE false
              END AS checkbox_disabled
            from
              inventory_smart.oms_orders_recommended oor
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
              inventory_smart.oms_KPI kpi
            on
              oor.product_code  = kpi.product_code
            and
              oor.loc_code = kpi.loc_code
            left join
                inventory_smart.oms_constraints_asset_memo ocam
              on 
                oor.product_code = ocam.product_code 
              and  
                oor.vendor_code = ocam.vendor_code 
              and  				
                oor.loc_code = ocam.loc_code 
            left join
              inventory_smart.oms_constraints_safety_stock ocss
            on
              oor.product_code = ocss.product_code
            and
              oor.loc_code = ocss.loc_code
            where
              oor.order_status_id = any('''||concat($4)||'''::integer[])
              '||v_curr_cycle_order||'
              '||v_include_custom_order||'
              '||v_date_filter||'
              '|| v_recom_filter ||'
          ) X '||v_meta_cls;
   
   raise notice 'v_recommended_orders_sql %',v_recommended_orders_sql;
   open $1 for execute v_recommended_orders_sql;
   RETURN v_recommended_orders_sql;
 end
 $function$
;
