--liquibase formatted sql
--changeset sumit1.kumar@impactanalytics.co:get_oms_constraints_status runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-90720.
--comment: MTP-90720.
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
  v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
  $2 := $2 || ('{"paf.active_ladder_flg": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
  
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );
  v_constraints_status_sql := '
        select
          *
        from (
          select
            ocs.id,
            ocs.product_code,
            ocs.vendor_code,
            -- ocs.store_code,
            paf.style,
            paf.style_description,
            paf.size,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.collection,
            paf.class,
            paf.season,
            ocs.status,
            um2.name as updated_by,
            ocs.updated_at
          from
            inventory_smart.oms_constraints_status ocs
          left join global.user_master um2
              on ocs.updated_by=um2.user_code
          inner join
            global.product_attributes_filter paf
          on
            ocs.product_code = paf.product_code
          and paf.active_ladder_flg'
			    || v_pa_sql ||
        ') X ' || global.form_table_query($3);

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_status', 'Before function return value',v_constraints_status_sql,jsonb_build_object('Product_Filter',$2,'meta_json_for_pagination',$3));
   RETURN v_constraints_status_sql;
 end
 $function$
;