--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_constraints_lead_time_update_v1_1 runOnChange:true stripComments:false splitStatements:false context:MTP-58917-Initial commit:MTP-71829:MTP-131834
--comment: use ordering column instead of active column
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time(refcursor, jsonb, jsonb);

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
_query_order := REPLACE(_query_order, 'name', 'dc.name');

   v_constraints_leadtime_sql := '
        select
        oclt.id,
        paf.l4_name,
        paf.l4_name as article,
      	paf.style_name,
      	paf.l1_name,
      	paf.l2_name,
      	paf.l3_name,
      	paf.range_usa,
      	paf.range_eu_uk,
      	paf.range_au_nz,
      	paf.range_asia,
      	paf.range_africa,
        oclt.vendor_name,
        oclt.loc_code,
        dc.name AS name,
        oclt.manufacturing_lead_time,
        oclt.lead_time,
        oclt.mode_shipment,
        oclt.default_mode,
        oclt.vendor_code,
        oclt.created_at,
        um.name as updated_by,
        oclt.updated_at,
        oclt.column_updated
from
  inventory_smart.oms_constraints_lead_time oclt
  left join global.user_master um 
  on oclt.updated_by=um.user_code
inner join
              (
  select
    distinct on(l4_name) article,l1_name,l2_name,l3_name,l4_name,style_name,range_usa,range_eu_uk,range_au_nz,range_asia,range_africa
  from
    "global".product_attributes_filter' ||_query_pa|| ' AND active = true AND ordering = ''Y'') paf
            on
              oclt.article = paf.l4_name
          INNER JOIN global.distribution_centres dc
            ON oclt.loc_code = dc.linked_store_code
            AND NOT dc.is_deleted
          '||_query_order|| '';
   raise notice 'v_constraints_leadtime_sql %',v_constraints_leadtime_sql;
   open $1 for execute v_constraints_leadtime_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_lead_time', 'Before Return',v_constraints_leadtime_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3)); 
   RETURN v_constraints_leadtime_sql;
 end
 $function$
;
