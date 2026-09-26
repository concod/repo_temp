--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:get_oms_constraints_status_update_6 runOnChange:true stripComments:false splitStatements:false context:MTP-119412 labels:MTP-119412
--comment: Added custom size sorting based on l2_name and size order (Small, Medium, Large)
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_status(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_status(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  Get status constraints
  Parameters :
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
  v_size_sort  jsonb := NULL;
  v_order_direction text := '';
  v_meta_cls TEXT := '';
  v_where_clause TEXT := '';
  v_limit_clause TEXT := '';
  v_order_clause TEXT := '';
  v_meta_filter jsonb := $3;
begin
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
  );

  -- Check if size is in sort array and remove it
  IF v_meta_filter <> '{}' THEN
    IF v_meta_filter IS NOT NULL AND jsonb_typeof(v_meta_filter) = 'object' AND v_meta_filter <> '{}'::jsonb THEN
      IF v_meta_filter->'sort' IS NOT NULL AND jsonb_array_length(v_meta_filter->'sort') > 0 THEN
        FOR i IN 0..jsonb_array_length(v_meta_filter->'sort')-1 LOOP
          IF (v_meta_filter->'sort'->i->>'column') = 'size' THEN
            v_size_sort := v_meta_filter->'sort'->i;
            -- Remove size from sort array
            v_meta_filter := jsonb_set(
              v_meta_filter,
              '{sort}',
              (v_meta_filter->'sort') - i
            );
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Handle size sorting direction
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
      v_order_direction := 'DESC';
    ELSE
      v_order_direction := 'ASC';
    END IF;

    v_meta_cls := global.form_table_query(v_meta_filter);

    -- Extract the WHERE clause (if present)
    IF v_meta_cls ~* 'WHERE' THEN
      v_where_clause := COALESCE(substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)'), '');
    END IF;

    -- Extract the LIMIT/OFFSET clause (if present)
    IF v_meta_cls ~* 'LIMIT' THEN
      v_limit_clause := COALESCE(substring(v_meta_cls FROM 'LIMIT\s.*$'), '');
    END IF;

    -- Extract the ORDER clause (if present)
    IF v_meta_cls ~* 'ORDER BY' THEN
      v_order_clause := COALESCE(substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)'), '');
    END IF;
  END IF;

  v_constraints_status_sql := '
        select
          *
        from (
          select
            paf.article,
            paf.style_name,
            paf.size,
            paf.product_code,
            ''-'' as hierarchy_info,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            max(u1.name) as updated_by,
            max(ocs.updated_at) as updated_at,
            max(ocs.status) as status,
            COALESCE(ast."order", 999) AS size_order
          from
            inventory_smart.oms_constraints_status ocs
          inner join
            global.product_attributes_filter paf on ocs.product_code = paf.product_code and paf.active
          left join
            global.user_master u1 on u1.user_code = ocs.updated_by
          left join (
            SELECT 
              paf_inner.l2_name AS ast_l2_name, 
              ar.size AS ast_size, 
              MIN(ar."order") AS "order"
            FROM inventory_smart.article_status_tag ar
            JOIN global.product_attributes_filter paf_inner ON ar.product_code = paf_inner.product_code AND paf_inner.active
            GROUP BY paf_inner.l2_name, ar.size
          ) ast ON paf.l2_name = ast.ast_l2_name AND paf.size = ast.ast_size
          '
			    || COALESCE(v_pa_sql, '') ||
          'group by 1,2,3,4,5,6,7,8,9,13
        ) X ' || COALESCE(v_where_clause, '') ||
        CASE 
          WHEN v_size_sort IS NOT NULL AND v_order_clause IS NOT NULL AND v_order_clause <> '' THEN
            ' ORDER BY l2_name ' || v_order_direction || ', size_order ' || v_order_direction || 
            CASE 
              WHEN COALESCE(substring(v_order_clause FROM 'ORDER\sBY\s(.*)'), '') <> '' THEN
                ', ' || substring(v_order_clause FROM 'ORDER\sBY\s(.*)')
              ELSE ''
            END
          WHEN v_size_sort IS NOT NULL THEN
            ' ORDER BY l2_name ' || v_order_direction || ', size_order ' || v_order_direction
          ELSE ''
        END ||
        CASE 
          WHEN v_limit_clause IS NOT NULL AND v_limit_clause <> '' THEN
            ' ' || v_limit_clause
          ELSE ''
        END;

   raise notice 'v_constraints_status_sql %',v_constraints_status_sql;
   open $1 for execute v_constraints_status_sql;
   perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_constraints_status', 'Before Return',v_constraints_status_sql,jsonb_build_object('product_filter', $2, 'Meta JSON for pagination', $3));	
   RETURN v_constraints_status_sql;
 end
 $function$
;
