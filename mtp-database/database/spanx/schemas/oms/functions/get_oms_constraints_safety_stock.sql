--liquibase formatted sql
--changeset aman.pareek:get_oms_constraints_safety_stock_update_24 runOnChange:true stripComments:false splitStatements:false context:MTP-51997 labels:MTP-90719v3.
--comment:  MTP-90719_update10
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock(p_product_filter jsonb, p_meta jsonb)
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
  updated_by varchar,
  l4_id text,
  l4_name text,
  color_description text,
  l0_name text,
  l1_name text,
  l2_name text,
  l3_name text,
  product_code text,
  updated_at timestamptz,
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
  select
    X.x_article as article,
    X.*, 
    case 
      when ocop.order_strategy NOT IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') 
      then true 
      else false 
    end as is_wos_demand_disabled
  from (
    select
      ocss.id,
      ocss.article as x_article,
      ocss.loc_code,
      ocss.vendor_name,
      ocss.safety_stock_method,
      ocss.stock_units,
      ocss.service_level_pct,
      ocss.safety_stock_twos,
      ocss.demand_twos,
      dc.name as loc_name,
      u1.name as updated_by,
      max(paf.l4_id) as l4_id,
      max(paf.l4_name) as l4_name,
      max(paf.color_description) as color_description,
      max(paf.l0_name) as l0_name,
      max(paf.l1_name) as l1_name,
      max(paf.l2_name) as l2_name,
      max(paf.l3_name) as l3_name,
      max(paf.product_code) as product_code,
      max(ocss.updated_at) as updated_at
    from
      inventory_smart.oms_constraints_safety_stock ocss
    left join
        global.user_master u1 on u1.user_code = ocss.updated_by::int
    inner join
      "global".product_attributes_filter paf
      on ocss.article = paf.article
    inner join
      global.distribution_centres dc
      on ocss.loc_code = dc.linked_store_code
    and
      not dc.is_deleted and paf.active and paf.ordering = ''Y''
      ' || v_pa_sql || '
    group by 1,2,3,4,5,6,7,8,9,10,11
  ) X
  LEFT JOIN (
      SELECT article, MAX(order_strategy) AS order_strategy
      FROM inventory_smart.oms_constraints_order_policy
      GROUP BY article
    ) ocop 
    on X.x_article = ocop.article
  ' || v_meta_cls;

  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;
