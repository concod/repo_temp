--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:order_repo_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-127541-2
--comment: Order repo summary 
--rollback: SELECT 1


DROP FUNCTION IF EXISTS oms.order_repo_summary(refcursor, jsonb, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS oms.order_repo_summary(refcursor, jsonb, jsonb, text, text, jsonb);

CREATE OR REPLACE FUNCTION oms.order_repo_summary(input refcursor, jsonb, jsonb, hierarchy text, secondary_hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
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



  v_high_level_summary_sql := '
          WITH cte1 AS (
            SELECT DISTINCT
              paf.' || hierarchy || ',
              saf.' || secondary_hierarchy || '
            FROM
              (SELECT * FROM global.product_attributes_filter WHERE ordering = ''Y'') paf
              LEFT JOIN (
                SELECT 
                  article,
                  loc_code
                FROM oms.oms_orders_recommended
                GROUP BY article, loc_code
              ) oor
                ON oor.article = paf.article
				INNER JOIN 
				(SELECT * FROM global.store_attributes_filter WHERE active) saf
				on oor.loc_code = saf.store_code
              ' || v_pa_sql || '
          ),

          cte2 AS (
            SELECT DISTINCT ' || hierarchy || '
            FROM cte1
            ORDER BY ' || hierarchy || '
            ' || v_limit_cls || '
          )

          SELECT cte1.*
          FROM cte1
          JOIN cte2 ON cte1.' || hierarchy || ' = cte2.' || hierarchy ||'
          ' || v_search_cls || '
      ';

  RAISE NOTICE 'v_high_level_summary_sql %', v_high_level_summary_sql;

  OPEN $1 FOR EXECUTE v_high_level_summary_sql;
  RETURN $1;
END;
$function$
;
