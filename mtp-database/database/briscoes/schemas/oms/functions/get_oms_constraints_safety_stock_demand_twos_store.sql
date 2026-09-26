--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_oms_constraints_safety_stock_store_demand_twos_optimized_10 runOnChange:true stripComments:false splitStatements:false context:MTP-94048v1 labels:MTP-116159
--comment: adding_alias_and_where_clause_and_user_name
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_demand_twos_store(p_product_filter jsonb, p_meta jsonb, store_filter jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock_demand_twos_store(p_product_filter jsonb, p_meta jsonb, store_filter jsonb)
 RETURNS TABLE(x_article character varying, id integer, article character varying, store_code character varying, safety_stock_method character varying, stock_units integer, service_level_pct integer, safety_stock_twos integer, demand_twos integer, created_by character varying, updated_by character varying, created_at timestamp with time zone, updated_at timestamp with time zone, l0_name text, l1_name text, l2_name text, l3_name text, l4_name text, l5_name text, l6_name text, style_name text, vendor_name text, product_code text, is_wos_demand_disabled boolean)
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql text := '';
  v_sa_sql text := '';
  v_constraints_safety_stocks_sql text := '';
  v_meta_cls text := '';
  v_gen_random_uuid text := gen_random_uuid()::varchar;
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    p_product_filter
  );

  v_sa_sql := global.form_main_table_filters(
    'store_attributes_filter'::Text,
    store_filter::jsonb
  );


  if p_meta <> '{}' then
    v_meta_cls := global.form_table_query(p_meta);
  end if;

  v_constraints_safety_stocks_sql := '
    WITH paf AS (
      SELECT article, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name,
             style_name, vendor_name, product_code
      FROM global.product_attributes_filter
      ' || v_pa_sql || ' AND active = true and ordering = ''Y''
    ),
    saf AS (
      SELECT store_code
      FROM global.store_attributes_filter
      ' || v_sa_sql || '
    ),
    base AS (
      SELECT
        ocss.id,
        ocss.article AS x_article,
        ocss.store_code,
        ocss.safety_stock_method,
        ocss.stock_units,
        ocss.service_level_pct,
        ocss.safety_stock_twos,
        ocss.demand_twos,
        ocss.created_by AS created_by,
        ocss.updated_by AS updated_by,
        ocss.created_at,
        ocss.updated_at,
        paf.l0_name::text,
        paf.l1_name::text,
        paf.l2_name::text,
        paf.l3_name::text,
        paf.l4_name::text,
        paf.l5_name::text,
        paf.l6_name::text,
        paf.style_name::text,
        paf.vendor_name::text,
        paf.product_code::text
      FROM inventory_smart.oms_constraints_safety_stock_store ocss
      JOIN paf paf on ocss.article = paf.article
      JOIN saf saf on ocss.store_code = saf.store_code
    ),
    ocop AS (
      SELECT article, store_code, MAX(order_strategy) AS order_strategy
      FROM inventory_smart.oms_constraints_order_policy_store
      WHERE order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'')
      GROUP BY article, store_code
    )
    SELECT
      b.x_article,
      b.id,
      b.x_article AS article,
      b.store_code,
      b.safety_stock_method,
      b.stock_units,
      b.service_level_pct,
      b.safety_stock_twos,
      b.demand_twos,
      u.name as created_by,
      u1.name as updated_by,
      b.created_at,
      b.updated_at,
      b.l0_name,
      b.l1_name,
      b.l2_name,
      b.l3_name,
      b.l4_name,
      b.l5_name,
      b.l6_name,
      b.style_name,
      b.vendor_name,
      b.product_code,
      CASE
        WHEN ocop.order_strategy IS NULL
        THEN true
        ELSE false
      END AS is_wos_demand_disabled
    FROM base b
    LEFT JOIN ocop ON b.x_article = ocop.article AND b.store_code = ocop.store_code
    LEFT JOIN global.user_master u  ON u.user_code  = b.created_by
    LEFT JOIN global.user_master u1 ON u1.user_code = b.updated_by
    ' || v_meta_cls;

  RAISE NOTICE 'v_constraints_safety_stocks_sql %', v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;