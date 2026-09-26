--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_lead_time_store_count_01 runOnChange:true stripComments:false splitStatements:false MTP-111133
--comment: count rows matching list SP filters; args (cursor, product, meta, store) same order as get_oms_constraints_lead_time_store; meta uses search/range only via form_table_query(meta - limit - sort)
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time_store_count(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time_store_count(input refcursor, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_lead_time_store_count(input refcursor, jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

 declare
   v_sa_sql                    text:='';
   _query_pa                   text:='';
   _query_meta                 text:='';
   v_constraints_leadtime_count_sql  text:='';
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin

_query_pa := inventory_smart.form_main_table_filters('ph_master',$2);
v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter'::text,$4::jsonb);

_query_meta := btrim(global.form_table_query((COALESCE($3, '{}'::jsonb) - 'limit') - 'sort'));
_query_meta := REPLACE(_query_meta, 'updated_by', 'um.name');
_query_meta := REPLACE(_query_meta, 'created_by', 'um2.name');
_query_meta := REPLACE(_query_meta, 'article', 'oclt.article');
IF length(_query_meta) > 0 THEN
  _query_meta := REPLACE(_query_meta, 'WHERE', 'AND');
ELSE
  _query_meta := '';
END IF;

 v_constraints_leadtime_count_sql := '
      WITH valid_stores AS MATERIALIZED (
        SELECT store_code
        FROM global.store_attributes_filter
        ' || v_sa_sql || '
      ),
      valid_articles AS MATERIALIZED (
        SELECT DISTINCT article
        FROM global.product_attributes_filter
        ' || _query_pa || '
        AND active = true AND ordering = ''Y''
      )
      SELECT COUNT(*)::bigint AS count
      FROM inventory_smart.oms_constraints_lead_time_store oclt
      LEFT JOIN global.user_master um ON um.user_code = oclt.updated_by
      LEFT JOIN global.user_master um2 ON um2.user_code = oclt.created_by
      WHERE EXISTS (
        SELECT 1 FROM valid_stores vs WHERE vs.store_code = oclt.store_code
      )
      AND EXISTS (
        SELECT 1 FROM valid_articles va WHERE va.article = oclt.article
      )' || _query_meta;
   raise notice 'v_constraints_leadtime_count_sql %',v_constraints_leadtime_count_sql;
   open $1 for execute v_constraints_leadtime_count_sql;
   perform global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_lead_time_store_count', 'Before Return', v_constraints_leadtime_count_sql, jsonb_build_object('product_filter', $2, 'meta_filter', $3, 'store_filter', $4));
   RETURN v_constraints_leadtime_count_sql;
 end
 $function$
;
