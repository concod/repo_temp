--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_constraints_lead_time_vs_3 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Added new columns from product_attributes_filter table.

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
_query_pa := global.form_main_table_filters('product_attributes_filter',$2);
_query_order := global.form_table_query($3);
 _query_order := REPLACE(_query_order, 'article', 'oclt.article');
 _query_order := REPLACE(_query_order, 'updated_by', 'um.name');

   v_constraints_leadtime_sql := '
      select
        oclt.id,
        paf.l6_id,
        paf.l0_name,
        paf.l2_name,
        paf.l6_name,
        paf.l3_name,
        paf.l4_name,
        paf.article,
        paf.masterstyle_descr,
        paf.l5_name,
        paf.color,
        paf.subbrand_code_desc,
        paf.collection,
        paf.current_assortment_group,
        paf.product_lifecycle,
        paf.flex_style,
        paf.generic,
        paf.sizes_mat,
        paf.form,
        paf.user_defined_1,
        paf.user_defined_2,
        paf.user_defined_3,
        paf.user_defined_4,
        paf.user_defined_5,
        paf.user_defined_6,
        oclt.vendor_name,
        oclt.loc_code,
        oclt.lead_time,
        oclt.mode_shipment,
        oclt.default_mode,
        oclt.created_at,
        um2.name as created_by,
        um.name as updated_by,
        oclt.updated_at,
        oclt.column_updated,
        concat(oclt.article, oclt.loc_code, oclt.mode_shipment) as unique_row_id
from
  inventory_smart.oms_constraints_lead_time oclt
  left join global.user_master um 
  on oclt.updated_by=um.user_code
  left join global.user_master um2 
  on oclt.created_by=um2.user_code
inner join
              (
  select
    article,
    l0_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    l6_name,
    masterstyle_descr,
    collection,
    l6_id,
    color,
    subbrand_code_desc,
    current_assortment_group,
    product_lifecycle,
    flex_style,
    generic,
    sizes_mat,
    form,
    user_defined_1,
    user_defined_2,
    user_defined_3,
    user_defined_4,
    user_defined_5,
    user_defined_6
  from
    "global".product_attributes_filter'||_query_pa||' AND active = true AND ordering = ''Y''
        group by 1,2,3,4,5,6,7,8,9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24) paf
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
