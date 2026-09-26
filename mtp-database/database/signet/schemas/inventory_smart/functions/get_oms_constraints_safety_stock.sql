--liquibase formatted sql
--changeset shreyansh.jain:new inventory_hold readded runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36985.
--comment: new inventory_hold readded.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock(input refcursor, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
  Get safety stock constraints
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: Meta JSON for pagination

  
 Usage:
  select
     *
  from
      inventory_smart.get_oms_constraints_safety_stock(
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
  v_pa_sql                         text:='';
  v_constraints_safety_stocks_sql  text:='';
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_constraints_safety_stocks_sql := '
    select
      *
    from (
           select 
             paf.*,
             ocss.id,
             ocss.loc_code,
             dc.name as loc_name,
             ocss.safety_stock_method,
             ocss.stock_units,
             ocss.service_level_pct,
             ocss.max_stock_units,
             ocss.inventory_hold,
             ocss.created_by,
             ocss.created_at,
             ocss.updated_by,
             ocss.updated_at
           from
             inventory_smart.oms_constraints_safety_stock ocss
           inner join 
             ('||v_pa_sql||') paf
           on
             ocss.product_code = paf.product_code 
           inner join
             global.distribution_centres dc
           on
             ocss.loc_code = dc.linked_store_code
           and
             not dc.is_deleted and paf.ordering = ''Y'' and paf.active
          where paf.product_code not in (select distinct old_product_code from inventory_smart.oms_style_mapping_table)
         ) X '|| global.form_table_query($3);
  
  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  open $1 for execute v_constraints_safety_stocks_sql;
  RETURN v_constraints_safety_stocks_sql;
end
$function$
;
