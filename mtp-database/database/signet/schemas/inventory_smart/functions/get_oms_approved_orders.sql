--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalyitcs.co:Added country_origin column runOnChange:true stripComments:false splitStatements:false context:MTP-113503 labels:added_country_origin_column MTP-119289
--comment: Added country_origin column
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_approved_orders(input refcursor, jsonb, date, date, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get orders from the inventory_smart.oms_orders_approved as per product, ROP 
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: ROP From Date
              $4: ROP To Date
              $5: Meta JSON for pagination

  
 Usage:
  select
     *
  from
      inventory_smart.get_oms_approved_orders(
      'my_cur',
      '{
          "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
          "l1_name" : [],
          "l2_name" : [],
          "product_description" : [],
          "planning_ownership" : [],
          "merchandise_category" :[],
          "merchandise_brand": [],
          "vendor_code": [],
          "vendor_name": []
       }',
       '2023-1-07',
       '2023-1-25',
        '{
          "search": [],
          "sort": [],
          "range": [],
          "limit": {
                     "limit": 10,
                      "page": 2
                   }
      }'
     );
 fetch all in "my_cur";
 */
declare
  v_pa_sql                  text:='';
  v_approved_orders_sql     text:='';
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_approved_orders_sql := '
    select
      *
    from (
           select 
             ooa.order_gen_type,
             ooa.id,
             ooa.product_code,
             ooa.loc_code,
             ooa.vendor_code,
             ooa.rop,
             paf.l0_name,
             paf.l1_name,
             paf.l2_name,
             paf.product_description,
             paf.planning_ownership,
             paf.merchandise_category,
             paf.new_sku_flag,
             paf.merchandise_brand,
             dc.name as loc_name,
             paf.primary_wh,
             paf.vendor_name,
             paf.country_origin,
             ooa.grade,
             ooa.order_quantity,
             ooa.unit_cost,
             round((ooa.unit_cost * ooa.order_quantity)::numeric, 2)as order_cost,
             --round((ooa.unit_cost * ooa.order_quantity), 2) as order_cost,
             ooa.roq_constrained,
             ooa.roq_unconstrained,
             ooa.order_placement_date,
             ooa.order_placement_recom_date,
             ooa.expected_receipt_date,
             ooa.not_after_date,
             ooa.rop_ideal,
             ooa.lead_time,
             ooa.effective_lead_time,
             ooa.store_inv,
             ooa.dc_inv,
             ooa.system_inv,
             ooa.mrpc,
             ooa.min_order_quantity,
             ooa.max_order_quantity,
             ooa.pack_size,
             ooa.inventory_hold,
             ooa.order_status_id,
             ooa.created_by,
             ooa.created_at,
             ooa.updated_by,
             ooa.updated_at,
             ooa.edit_by_date,
             ooa.comment,

			 ooa.not_before_date
           from
             inventory_smart.oms_orders_approved ooa
           inner join 
             ('||v_pa_sql||') paf
           on
             ooa.product_code = paf.product_code
           inner join
             global.distribution_centres dc
           on
             ooa.loc_code = dc.linked_store_code
           and
             not dc.is_deleted 
           where
			 -- Removing date filter for now, to be implemented in future
             -- ooa.ROP between '||''''||$3||''''||'::date and '||''''||$4||''''||'::date
			ooa.order_placement_date >= (CURRENT_DATE - interval ''28 day'')::date
            and  not ooa.is_deleted
         ) X '|| global.form_table_query($5);
  
  raise notice 'v_approved_orders_sql %',v_approved_orders_sql;
  open $1 for execute v_approved_orders_sql;
  RETURN $1;
end
$function$
;
