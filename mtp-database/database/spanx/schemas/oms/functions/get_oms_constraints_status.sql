--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:get_oms_constraints_status_update_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604.
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
begin
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
            paf.article,
            paf.size,
            ocs.vendor_code,
            -- ocs.store_code,
            paf.l4_id,
            paf.l4_name,
            paf.color_description,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            ocs.status,
            um.name as updated_by,
            ocs.updated_at
          from
            inventory_smart.oms_constraints_status ocs
          left join
            global.user_master um on um.user_code = ocs.updated_by
          inner join
            global.product_attributes_filter paf
          on
            ocs.product_code = paf.product_code
          and
            ocs.vendor_code = paf.vendor_id
          and 
            paf.active
          -- inner join
          --   global.distribution_centres dc
          -- on
          --   ocs.store_code = dc.linked_store_code
          -- and
          --   not dc.is_deleted 
            '
			    || v_pa_sql ||
        ') X ' || global.form_table_query($3);

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open input for execute v_constraints_status_sql;
   RETURN v_constraints_status_sql;
 end
 $function$
;