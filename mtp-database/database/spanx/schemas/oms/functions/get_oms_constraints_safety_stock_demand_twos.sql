--liquibase formatted sql
--changeset chandra.ghosh:get_oms_constraints_safety_stock_update_19 runOnChange:true stripComments:false splitStatements:false context:MTP-51997 labels:MTP-82513.
--comment:  MTP-82513_update7
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_demand_twos(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_demand_twos(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock_demand_twos(p_product_filter jsonb, p_meta jsonb)
RETURNS TABLE (
  article varchar,
  id integer,
  x_article varchar,
  loc_code varchar,
  vendor_name varchar,
  safety_stock_method varchar,
  stock_units integer,
  service_level_pct integer,
  safety_stock_twos integer,
  demand_twos integer,
  loc_name varchar,
  l4_id text,
  l4_name text,
  color_description text,
  l0_name text,
  l1_name text,
  l2_name text,
  l3_name text,
  product_code text,
  is_wos_demand_disabled boolean
)
 LANGUAGE plpgsql
AS $function$
/*
  Get safety stock constraints
  Parameres :
              $1: Product Filter
              $2: Meta JSON for pagination


 Usage:
  select
     *
  from
      inventory_smart.get_oms_constraints_safety_stock(
      'my_cur',
      '{
          "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
          "l1_name" : [],
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
  v_meta_cls                       text:='';
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    p_product_filter
  );
  if p_meta <> '{}'
  then
    v_meta_cls := global.form_table_query(p_meta) ;
  end if;

  v_constraints_safety_stocks_sql := '
  SELECT
    X.x_article AS article,
    X.*, 
    CASE 
      WHEN ocop.order_strategy NOT IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') 
      THEN true 
      ELSE false 
    END AS is_wos_demand_disabled
FROM (
    SELECT
      ocss.id,
      ocss.article AS x_article,
      ocss.loc_code,
      ocss.vendor_name,
      ocss.safety_stock_method,
      ocss.stock_units,
      ocss.service_level_pct,
      ocss.safety_stock_twos,
      ocss.demand_twos,
      dc.name AS loc_name,
      MAX(paf.l4_id) AS l4_id,
      MAX(paf.l4_name) AS l4_name,
      MAX(paf.color_description) AS color_description,
      MAX(paf.l0_name) AS l0_name,
      MAX(paf.l1_name) AS l1_name,
      MAX(paf.l2_name) AS l2_name,
      MAX(paf.l3_name) AS l3_name,
      MAX(paf.product_code) AS product_code
    FROM
      inventory_smart.oms_constraints_safety_stock ocss
    INNER JOIN
      "global".product_attributes_filter paf
      ON ocss.article = paf.article
    INNER JOIN
      global.distribution_centres dc
      ON ocss.loc_code = dc.linked_store_code
    AND NOT dc.is_deleted AND paf.active AND paf.ordering = ''Y''
    ' || v_pa_sql || '
    GROUP BY 1,2,3,4,5,6,7,8,9,10
) X
LEFT JOIN (
    SELECT article, MAX(order_strategy) AS order_strategy
    FROM inventory_smart.oms_constraints_order_policy
    GROUP BY article
) ocop 
  ON X.x_article = ocop.article
WHERE ocop.order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'')
' || v_meta_cls;


  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;
