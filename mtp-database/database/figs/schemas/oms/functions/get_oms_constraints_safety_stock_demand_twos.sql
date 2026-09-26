--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_safety_stock_update_25 runOnChange:true stripComments:false splitStatements:false context:MTP-108301 labels:MTP-108301
--comment: removing l6_id and l6_name from the function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_demand_twos(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_demand_twos(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock_demand_twos(p_product_filter jsonb, p_meta jsonb)
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
  l0_name text,
  l2_name text,
  l3_name text,
  l4_name text,
  product_lifecycle text,
  product_code text,
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
  v_pa_sql := inventory_smart.form_main_table_filters('ph_master', p_product_filter);

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
        MAX(paf.l0_name) AS l0_name,
        MAX(paf.l2_name) AS l2_name,
        MAX(paf.l3_name) AS l3_name,
        MAX(paf.l4_name) AS l4_name,
        MAX(paf.product_lifecycle) AS product_lifecycle,
        MAX(paf.product_code) AS product_code
      FROM
        inventory_smart.oms_constraints_safety_stock ocss
      INNER JOIN
        global.product_attributes_filter paf
        ON ocss.article = paf.article
      INNER JOIN
        "global".distribution_centres dc
        ON ocss.loc_code = dc.linked_store_code
      AND NOT dc.is_deleted AND paf.active AND paf.ordering = ''Y''
      ' || v_pa_sql || '
      GROUP BY 1,2,3,4,5,6,7,8
    ) X
    LEFT JOIN (
    SELECT article, MAX(order_strategy) AS order_strategy
    FROM inventory_smart.oms_constraints_order_policy
    GROUP BY article
) ocop 
  ON X.x_article = ocop.article
WHERE ocop.order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'')
' || v_meta_cls;

  RAISE NOTICE 'v_constraints_safety_stocks_sql %', v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$;
