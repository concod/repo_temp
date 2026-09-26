--liquibase formatted sql
--changeset chaitanyaprasad:create_scenario_safety_stock_briscoes_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89544-1
--comment: new sp for fetching safety stock data in create scenario for briscoes and added store filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_create_scenario_safety_stock(jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_create_scenario_safety_stock(jsonb, jsonb)
 RETURNS TABLE(result jsonb)
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
    SELECT
      row_to_json(row)::jsonb AS result
    FROM (
      SELECT 
        paf.*,
        concat(paf.product_code, ocss.loc_code) AS id,
        ocss.loc_code,
        dc.name AS loc_name,
        saf.store_name,
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
        ocss.updated_at
      FROM
        inventory_smart.oms_constraints_safety_stock ocss
      INNER JOIN  
        (SELECT  product_code, article, size, primary_vendor_name as vendor_name, l0_name, l1_name, l3_name, l4_name, l5_name, style_desc, active, is_deleted,product_description,l2_name,primary_trait_desc 
         FROM global.product_attributes_filter ' || v_pa_sql || ') paf
      ON
        ocss.article = paf.article 
      INNER JOIN
        global.distribution_centres dc
      ON
        ocss.loc_code = dc.linked_store_code
      AND
        NOT dc.is_deleted AND paf.active
      INNER JOIN 
        (SELECT store_code, store_name 
         FROM global.store_attributes_filter ' || v_sa_sql || ') saf
      ON ocss.loc_code = saf.store_code
       inner join
      (select distinct size, loc_code, article from 
      inventory_smart.oms_orders_recommended) oor
      on oor.size = paf.size and oor.loc_code = ocss.loc_code and oor.article = paf.article
      
    ) row ' || v_meta_cls;

  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;