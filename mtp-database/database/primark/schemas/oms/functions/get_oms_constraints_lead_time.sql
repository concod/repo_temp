--liquibase formatted sql
--changeset aman.pareek:crackerbarrel_oms_constraints_lead_time_update_15 runOnChange:true stripComments:false splitStatements:false context:MTP-58917-Initial commit:MTP-71829v3
--comment: MTP-71829 user name added..
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
   Get lead time constraints
   Parameters:
               $1: Refcursor
               $2: Product Filter
               $3: Meta JSON for pagination

  Usage:
   select
      *
   from
       oms.get_oms_constraints_lead_time(
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
  v_pa_sql                    text:='';
  _query_pa                   text:='';
  _query_order                text:='';
  v_constraints_leadtime_sql  text:='';
  v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
  _query_pa := oms.form_main_table_filters('ph_master', $2);
  _query_order := global.form_table_query($3);
  _query_order := REPLACE(_query_order, 'article', 'oclt.article');
    _query_order := REPLACE(_query_order, 'updated_by', 'um.name');
  
-- Add mode_shipment as secondary sort after any existing ORDER BY clause
IF _query_order ~* 'ORDER BY' THEN
  IF _query_order !~* 'mode_shipment' THEN
    IF _query_order ~* 'LIMIT' THEN
      _query_order := regexp_replace(_query_order, '(nulls last)(\s+LIMIT)', '\1, mode_shipment ASC\2', 'gi');
    ELSE
      _query_order := regexp_replace(_query_order, '(nulls last)', '\1, mode_shipment ASC', 'gi');
    END IF;
  END IF;
END IF;

  v_constraints_leadtime_sql := '
    SELECT
      oclt.id,
      paf.article,
      paf.product_description,
      paf.l2_name,
      paf.l0_name,
      paf.l1_name,
      paf.l2_name,
      paf.l3_name,
      paf.primary_vendor_name,
      oclt.vendor_name,
      oclt.vendor_code,
      oclt.loc_code,
      oclt.lead_time,
      oclt.manufacturing_lead_time,
      oclt.mode_shipment,
      oclt.default_mode,
      oclt.created_by,
      oclt.created_at,
      um.name AS updated_by,
      oclt.updated_at,
      oclt.column_updated,
      concat(oclt.article, oclt.loc_code, oclt.mode_shipment) as unique_row_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 
          FROM oms.oms_pack_config opc 
          WHERE opc.article = oclt.article 
            AND opc.pack_id IS NOT NULL 
            AND opc.pack_id <> ''WP''
        ) THEN true
        ELSE false
      END AS pack_config
    FROM oms.oms_constraints_lead_time oclt
    LEFT JOIN global.user_master um 
      ON oclt.updated_by = um.user_code
    INNER JOIN (
      SELECT
        article,
        product_description,
        l2_name,
        l1_name,
        l2_name,
        l3_name,
        l0_name,
        primary_vendor_name
      FROM global.product_attributes_filter ' || _query_pa || ' AND active = true
      GROUP BY 1,2,3,4,5,6,7,8
    ) paf
      ON oclt.article = paf.article
  ' || _query_order || '';

  RAISE NOTICE 'v_constraints_leadtime_sql %', v_constraints_leadtime_sql;
  OPEN $1 FOR EXECUTE v_constraints_leadtime_sql;

  PERFORM global.sp_log(
    v_gen_random_uuid, 
    'oms.get_oms_constraints_lead_time', 
    'Before Return',
    v_constraints_leadtime_sql,
    jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3)
  ); 

  RETURN v_constraints_leadtime_sql;
end
$function$
;