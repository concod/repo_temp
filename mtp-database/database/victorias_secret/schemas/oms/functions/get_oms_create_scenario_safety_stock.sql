--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_create_scenario_safety_stock_vs_2 runOnChange:true stripComments:false splitStatements:false context:MTP-117760 labels:MTP-117760-2
--comment: Updated to use global.form_main_table_filters to fix product_codes column error

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
  v_pa_sql :=global.form_main_table_filters(
    'product_attributes_filter',
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
  with paf as (
		SELECT product_code, article, size, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, 
    l6_name, masterstyle_descr, color, subbrand_description, subbrand_code_desc, collection, 
    current_assortment_group, product_lifecycle, flex_style, generic,
     sizes_mat, form, user_defined_1, user_defined_2, user_defined_3, 
     user_defined_4, user_defined_5, user_defined_6, active, is_deleted 
         FROM global.product_attributes_filter ' || v_pa_sql || '),
     saf as (
     	SELECT store_code, store_name, active
         FROM global.store_attributes_filter ' || v_sa_sql || '),
     oor as (
     	select distinct oor1.size, oor1.loc_code, oor1.article from 
	      inventory_smart.oms_orders_recommended oor1 inner join paf on paf.size = oor1.size and oor1.article = paf.article
		)
    SELECT
      row_to_json(row)::jsonb AS result
    FROM (
      SELECT 
        paf.*,
        --concat(paf.product_code, ocss.loc_code) AS id,
        ROW_NUMBER() OVER (ORDER BY paf.product_code, ocss.loc_code) AS id,
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
        ocss.updated_at,
        ast."order" as size_order
      FROM
        inventory_smart.oms_constraints_safety_stock ocss
      INNER JOIN  
         paf
      ON
        ocss.article = paf.article  AND paf.active
      INNER JOIN
        global.distribution_centres dc
      ON
        ocss.loc_code = dc.linked_store_code
      AND
        NOT dc.is_deleted 
      INNER JOIN 
        saf
      ON ocss.loc_code = saf.store_code AND saf.active
      inner join 
      oor
      on oor.loc_code = ocss.loc_code
      and oor.article = ocss.article
      and oor.size = paf.size 
      LEFT JOIN (
        select product_code, size, min("order") as "order"
        from inventory_smart.article_status_tag
        group by product_code, size
      ) ast on ast.product_code = paf.product_code and ast.size = paf.size
    ) row ' || CASE WHEN v_meta_cls IS NULL OR v_meta_cls = '' THEN ' ORDER BY size_order ASC NULLS LAST' ELSE v_meta_cls END;

  raise notice 'v_constraints_safety_stocks_sql: %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;