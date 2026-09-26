--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_constraints_status_vs_5 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Added new columns from product_attributes_filter table.

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
  v_pa_sql := global.form_main_table_filters(
    'product_attributes_filter',
    $2
  );
  v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');
  
  v_constraints_status_sql := '
        select
          *
        from (
          select
            -- ocs.id,
            -- ocs.product_code,
            -- ocs.vendor_code,
            -- ocs.store_code,
            paf.l6_id,
            paf.l6_name,
            paf.l0_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.collection,
            paf.masterstyle_descr,
            paf.subbrand_code_desc,
            paf.product_lifecycle,
			      paf.color,
			      paf.current_assortment_group,
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
            max(u1.name) as updated_by,
            max(ocs.updated_at) as updated_at,
            max(ocs.status) as status
          from
            inventory_smart.oms_constraints_status ocs
          inner join
            global.product_attributes_filter paf on ocs.product_code = paf.product_code and paf.active
          left join
            global.user_master u1 on u1.user_code = ocs.updated_by
          -- inner join
          --   global.distribution_centres dc
          -- on
          --   ocs.store_code = dc.linked_store_code
          -- and
          --   not dc.is_deleted
          '
			    || v_pa_sql ||
          'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23'
        ') X ' || global.form_table_query($3);

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_status', 'Before Return',v_constraints_status_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3));	
   RETURN v_constraints_status_sql;
 end
 $function$
;
