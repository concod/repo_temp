--liquibase formatted sql
--changeset liquibase:get_oms_constraints_lead_time runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_constraints_lead_time
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
   v_constraints_leadtime_sql  text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_constraints_leadtime_sql := '
     select
       *
     from (
            select
              paf.*,
              oclt.id,
              oclt.loc_code,
              dc.name as loc_name,
              oclt.lead_time,
              oclt.variance,
              oclt.created_by,
              oclt.created_at,
              oclt.updated_by,
              oclt.updated_at
            from
              inventory_smart.oms_constraints_lead_time oclt
            inner join 
              ('||v_pa_sql||') paf
            on
              oclt.product_code = paf.product_code 
            and
              oclt.vendor_code = paf.vendor_code 
            inner join
              global.distribution_centres dc
            on
              oclt.loc_code = dc.linked_store_code
            and
              not dc.is_deleted and paf.ordering = ''Y''
          ) X '|| global.form_table_query($3);
   
   raise notice 'v_constraints_leadtime_sql %',v_constraints_leadtime_sql;
   open $1 for execute v_constraints_leadtime_sql;
   RETURN v_constraints_leadtime_sql;
 end
 $function$
;
