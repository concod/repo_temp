--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_constraints_safety_stock_vs_5 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Added new columns from product_attributes_filter table.

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock(p_product_filter jsonb, p_meta jsonb)
 RETURNS TABLE (
  article varchar,
  id integer,
  x_article varchar,
  loc_code varchar,
  safety_stock_method varchar,
  stock_units integer,
  service_level_pct integer,
  safety_stock_twos integer,
  demand_twos integer,
  updated_by varchar,
  l6_id text,
  l6_name text,
  l0_name text,
  l2_name text,
  l3_name text,
  l4_name text,
  l5_name text,
  subbrand_code_desc text,
  collection text,
  product_lifecycle text,
  product_code text,
  color text,
  current_assortment_group text,
  flex_style text,
  generic text,
  sizes_mat text,
  form text,
  masterstyle_descr text,
  user_defined_1 text,
  user_defined_2 text,
  user_defined_3 text,
  user_defined_4 text,
  user_defined_5 text,
  user_defined_6 text,
  updated_at timestamptz,
  is_wos_demand_disabled boolean
 )
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                         text := '';
  v_constraints_safety_stocks_sql  text := '';
  v_meta_cls                       text := '';
  v_gen_random_uuid                text := gen_random_uuid()::varchar;
begin
  v_pa_sql := global.form_main_table_filters('product_attributes_filter', p_product_filter);
  v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');
  
  if p_meta <> '{}' then
    v_meta_cls := global.form_table_query(p_meta);
  end if;

  v_constraints_safety_stocks_sql := '
    SELECT 
      X.x_article as article,
      X.*, 
      CASE 
        WHEN ocop.order_strategy NOT IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') 
        THEN TRUE 
        ELSE FALSE 
      END AS is_wos_demand_disabled
    FROM (
      SELECT
        ocss.id,
        ocss.article as x_article,
        ocss.loc_code,
        ocss.safety_stock_method,
        ocss.stock_units,
        ocss.service_level_pct,
        ocss.safety_stock_twos,
        ocss.demand_twos,
        u1.name as updated_by,
        MAX(paf.l6_id) AS l6_id,
        MAX(paf.l6_name) AS l6_name,
        MAX(paf.l0_name) AS l0_name,
        MAX(paf.l2_name) AS l2_name,
        MAX(paf.l3_name) AS l3_name,
        MAX(paf.l4_name) AS l4_name,
        MAX(paf.l5_name) AS l5_name,
        MAX(paf.subbrand_code_desc) AS subbrand_code_desc,
        MAX(paf.collection) AS collection,
        MAX(paf.product_lifecycle) AS product_lifecycle,
        MAX(paf.product_code) AS product_code,
        MAX(paf.color) AS color,
        MAX(paf.current_assortment_group) AS current_assortment_group,
        MAX(paf.flex_style) AS flex_style,
        MAX(paf.generic) AS generic,
        MAX(paf.sizes_mat) AS sizes_mat,
        MAX(paf.form) AS form,
        MAX(paf.masterstyle_descr) AS masterstyle_descr,
        MAX(paf.user_defined_1) AS user_defined_1,
        MAX(paf.user_defined_2) AS user_defined_2,
        MAX(paf.user_defined_3) AS user_defined_3,
        MAX(paf.user_defined_4) AS user_defined_4,
        MAX(paf.user_defined_5) AS user_defined_5,
        MAX(paf.user_defined_6) AS user_defined_6,
        max(ocss.updated_at) as updated_at
      FROM
        inventory_smart.oms_constraints_safety_stock ocss
      left join
        global.user_master u1 on u1.user_code = ocss.updated_by::int
      INNER JOIN
        global.product_attributes_filter paf
        ON ocss.article = paf.article
      INNER JOIN
        global.distribution_centres dc
        ON ocss.loc_code = dc.linked_store_code
      AND NOT dc.is_deleted AND paf.active AND paf.ordering = ''Y''
      ' || v_pa_sql || '
      GROUP BY 1,2,3,4,5,6,7,8,9
    ) X
    LEFT JOIN (
      SELECT article, MAX(order_strategy) AS order_strategy
      FROM inventory_smart.oms_constraints_order_policy
      GROUP BY article
    ) ocop 
    ON X.x_article = ocop.article
    ' || v_meta_cls;

  RAISE NOTICE 'v_constraints_safety_stocks_sql %', v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$;
