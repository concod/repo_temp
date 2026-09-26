--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_constraints_status_update_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-94127_3
--comment: MTP-70562 removing duplicates from replenishment status using grouping by choice l6_id..
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_constraints_status(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_status(input refcursor, jsonb, jsonb)
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
      oms.get_oms_constraints_status(
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
  v_pa_sql := oms.form_main_table_filters(
    'ph_master',
    $2
  );

  v_pa_sql := regexp_replace(v_pa_sql, '\yarticle\y', 'paf.article', 'g'); -- This is an ambiguity fix for the article column. Hard coded.

  v_constraints_status_sql := '
        select
          *
        from (
          select
            paf.product_description,
          	paf.product_code,
          	paf.size,
          	ocs.vendor_name,
            ocs.id,
            -- ocs.product_code,
            -- ocs.vendor_code,
            -- ocs.store_code,
           	paf.article,
            paf.product_type,
            paf.l0_name,
            paf.l2_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.primary_vendor_name,
            --paf.collection,
            --paf.masterstyle_descr,
            --paf.subbrand_description,
            --paf.product_lifecycle,
            max(ocs.status) as status,
            CASE WHEN opc.size IS NULL THEN false ELSE true END as pack_config,
            -- ocs.status,
            MAX(umc.name) as created_by,
            MAX(umu.name) as updated_by,
            MAX(ocs.created_at) as created_at,
            -- MAX(ocs.updated_by) as updated_by,
            MAX(ocs.updated_at) as updated_at
          from
            oms.oms_constraints_status ocs
          inner join
            global.product_attributes_filter paf
          on
            ocs.product_code = paf.product_code
          left join
            oms.oms_pack_config opc
          on
            ocs.product_code = opc.product_code
          left join
            global.user_master umc
          on
            ocs.created_by = umc.user_code
          left join
            global.user_master umu
          on
            ocs.updated_by = umu.user_code
          -- inner join
          --   global.distribution_centres dc
          -- on
          --   ocs.store_code = dc.linked_store_code
          -- and
          --   not dc.is_deleted
          and paf.active'
			    || v_pa_sql ||
          'group by 1,2,3,4,5,6,7,8,9,10,11,12,13,15'
        ') X ' || global.form_table_query($3);

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
   perform  global.sp_log(v_gen_random_uuid, 'oms.get_oms_constraints_status', 'Before Return',v_constraints_status_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3));	
   RETURN v_constraints_status_sql;
 end
 $function$
;