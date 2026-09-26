--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_cbocs_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_10 labels:MTP-90136
--comment: MTP-88842
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS oms.get_oms_high_level_summary(refcursor, jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_high_level_summary(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql                  text := '';
  v_high_level_summary_sql  text := '';
  v_search_cls              text := '';
  v_limit_cls               text := '';
  search_json               jsonb := '{}'; 
  limit_json                jsonb := '{}';
  v_hierarchies_list        text[];
  v_hierarchies_list_plain  text[];
  v_higher_hierarchies_list text := '';
  v_higher_hierarchies_list_plain text := '';
  v_join_conditions text := '';
BEGIN
  v_pa_sql := oms.form_main_table_filters(
    'ph_master',
    $2
  );

  search_json = $3;

  IF $3 <> '{}' AND $3 -> 'limit' IS NOT NULL THEN
    -- Extract the 'limit' object
    limit_json := $3 -> 'limit';
    search_json := search_json - 'limit';
    v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
  END IF;

  v_search_cls := global.form_table_query(search_json);
  v_pa_sql := regexp_replace(v_pa_sql, '\yarticle\y', 'paf.article', 'g');

    -- FETCH HIERARCHY LIST DYNAMICALLY
  SELECT 
      array_agg(format('paf.%I', attribute_name)),
      array_agg(attribute_name)
  INTO 
      v_hierarchies_list,
      v_hierarchies_list_plain
  FROM oms.get_oms_view_by_hierarchy(hierarchy, view_by_allowed_values::jsonb);
  
  -- String versions
  v_higher_hierarchies_list := array_to_string(v_hierarchies_list, ', ');
  v_higher_hierarchies_list_plain := array_to_string(v_hierarchies_list_plain, ', ');
  
  RAISE NOTICE 'v_higher_hierarchies_list: %', v_higher_hierarchies_list;
  RAISE NOTICE 'v_higher_hierarchies_list_plain: %', v_higher_hierarchies_list_plain;
  
  -- JOIN conditions: cte1.col = cte2.col
  SELECT string_agg(
             format('cte1.%I = cte2.%I', col, col),
             ' AND '
         )
  INTO v_join_conditions
  FROM unnest(v_hierarchies_list_plain) AS t(col);
  
  RAISE NOTICE 'v_join_conditions: %', v_join_conditions;

  v_high_level_summary_sql := '
          WITH cte1 AS (
            SELECT *
            FROM (
              SELECT
                ' || v_higher_hierarchies_list || ',
                dc.name AS dc_or_channel,
                SUM(oor.avg_order_qty) AS master_pack,
                COUNT(DISTINCT paf.article) AS eligible_styles,
                COUNT(DISTINCT CASE WHEN oor.avg_order_qty > 0 THEN oor.article END) AS recom_styles
            FROM
                (SELECT
              --l2_name,
              --l1_name,
              --l2_name,
              --l3_name,
             -- l0_name,
              --article,
              --product_type,
              --primary_vendor_name
              *
          FROM global.product_attributes_filter WHERE ordering = ''Y'' 
          --group by 1,2,3,4,5,6,7,8,9
          ) paf
              LEFT JOIN (
                SELECT 
                  article,
                  pack_id,
                  order_placement_recom_date,
                  order_group_id,
                  loc_code,
                  AVG(order_quantity) AS avg_order_qty
                FROM oms.oms_orders_recommended
                GROUP BY article, pack_id, order_placement_recom_date, order_group_id, loc_code
              ) oor
                ON oor.article = paf.article
              INNER JOIN global.distribution_centres dc
                ON oor.loc_code = dc.linked_store_code
              ' || v_pa_sql || '
              GROUP BY
               ' ||v_higher_hierarchies_list|| ', dc.name
            ) X ' || v_search_cls || '
          ),

          cte2 AS (
            SELECT DISTINCT ' || v_higher_hierarchies_list_plain || '
            FROM cte1
            ORDER BY ' || v_higher_hierarchies_list_plain || '
            ' || v_limit_cls || '
          ),

          cte3 AS (
            SELECT *
            FROM (
              SELECT
                ' || v_higher_hierarchies_list || ',
                ''-'' AS dc_or_channel,
                SUM(oor.avg_order_qty) AS master_pack,
                COUNT(DISTINCT paf.article) AS eligible_styles,
                COUNT(DISTINCT CASE WHEN oor.avg_order_qty > 0 THEN oor.article END) AS recom_styles
              FROM
                (SELECT * FROM global.product_attributes_filter WHERE ordering = ''Y'') paf
              LEFT JOIN (
                SELECT 
                  article,
                  pack_id,
                  order_placement_recom_date,
                  order_group_id,
                  loc_code,
                  AVG(order_quantity) AS avg_order_qty
                FROM oms.oms_orders_recommended
                GROUP BY article, pack_id, order_placement_recom_date, order_group_id, loc_code
              ) oor
                ON oor.article = paf.article
              INNER JOIN global.distribution_centres dc
                ON oor.loc_code = dc.linked_store_code
              ' || v_pa_sql || '
              GROUP BY
               ' || v_higher_hierarchies_list || ', dc_or_channel
            ) X ' || v_search_cls || '
          )

          SELECT cte1.*
          FROM (
            SELECT * FROM cte1
            UNION ALL
            SELECT * FROM cte3
          ) AS cte1
          JOIN cte2 ON ' || v_join_conditions || '
      ';

  RAISE NOTICE 'v_high_level_summary_sql %', v_high_level_summary_sql;

  OPEN $1 FOR EXECUTE v_high_level_summary_sql;
  RETURN $1;
END;
$function$
;