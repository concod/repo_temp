--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_lead_time_store_07 runOnChange:true stripComments:false splitStatements:false MTP-111133
--comment: lead time store list; wrap grouped inner query so form_table_query WHERE/ORDER BY/LIMIT attach to outer SELECT * FROM (...) X
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time_store(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_lead_time_store(input refcursor, jsonb, jsonb,jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

 declare
   v_pa_sql                    text:='';
   v_sa_sql                    text:='';
   _query_pa                   text:='';
   _query_order                text:='';
   v_constraints_leadtime_sql  text:='';
   v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin

_query_pa := inventory_smart.form_main_table_filters('ph_master',$2);
v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter'::text,$4::jsonb);
_query_order := global.form_table_query($3);

 v_constraints_leadtime_sql := '
      SELECT *
      FROM (
      SELECT
        oclt.article,
        MIN(paf.l0_name) AS l0_name,
        MIN(paf.l1_name) AS l1_name,
        MIN(paf.l2_name) AS l2_name,
        MIN(paf.l3_name) AS l3_name,
        MIN(paf.l4_name) AS l4_name,
        MIN(paf.l5_name) AS l5_name,
        MIN(paf.l6_name) AS l6_name,
        MIN(paf.style_name) AS style_name,
        oclt.vendor_name,
        oclt.vendor_code,
        oclt.store_code,
        oclt.id,
        oclt.lead_time,
        oclt.created_at,
        um2.name AS created_by,
        um.name AS updated_by,
        oclt.updated_at,
        oclt.column_updated
      FROM inventory_smart.oms_constraints_lead_time_store oclt
      INNER JOIN (
        SELECT store_code
        FROM global.store_attributes_filter
        ' || v_sa_sql || '
      ) saf ON saf.store_code = oclt.store_code
      INNER JOIN (
        SELECT article, style_name, l6_name, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name
        FROM global.product_attributes_filter
        ' || _query_pa || '
        AND active = true AND ordering = ''Y''
      ) paf ON paf.article = oclt.article
      LEFT JOIN global.user_master um ON um.user_code = oclt.updated_by
      LEFT JOIN global.user_master um2 ON um2.user_code = oclt.created_by
      GROUP BY
        oclt.article,
        oclt.vendor_name,
        oclt.vendor_code,
        oclt.store_code,
        oclt.id,
        oclt.lead_time,
        oclt.created_at,
        um2.name,
        um.name,
        oclt.updated_at,
        oclt.column_updated
      ) X
          ' || _query_order || '';
   raise notice 'v_constraints_leadtime_sql %',v_constraints_leadtime_sql;
   open $1 for execute v_constraints_leadtime_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_lead_time_store', 'Before Return',v_constraints_leadtime_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3)); 
   RETURN v_constraints_leadtime_sql;
 end
 $function$
;