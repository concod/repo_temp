--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:get_oms_constraints_safety_stock_store_optimized_10 runOnChange:true stripComments:false splitStatements:false context:MTP-103408 labels:MTP-135826.
--comment: enabled search
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock_store(p_product_filter jsonb, p_meta jsonb, store_filter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock_store(p_product_filter jsonb, p_meta jsonb, store_filter jsonb)
 RETURNS TABLE(id integer, article character varying, store_code character varying, safety_stock_method character varying, stock_units integer, service_level_pct integer, safety_stock_twos integer, demand_twos integer, created_by character varying, updated_by character varying, created_at timestamp with time zone, updated_at timestamp with time zone, l0_name text, l1_name text, l2_name text, l3_name text, l4_name text, l5_name text, l6_name text, style_name text, vendor_name text, product_code text)
 LANGUAGE plpgsql
AS $function$
/*
  Get safety stock constraints
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: Meta JSON for pagination


 Usage:
  select
     *
  from
      inventory_smart.get_oms_constraints_safety_stock(
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
  v_sa_sql  text:='';
  v_constraints_safety_stocks_sql  text:='';
  v_meta_cls text := '';
  v_sort_cls text := '';
  v_limit_cls text := '';
  limit_json jsonb := '{}';
  search_json jsonb:= '{}'; 
  sort_json jsonb := '{}';

  v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
  v_pa_sql :=inventory_smart.form_main_table_filters(
    'ph_master',
    p_product_filter
  );
  
 
  v_sa_sql := global.form_main_table_filters(
    'store_attributes_filter'::Text,
    store_filter::jsonb
  );

  search_json = p_meta;
    if p_meta <> '{}' and  p_meta -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := p_meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
    end if;
     
    if p_meta <> '{}' and p_meta -> 'sort' is not null then 
     -- Extract the 'sort' object
        sort_json := p_meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json)) ;
    end if;

    -- Generate meta conditions dynamically if provided
    IF search_json <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
    END IF;

    if v_meta_cls <> '' then
        v_meta_cls := REPLACE(v_meta_cls, 'article', 'ocss.article');
        v_meta_cls := REPLACE(v_meta_cls, 'store_code', 'ocss.store_code');
        v_meta_cls := REPLACE(v_meta_cls, 'vendor_name', 'paf.vendor_name');
    end if;


  v_constraints_safety_stocks_sql := '
      WITH paf AS (
          SELECT article, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, style_name, vendor_name, product_code 
          FROM global.product_attributes_filter '||v_pa_sql||' and active = true and ordering = ''Y''
      ),
      saf AS (
          SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||'
      ),
      safety_stock_store AS (
        select ocss.id, ocss.article, ocss.store_code, ocss.safety_stock_method, ocss.stock_units, ocss.service_level_pct, ocss.safety_stock_twos, ocss.demand_twos, ocss.created_at, ocss.updated_at, paf.l0_name::text, paf.l1_name::text, paf.l2_name::text, paf.l3_name::text, paf.l4_name::text, paf.l5_name::text, paf.l6_name::text, paf.style_name::text, paf.vendor_name::text, paf.product_code::text,ocss.created_by, ocss.updated_by
        from inventory_smart.oms_constraints_safety_stock_store ocss
        join paf on ocss.article = paf.article
        join saf on ocss.store_code = saf.store_code
        ' || v_meta_cls || '
      )
      SELECT
          sss.id,
          article,
          store_code,
          safety_stock_method,
          stock_units,
          service_level_pct,
          safety_stock_twos,
          demand_twos,
          u.name  AS created_by,
          u1.name AS updated_by,
          sss.created_at,
          sss.updated_at,
          l0_name,
          l1_name,
          l2_name,
          l3_name,  
          l4_name,
          l5_name,
          l6_name,
          style_name,
          vendor_name,
          product_code
      FROM safety_stock_store sss
      LEFT JOIN global.user_master u  ON u.user_code  = sss.created_by
      LEFT JOIN global.user_master u1 ON u1.user_code = sss.updated_by
      ' || v_sort_cls || ' ' || v_limit_cls || '';
  
  raise notice 'v_constraints_safety_stocks_sql %',v_constraints_safety_stocks_sql;
  RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;

end
$function$
;
