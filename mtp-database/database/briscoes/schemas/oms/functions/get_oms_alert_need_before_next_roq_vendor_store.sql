--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_alert_need_before_next_roq_vendor_store3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-102139
--comment: MTP-102139. paf (form_main_table_filters + ordering/active) + alerts_scoped JOIN paf; total/resolved = COUNT DISTINCT (article, store) with EXISTS on oor (Immediate, status, gen_type IS DISTINCT FROM Manual).
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_need_before_next_roq_vendor_store(input refcursor, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_need_before_next_roq_vendor_store(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                    text:='';
  _query_order        text:='';
  v_search_only       jsonb;
  v_where_clause      text:='';
  v_product_query     jsonb;
  v_table_query       jsonb;
  v_need_before_next_roq_sql  text:='';
 
begin
   IF $2 ? 'product_query' AND $2 ? 'table_query' THEN
    -- New structure: extract product_query and table_query
    v_product_query := COALESCE($2->'product_query', '{}'::jsonb);
    v_table_query := COALESCE($2->'table_query', '{"search": []}'::jsonb);
    
    -- Apply product attribute filters
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', v_product_query);
    
    -- Keep only search filters from table_query, remove sort/range/limit
    v_search_only := jsonb_build_object('search', COALESCE(v_table_query->'search', '[]'::jsonb));
    
    _query_order := global.form_table_query(v_search_only);
    
    -- Extract WHERE clause and convert to AND clause for appending
    IF _query_order IS NOT NULL AND _query_order != '' THEN
      v_where_clause := TRIM(_query_order);
      -- Replace WHERE with AND for appending to existing WHERE clause
      v_where_clause := REPLACE(v_where_clause, 'WHERE ', 'AND ');
    ELSE
      v_where_clause := '';
    END IF;
  ELSE
    -- Old structure: $2 is directly the product query
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', $2);
    v_where_clause := '';
  END IF;

  v_need_before_next_roq_sql := '
    WITH paf as  (
        SELECT  l0_name,
			          l1_name,
			          product_code
        FROM global.product_attributes_filter
        ' || v_pa_sql || ' and ordering = ''Y'' and active
      ),
      alerts_scoped AS (
        select
            oasl.article,
            oasl.product_code,
            oasl.store_code,
            oasl.need_before_next_roq,
            oasl.is_need_before_next_roq_resolved,
            (select count(1) as cnt from inventory_smart.oms_orders_recommended_store mh
              WHERE mh.product_code = oasl.product_code
                AND mh.store_code = oasl.store_code
                AND mh.order_type = ''Immediate''
                AND mh.order_status_id <> 3
                AND mh.order_gen_type IS DISTINCT FROM ''Manual''
                and mh.l0_name = p.l0_name
                and mh.l1_name = p.l1_name) as cnt
        FROM inventory_smart.oms_alerts_store oasl
        JOIN paf p
          ON oasl.product_code = p.product_code
        WHERE (oasl.need_before_next_roq
           OR oasl.is_need_before_next_roq_resolved)
            ' || v_where_clause || '
      )
    SELECT ''total''::text AS label, count(DISTINCT (oasl.article, oasl.store_code)) AS count from alerts_scoped oasl where need_before_next_roq and cnt > 0
      UNION all
      SELECT ''resolved''::text AS label, count(DISTINCT (oasl.article, oasl.store_code)) AS count from alerts_scoped oasl where is_need_before_next_roq_resolved and cnt > 0';
  
  raise notice 'v_need_before_next_roq_sql %',v_need_before_next_roq_sql;
  open $1 for execute v_need_before_next_roq_sql;
  RETURN $1;
end
$function$
;
