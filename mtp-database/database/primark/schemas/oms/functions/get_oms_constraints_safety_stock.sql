--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_constraints_safety_stock_update_6 runOnChange:true stripComments:false splitStatements:false context:MTP-78179 labels:MTP-78179_update_3
--comment: MTP-85893
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_constraints_safety_stock(jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_constraints_safety_stock(p_product_filter jsonb, p_meta jsonb)
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
  created_by varchar,
  updated_by varchar,
  created_at timestamptz,
  updated_at timestamptz,
  l1_name text,
  l2_name text,
  l3_name text,
  l0_name text,
  primary_vendor_name text,
  product_type text,
  product_description text,
  product_code text,
  pack_config boolean,
  size character varying,
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
      oms.get_oms_constraints_safety_stock(
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
  v_meta_cls                       text:='';
begin
  v_pa_sql :=oms.form_main_table_filters(
    'ph_master',
    p_product_filter
  );
  if p_meta <> '{}'
  then
    v_meta_cls := global.form_table_query(p_meta) ;
  end if;

  v_pa_sql = REPLACE(v_pa_sql, 'article', 'paf.article');

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
        ocss.safety_stock_method,
        ocss.stock_units,
        ocss.service_level_pct::integer,
        ocss.safety_stock_twos::integer,
        ocss.demand_twos::integer,
        u.name as created_by,
        u1.name as updated_by,
        max(ocss.created_at) as created_at,
        max(ocss.updated_at) as updated_at,
        max(paf.l1_name) as l1_name,
        max(paf.l2_name) as l2_name,
        max(paf.l3_name) as l3_name,
        max(paf.l0_name) as l0_name,
        max(paf.primary_vendor_name) as primary_vendor_name,
        max(paf.product_type) as product_type,
        max(paf.product_description) as product_description,
        max(paf.product_code) as product_code,
        CASE WHEN max(opc.size) IS NOT NULL THEN true ELSE false END as pack_config,
        max(opc.size)::character varying as size
    from
      oms.oms_constraints_safety_stock ocss
    inner join
      "global".product_attributes_filter paf
      on ocss.article = paf.article
    inner join
      global.distribution_centres dc
      on ocss.loc_code = dc.linked_store_code
    and
        not dc.is_deleted and paf.active 
      left join
        global.user_master u on u.user_code = ocss.created_by 
      left join
        global.user_master u1 on u1.user_code = ocss.updated_by::int
      left join
        oms.oms_pack_config opc on ocss.article = opc.article
		  
      ' || v_pa_sql || '
    group by 1,2,3,4,5,6,7,8,9,10
  ) X
  LEFT JOIN (
      SELECT article, MAX(order_strategy) AS order_strategy
      FROM oms.oms_constraints_order_policy
      GROUP BY article
    ) ocop 
    on X.x_article = ocop.article
  ' || v_meta_cls;

  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
end
$function$
;