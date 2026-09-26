--liquibase formatted sql
--changeset aman.lakkoju:Added a condition active = true runOnChange:true stripComments:false splitStatements:false context:MTP-24226 labels:MTP-24226.
--comment: Added a condition active = true.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_qc_time(input refcursor, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_qc_time(input refcursor, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   Get QC constraints
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Meta JSON for pagination
               $4: Do we need data or row count
 
   
  Usage:
   select
      *
   from
       inventory_smart.get_oms_constraints_qc_time(
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
   v_pa_sql                  text:='';
   v_constraints_qctime_sql  text:='';
   _final_query              text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_constraints_qctime_sql := '
     select
       *
     from (
            select 
              paf.*,
              ocqt.id,
              ocqt.loc_code, 
              dc.name as loc_name,
              ocqt.fiscal_year_month,
              ocqt.fical_year_week,
              ocqt.qc_time,
              ocqt.created_by,
              ocqt.created_at,
              ocqt.updated_by,
              ocqt.updated_at
            from
              inventory_smart.oms_constraints_qc_time ocqt
            inner join 
              ('||v_pa_sql||') paf
            on
              ocqt.product_code = paf.product_code
            inner join
              global.distribution_centres dc
            on
              ocqt.loc_code = dc.linked_store_code
            and
              not dc.is_deleted and paf.ordering = ''Y'' and paf.active
            where paf.product_code not in (select distinct old_product_code from inventory_smart.oms_style_mapping_table)
          ) X '|| global.form_table_query($3);

    if $4 is false then 
        _final_query := v_constraints_qctime_sql;
    else
        _final_query := 'select count(*) from (' || v_constraints_qctime_sql || ') temp' ;
    end if;

   raise notice 'v_constraints_leadtime_sql %',_final_query;
   open $1 for execute _final_query;
   RETURN _final_query;
 end
 $function$
;


