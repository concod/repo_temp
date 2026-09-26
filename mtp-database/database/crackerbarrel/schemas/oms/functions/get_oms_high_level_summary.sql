--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_cbocs_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_10 labels:MTP-90136-5
--comment: Added view_by_allowed_values parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
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
BEGIN
  v_pa_sql := inventory_smart.form_main_table_filters(
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

  v_high_level_summary_sql := '

          WITH fiscal_data AS (
            SELECT DISTINCT 
            fdm.fiscal_year_month,
            fdm.fiscal_month_name, 
            fdm.fiscal_year,
            fdm.fiscal_month,
            fdm.fiscal_month_begin_date,
            fdm.fiscal_month_end_date
            FROM global.fiscal_date_mapping fdm
            WHERE fdm.fiscal_year_month >= (SELECT fiscal_year_month
            FROM global.fiscal_date_mapping
            WHERE date = CURRENT_DATE
            LIMIT 1)
            AND fdm.fiscal_month_begin_date IS NOT NULL
            AND fdm.fiscal_month_end_date IS NOT NULL
            ORDER BY fdm.fiscal_year_month
            LIMIT 6),

          cte1 AS (
            SELECT *
            FROM (
              SELECT
                paf.' || hierarchy || ',
                dc.name AS dc_or_channel,
                SUM(oor.avg_order_qty) AS master_pack,
                COUNT(DISTINCT paf.article) AS eligible_styles,
                COUNT(DISTINCT CASE WHEN oor.avg_order_qty > 0 THEN oor.article END) AS recom_styles
            FROM
                (SELECT
              l2_name,
              l3_name,
              l4_name,
              l5_name,
              primary_trait_desc,
              article,
              product_type,
              product_attribute_8,
              primary_vendor_name
          FROM global.product_attributes_filter WHERE ordering = ''Y'' group by 1,2,3,4,5,6,7,8,9) paf
              LEFT JOIN (
                SELECT 
                  article,
                  pack_id,
                  order_placement_recom_date,
                  order_group_id,
                  loc_code,
                  AVG(order_quantity) AS avg_order_qty
                  FROM inventory_smart.oms_orders_recommended 
                  WHERE fiscal_year_month IN (SELECT fiscal_year_month FROM fiscal_data)
                GROUP BY article, pack_id, order_placement_recom_date, order_group_id, loc_code
              ) oor
                ON oor.article = paf.article
              INNER JOIN global.distribution_centres dc
                ON oor.loc_code = dc.linked_store_code
              ' || v_pa_sql || '
              GROUP BY
                paf.' || hierarchy || ', dc.name
            ) X ' || v_search_cls || '
          ),

          cte2 AS (
            SELECT DISTINCT ' || hierarchy || '
            FROM cte1
            ORDER BY ' || hierarchy || '
            ' || v_limit_cls || '
          ),

          cte3 AS (
            SELECT *
            FROM (
              SELECT
                paf.' || hierarchy || ',
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
                FROM inventory_smart.oms_orders_recommended
                WHERE fiscal_year_month IN (SELECT fiscal_year_month FROM fiscal_data)
                GROUP BY article, pack_id, order_placement_recom_date, order_group_id, loc_code
              ) oor
                ON oor.article = paf.article
              INNER JOIN global.distribution_centres dc
                ON oor.loc_code = dc.linked_store_code
              ' || v_pa_sql || '
              GROUP BY
                paf.' || hierarchy || '
            ) X ' || v_search_cls || '
          )

          SELECT cte1.*
          FROM (
            SELECT * FROM cte1
            UNION ALL
            SELECT * FROM cte3
          ) AS cte1
          JOIN cte2 ON cte1.' || hierarchy || ' = cte2.' || hierarchy || '
      ';

  RAISE NOTICE 'v_high_level_summary_sql %', v_high_level_summary_sql;

  OPEN $1 FOR EXECUTE v_high_level_summary_sql;
  RETURN $1;
END;
$function$
;