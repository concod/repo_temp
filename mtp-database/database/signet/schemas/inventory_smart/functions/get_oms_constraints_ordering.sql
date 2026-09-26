--liquibase formatted sql
--changeset jitendra.singh@impactanalytics.co:get_oms_constraints_ordering runOnChange:true stripComments:false splitStatements:false context:MTP-17209 labels:bug_fix_vendor_pack_rename
--comment: rename vendor_pack_size to avoid ambiguity
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_ordering(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_ordering(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get ordering constraints
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: Meta JSON for pagination

  
 Usage:
  select
     *
  from
      inventory_smart.get_oms_constraints_ordering(
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
   v_pa_sql                  text:='';
   v_constraints_ordering_sql  text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_constraints_ordering_sql := '
     select
       *
     from (
            select 
              paf.*,
              paf.supplier_pack_size::int as vendor_pack_size,
              oco.min_order_quantity,
              oco.max_order_quantity,
              oco.created_by,
              oco.created_at,
              oco.updated_by,
              oco.updated_at           
            from
              inventory_smart.oms_constraints_ordering oco
            inner join 
              ('||v_pa_sql||') paf
            on
              oco.product_code = paf.product_code 
            and
              oco.vendor_code = paf.vendor_code and paf.ordering = ''Y''
          ) X '|| global.form_table_query($3);
   
   raise notice 'v_constraints_ordering_sql %',v_constraints_ordering_sql;
   open $1 for execute v_constraints_ordering_sql;
   RETURN $1;
 end
 $function$
;
