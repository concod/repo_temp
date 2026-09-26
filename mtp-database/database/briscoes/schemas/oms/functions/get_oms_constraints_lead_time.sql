--liquibase formatted sql
--changeset liquibase:get_oms_constraints_lead_time_update_7 runOnChange:true stripComments:false splitStatements:false context:MTP-58917-Initial commit:MTP-81084
--comment: Added l1_name to the output query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
   Get lead time constraints
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Meta JSON for pagination


  Usage:
   select
      *
   from
       inventory_smart.get_oms_constraints_lead_time(
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
--   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
--                                                     ,'product_code'
--                                                     , $2
--                                                     );
_query_pa := inventory_smart.form_main_table_filters('ph_master',$2);
_query_order := global.form_table_query($3);
 _query_order := REPLACE(_query_order, 'article', 'oclt.article');

   v_constraints_leadtime_sql := '
          select
        oclt.id,
        paf.article,
        paf.l6_name,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        --paf.product_code,
        paf.style_name,
--        paf.masterstyle_descr,
--        paf.subbrand_description,
--        paf.product_lifecycle,
--        paf.collection,
        oclt.vendor_name,
        oclt.vendor_code,
        oclt.loc_code,
        oclt.lead_time,
        oclt.mode_shipment,
        oclt.default_mode,
        oclt.created_at,
        um2.name as created_by,
        um.name as updated_by,
        oclt.updated_at,
        oclt.column_updated
from
  inventory_smart.oms_constraints_lead_time oclt
  left join global.user_master um 
  on oclt.updated_by=um.user_code
  left join global.user_master um2 
  on oclt.created_by=um2.user_code
inner join
              (
  select
    --product_code, 
    style_name, article,l0_name,l1_name,l2_name,l3_name,l4_name,l5_name,l6_name--,masterstyle_descr,product_lifecycle,collection, subbrand_description
  from
    "global".product_attributes_filter'||_query_pa||' AND active = true AND ordering = ''Y''
        group by 1,2,3,4,5,6,7,8,9) paf
            on
              oclt.article = paf.article
          '||_query_order|| '';
   raise notice 'v_constraints_leadtime_sql %',v_constraints_leadtime_sql;
   open $1 for execute v_constraints_leadtime_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_lead_time', 'Before Return',v_constraints_leadtime_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3)); 
   RETURN v_constraints_leadtime_sql;
 end
 $function$
;