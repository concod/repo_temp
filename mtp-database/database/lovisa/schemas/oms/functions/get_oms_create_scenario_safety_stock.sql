--liquibase formatted sql
--changeset mssprakash.yashwanth:create_scenario_safety_stock_vs_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-59069_8
--comment: extracted DC filter from product filter
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
  v_product_filter_for_pa jsonb;
  v_dc_filter_cls text := '';
begin
  -- Pop global DC filter from product filter: product_attribute_query can contain
  -- dimension "linked_store_codes" (e.g. DC codes). Use only product dimensions for
  -- product_attributes_filter; apply DC filter separately in WHERE.
  v_product_filter_for_pa := ($1 -> 'product') - 'linked_store_codes';
  
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    v_product_filter_for_pa
  );
  v_sa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $1 -> 'store'
  );
  
  -- Build DC filter clause if linked_store_codes exists in product filter
  IF ($1 -> 'product') ? 'linked_store_codes' 
     AND jsonb_typeof(($1 -> 'product')->'linked_store_codes') = 'array'
     AND jsonb_array_length(($1 -> 'product')->'linked_store_codes') > 0
     AND jsonb_array_length((($1 -> 'product')->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND ocss.loc_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[]) '
      INTO v_dc_filter_cls
      FROM jsonb_array_elements_text((($1 -> 'product')->'linked_store_codes')->0->'values') AS elem;
  END IF;

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
        concat(paf.l4_name, dc.dc_code) AS id,
        l4_name as product_code,
		    l4_name as article,
        ocss.loc_code,
        dc.name AS dc_name,
        saf.store_name,
        ocss.safety_stock_method,
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
        (SELECT distinct  l1_name, l2_name, l3_name, l4_name, size, style_name , range_usa, range_eu_uk, range_au_nz, range_asia, range_africa, active, vendor as vendor_name, is_deleted 
         FROM global.product_attributes_filter ' || v_pa_sql || ') paf
      ON
        ocss.article = paf.l4_name 
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
      WHERE 1=1
        ' || v_dc_filter_cls || '
    ) row ' || v_meta_cls;
	
	raise notice 'v_constraints_safety_stocks_sql: %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;
