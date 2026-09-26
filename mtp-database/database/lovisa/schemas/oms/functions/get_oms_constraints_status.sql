--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_constraints_status_update_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:95086_4
--comment: use ordering column instead of active column
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
  v_search_sql              text:='';
  v_outer_meta              jsonb;
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );

  IF $3 ? 'search' AND jsonb_array_length($3->'search') > 0 THEN
    v_search_sql := global.form_table_query(jsonb_build_object('search', $3->'search'));
    IF v_search_sql IS NOT NULL AND v_search_sql != '' THEN
      v_search_sql := regexp_replace(v_search_sql, '^\s*WHERE\s', ' AND ', 'i');
      v_search_sql := replace(v_search_sql, '(l4_name', '(ocs.product_code');
    END IF;
    v_outer_meta := $3 - 'search';
  ELSE
    v_search_sql := '';
    v_outer_meta := $3;
  END IF;

  v_constraints_status_sql := '
        select
          *
        from (
          select distinct 
            paf.l4_name as product_code,
            paf.l4_name,
            paf.style_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.range_usa,
            paf.range_eu_uk,
            paf.range_au_nz,
            paf.range_asia,
            paf.range_africa,
            max(u1.name) as updated_by,
            max(ocs.updated_at) as updated_at,
            max(ocs.status) as status
          from
            inventory_smart.oms_constraints_status ocs
          inner join
            global.product_attributes_filter paf on ocs.product_code = paf.l4_name
          left join
            global.user_master u1 on u1.user_code = ocs.updated_by
        '
			    || v_pa_sql ||
          ' AND paf.is_deleted = False' || v_search_sql || ' group by 1,2,3,4,5,6,7,8,9,10,11'
        ') X ' || global.form_table_query(v_outer_meta);

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_status', 'Before Return',v_constraints_status_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3));	
   RETURN v_constraints_status_sql;
 end
 $function$
;
