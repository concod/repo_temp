--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:get_oms_constraints_status_update_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-86537_1
--comment: Reverted the paf.ordering=Y
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_status(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_status(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get status constraints
  Parameres :
              $1: Refcursor
              $2: Product Filter
              $3: Meta JSON for pagination

  
 Usage:
  select
     *
  from
      inventory_smart.get_oms_constraints_status(
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
  v_constraints_status_sql  text:='';
  v_filter_sql              text:='';
begin
  v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                    ,'product_code'
                                                    , $2
                                                    );
  v_filter_sql :=global.form_table_query($3);
  v_filter_sql := replace(v_filter_sql, '''%Active%''', '''Active%''');
  v_filter_sql := replace(v_filter_sql, '''%Inactive%''', '''Inactive%''');
  v_filter_sql := replace(v_filter_sql, '''%active%''', '''Active%''');
  v_filter_sql := replace(v_filter_sql, '''%inactive%''', '''Inactive%''');
  v_constraints_status_sql := '
     select
       *
     from (
            select 
              paf.*,
              dc.name as loc_name,
              ocs.id,
              ocs.loc_code,
              ocs.status,
              ocs.preferred_status,
              ocs.created_by,
              ocs.created_at,
              ocs.updated_by,
              ocs.updated_at
            from
              inventory_smart.oms_constraints_status ocs
            inner join 
              ('||v_pa_sql||') paf
            on
              ocs.product_code = paf.product_code
            and
              ocs.vendor_code = paf.vendor_code
            inner join
              global.distribution_centres dc
            on
              ocs.loc_code = dc.linked_store_code
            and
              not dc.is_deleted and paf.active
            where paf.product_code not in (select distinct old_product_code from inventory_smart.oms_style_mapping_table)
          ) X '|| v_filter_sql;
   
   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
   RETURN v_constraints_status_sql;
 end
 $function$
;
