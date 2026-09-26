--liquibase formatted sql
--changeset aman.lakkoju:Added a condition active = true runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24226.
--comment: Added a condition active = true.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_order_policy(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_order_policy(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get order policy constraints
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Meta JSON for pagination
 
   
  Usage:
   select
      *
   from
       inventory_smart.get_oms_constraints_order_policy(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
           "l2_name" : [],
           "product_description" : [],
           "planning_ownership" : [],
           "merchandise_category" :[],
           "merchandise_brand": [],
           "product_channel_name": [],
           "vendor_code": [],
           "vendor_name": []
        }',
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
   v_pa_sql                            text:='';
   v_oms_constraints_order_policy_sql  text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_oms_constraints_order_policy_sql := '
     select
       *
     from (
            select 
              paf.*,
              ocss.id,
              ocss.replenishment_strategy,
              ocss.order_cycle,
              ocss.lot_sizing_strategy,
              ocss.wos,
              ocss.created_by,
              ocss.created_at,
              ocss.updated_by,
              ocss.updated_at      
            from
              inventory_smart.oms_constraints_order_policy ocss
            inner join 
              ('||v_pa_sql||') paf
            on
              ocss.product_code = paf.product_code and paf.ordering = ''Y'' and paf.active
            where paf.product_code not in (select distinct old_product_code from inventory_smart.oms_style_mapping_table)
          ) X '|| global.form_table_query($3);
   
   raise notice 'v_oms_constraints_order_policy_sql %',v_oms_constraints_order_policy_sql;
   open $1 for execute v_oms_constraints_order_policy_sql;
   RETURN v_oms_constraints_order_policy_sql;
 end
 $function$
;
