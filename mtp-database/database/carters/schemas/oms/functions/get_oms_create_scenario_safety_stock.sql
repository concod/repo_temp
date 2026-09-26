--liquibase formatted sql
--changeset chaitanyaprasad:create_scenario_safety_stock_carters_12 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-59069_11
--comment: new sp for fetching safety stock data in create scenario for carters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_create_scenario_safety_stock(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_create_scenario_safety_stock(jsonb, jsonb)
RETURNS TABLE (result jsonb)
 LANGUAGE plpgsql
AS $function$
/*
  Get safety stock data in create scenario
  Parameters:
              $1: Product Filter
              $2: Meta JSON for pagination

 Usage:
  select
     *
  from
      inventory_smart.get_oms_create_scenario_safety_stock(
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
 */
declare
  v_pa_sql                         text:='';
  v_constraints_safety_stocks_sql  text:='';
  v_meta_cls text:=''; 
  v_sa_sql text:='';
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    $1 -> 'product'
  );
  v_sa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $1 -> 'store'
  );

  if $2 <> '{}'
   then 
     v_meta_cls := global.form_table_query($2) ;
  end if;

    v_constraints_safety_stocks_sql := '
    select
      row_to_json(row)::jsonb AS result
    from (
           select 
            paf.*,
            concat(paf.product_code, ocss.channel) as id,
            ocss.loc_code,
            ocss.channel,
            CASE 
                WHEN ocss.safety_stock_method = ''Safety Stock Unit'' THEN  ''User Input'' 
                ELSE ocss.safety_stock_method
            END as safety_stock_method,
            ocss.stock_units,
            ocss.service_level_pct,
            ocss.safety_stock_twos,
            ocss.demand_twos,
            ocss.created_by,
            ocss.created_at,
            ocss.updated_by,
            ocss.updated_at,
            paf.primary_vendor_dsc as vendor_name
           from
             inventory_smart.oms_constraints_safety_stock ocss
           inner join  
             (select product_code,style, article ,size, l2_name, l3_name, l4_name, l5_name,collection,class,season,style_description,primary_vendor_dsc,ordering, active, is_deleted from global.product_attributes_filter ' || v_pa_sql || ') paf
           on
             ocss.article = paf.article
           and
             paf.ordering = ''Y''
        inner join 
      (select distinct size, loc_code, article from 
      inventory_smart.oms_orders_recommended) oor
      on oor.size = paf.size and oor.loc_code = ocss.loc_code and oor.article = paf.article
      
         ) row '|| v_meta_cls;
  
  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;
