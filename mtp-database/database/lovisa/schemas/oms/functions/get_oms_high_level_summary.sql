--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_high_level_summary_7 runOnChange:true stripComments:false splitStatements:false context:Release_1_11 labels:MTP-91512_1
--comment: Added view_by_allowed_values parameter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary(refcursor, jsonb, jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary(input refcursor, jsonb, jsonb, hierarchy text, view_by_allowed_values jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                  text:='';
  v_high_level_summary_sql  text:='';
  v_search_cls text := '';
  v_limit_cls text := '';
  search_json jsonb:= '{}'; 
  limit_json jsonb:= '{}';
  v_loc_filter text := '';
  v_product_filter_for_pa   jsonb;
begin
  IF jsonb_array_length(($2->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text(($2->'linked_store_codes')->0->'values') AS elem;
  END IF;
  v_product_filter_for_pa := $2 - 'linked_store_codes';
  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    v_product_filter_for_pa
  );

  -- Normalize v_pa_sql: remove WHERE if present, will be added with AND
  IF v_pa_sql <> '' THEN
    v_pa_sql := LTRIM(v_pa_sql);
    IF v_pa_sql ~* '^WHERE' THEN
      v_pa_sql := SUBSTRING(v_pa_sql FROM 6);  -- Remove 'WHERE'
    END IF;
    v_pa_sql := LTRIM(v_pa_sql);  -- Trim any leading spaces after removing WHERE
  END IF;

  search_json = $3;
     if $3 <> '{}' and  $3 -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := $3 -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
      end if;

	v_search_cls := global.form_table_query(search_json);

  -- When search is applied, always keep hierarchy total rows (dc_or_channel = '-')
  -- so parent-level eligible_styles and recom_styles are available in the API response
  IF v_search_cls IS NOT NULL AND TRIM(v_search_cls) <> '' THEN
    v_search_cls := regexp_replace(v_search_cls, '^\s*WHERE\s+', '', 'i');
    v_search_cls := ' WHERE (dc_or_channel = ''-'' OR (' || TRIM(v_search_cls) || '))';
  END IF;

  v_high_level_summary_sql := '
  WITH active_dc AS (
    -- Pre-filter distribution centres (small, fast lookup)
    SELECT linked_store_code, name
    FROM global.distribution_centres
    WHERE is_active AND NOT is_deleted' || v_loc_filter || '
  ),
  filtered_paf AS (
    -- Filter product_attributes_filter once
    SELECT DISTINCT
      ' || hierarchy || ',
      l4_name,
      l4_name as article
    FROM global.product_attributes_filter
    WHERE ordering = ''Y'''
    || CASE WHEN v_pa_sql <> '' THEN ' AND ' || v_pa_sql ELSE '' END || '
  ),
  paf_codes AS (
    -- Distinct product_code with hierarchy to reduce orders scan
    SELECT DISTINCT l4_name, ' || hierarchy || '
    FROM filtered_paf
  ),
  paf_articles AS (
    -- Distinct article per product_code/hierarchy
    SELECT DISTINCT l4_name, ' || hierarchy || ', article
    FROM filtered_paf
  ),
  oor_base AS (
    -- Distinct product_code/loc_code for eligible styles
    SELECT DISTINCT
      oor.product_code,
      oor.loc_code,
      dc.name AS dc_name
    FROM inventory_smart.oms_orders_recommended oor
    INNER JOIN active_dc dc
      ON dc.linked_store_code = oor.loc_code
    INNER JOIN paf_codes pc
      ON pc.l4_name = oor.product_code
  ),
  recom_oor AS (
    -- Distinct product_code/loc_code/article for recommended styles
    SELECT DISTINCT
      oor.product_code,
      oor.loc_code,
      oor.article,
      dc.name AS dc_name
    FROM inventory_smart.oms_orders_recommended oor
    INNER JOIN active_dc dc
      ON dc.linked_store_code = oor.loc_code
    INNER JOIN paf_codes pc
      ON pc.l4_name = oor.product_code
    WHERE oor.order_quantity > 0
  ),
  eligible_base AS (
    -- Eligible styles from PAF
    SELECT
      pa.' || hierarchy || ',
      count(distinct pa.article) eligible_styles
    FROM paf_articles pa
    GROUP BY 1
  ),
  recom_base AS (
    -- Recommended styles from orders joined to hierarchy mapping
    SELECT
      pc.' || hierarchy || ',
      ro.article,
      ro.dc_name
    FROM recom_oor ro
    INNER JOIN paf_codes pc
      ON pc.l4_name = ro.product_code
  ),
  combined_base AS (
    -- Recommended rows from recom_base
    SELECT
      ' || hierarchy || ',
      dc_name,
      article AS recom_article
    FROM recom_base
  ),
  base_join AS (
    SELECT
      ' || hierarchy || ',
      dc_name,
      recom_article
    FROM combined_base
  ),
  aggregated AS (
    -- Get both aggregations in one pass using GROUPING SETS
    SELECT
      ' || hierarchy || ',
      COALESCE(dc_name, ''-'') AS dc_or_channel,
      max(eligible_styles) AS eligible_styles,
      COUNT(DISTINCT recom_article) AS recom_styles
    FROM base_join
    LEFT JOIN eligible_base
    USING(' || hierarchy || ')
    GROUP BY GROUPING SETS (
      (' || hierarchy || ', dc_name),
      (' || hierarchy || ')
    )
  ),
  filtered AS (
    -- Apply search filter once
    SELECT *
    FROM aggregated
    ' || v_search_cls || '
  ),
  cte2 AS (
    -- Get distinct hierarchies with limit (from non-"-" rows only)
    SELECT DISTINCT ' || hierarchy || '
    FROM filtered
    WHERE dc_or_channel != ''-''
    ORDER BY ' || hierarchy || '
    ' || v_limit_cls || '
  )
  SELECT filtered.*
  FROM filtered
  INNER JOIN cte2
    ON filtered.' || hierarchy || ' = cte2.' || hierarchy || '
  ORDER BY CASE WHEN filtered.dc_or_channel = ''-'' THEN 1 ELSE 0 END,
           filtered.' || hierarchy || ',
           filtered.dc_or_channel';

   raise notice 'v_high_level_summary_sql %',v_high_level_summary_sql;
   open $1 for execute v_high_level_summary_sql;
   RETURN v_high_level_summary_sql;
 end
 $function$
;
