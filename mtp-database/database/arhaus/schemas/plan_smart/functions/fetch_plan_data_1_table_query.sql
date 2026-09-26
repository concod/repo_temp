--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:fetch_plan_data_1_table_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-70175
--comment: Function to generate fact query for the report. This include genrating dim time columns for invetory kpis
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.fetch_plan_data_1_table_query(text, _text, jsonb, _int4);
CREATE OR REPLACE FUNCTION plan_smart.fetch_plan_data_1_table_query(p_version text, p_channels text[], p_product_filter jsonb, p_weeks integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    table_name TEXT;
    queries TEXT := '';
    v_phf_code_sql TEXT := '';
    v_hierarchy_code_list TEXT := '';
    v_query_filter TEXT := '';
    v_level_id TEXT := '4';
    v_query TEXT := '';
BEGIN
    -- Debugging
    RAISE NOTICE 'Grouping Sets: %', p_version;
    -- Construct SQL query dynamically per version
    table_name := 'plan_smart.' || LOWER(p_version) || '_master_1';
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'SELECT string_agg(hierarchy_code::text, '','') FROM (' || v_query_filter || ' AND level = ' || v_level_id || ') phf';
    RAISE NOTICE 'v_phf_code_sql: %', v_phf_code_sql;
    EXECUTE v_phf_code_sql INTO v_hierarchy_code_list;
    v_query :=
      'WITH '|| LOWER(p_version) ||'  as   
      (SELECT fiscal_year_week, fiscal_year_month, fiscal_year_quarter, fiscal_year_season, fiscal_year,p.* --channel, class, current_week, p.hierarchy_code, kpi30, kpi73, kpi72
         FROM ' || table_name || ' p
         join (SELECT DISTINCT fiscal_year_week, fiscal_year_month, fiscal_year_quarter, fiscal_year_season, fiscal_year FROM "global".fiscal_date_mapping) fdm
           on p.current_week = fdm.fiscal_year_week
        WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
          AND p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
          AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')),
      bounds AS (
        select
          channel,
          hierarchy_code,
          fiscal_year,
          fiscal_year_season,
          fiscal_year_quarter,
          fiscal_year_month,
          MIN(fiscal_year_week) AS bop_week,
          MAX(fiscal_year_week) AS eop_week,
          GROUPING(fiscal_year, fiscal_year_season, fiscal_year_quarter, fiscal_year_month) AS gid
        FROM '|| LOWER(p_version) ||' 
        GROUP BY GROUPING SETS (
          (channel, hierarchy_code, fiscal_year, fiscal_year_season, fiscal_year_quarter, fiscal_year_month),  -- month
          (channel, hierarchy_code, fiscal_year, fiscal_year_season, fiscal_year_quarter),                     -- quarter
          (channel, hierarchy_code, fiscal_year, fiscal_year_season),                                          -- season
          (channel, hierarchy_code, fiscal_year)                                                               -- year
        )
      )
      SELECT
        t.*,
        -- Monthly BOP $ 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi30 ELSE 0 END AS kpi30_month,
        -- Quarterly BOP
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi30 ELSE 0 END AS kpi30_quarter,
        -- Season BOP
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi30 ELSE 0 END AS kpi30_season,
        -- Yearly BOP
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi30 ELSE 0 END AS kpi30_year,
        -- Monthly EOP $ 
        CASE WHEN t.fiscal_year_week = bm.eop_week THEN t.kpi73 ELSE 0 END AS kpi73_month,
        -- Quarterly EOP $ 
        CASE WHEN t.fiscal_year_week = bq.eop_week THEN t.kpi73 ELSE 0 END AS kpi73_quarter,
        -- Season EOP $ 
        CASE WHEN t.fiscal_year_week = bs.eop_week THEN t.kpi73 ELSE 0 END AS kpi73_season,
        -- Yearly EOP $ 
        CASE WHEN t.fiscal_year_week = by.eop_week THEN t.kpi73 ELSE 0 END AS kpi73_year,
        -- Monthly EOP U 
        CASE WHEN t.fiscal_year_week = bm.eop_week THEN t.kpi72 ELSE 0 END AS kpi72_month,
        -- Quarterly EOP U
        CASE WHEN t.fiscal_year_week = bq.eop_week THEN t.kpi72 ELSE 0 END AS kpi72_quarter,
        -- Season EOP U
        CASE WHEN t.fiscal_year_week = bs.eop_week THEN t.kpi72 ELSE 0 END AS kpi72_season,
        -- Yearly EOP U
        CASE WHEN t.fiscal_year_week = by.eop_week THEN t.kpi72 ELSE 0 END AS kpi72_year,
        -- Monthly AOH C $ 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi65 ELSE 0 END AS kpi65_month,
        -- Quarterly AOH C $ 
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi65 ELSE 0 END AS kpi65_quarter,
        -- Season AOH C $ 
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi65 ELSE 0 END AS kpi65_season,
        -- Yearly AOH C $ 
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi65 ELSE 0 END AS kpi65_year, 
        -- Monthly AOH U 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi64 ELSE 0 END AS kpi64_month,
        -- Quarterly AOH U 
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi64 ELSE 0 END AS kpi64_quarter,
        -- Season AOH U 
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi64 ELSE 0 END AS kpi64_season,
        -- Yearly AOH U 
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi64 ELSE 0 END AS kpi64_year,   
        -- Monthly ATP C $ 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi70 ELSE 0 END AS kpi70_month,
        -- Quarterly ATP C $ 
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi70 ELSE 0 END AS kpi70_quarter,
        -- Season ATP C $ 
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi70 ELSE 0 END AS kpi70_season,
        -- Yearly ATP C $ 
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi70 ELSE 0 END AS kpi70_year, 
        -- Monthly ATP U 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi68 ELSE 0 END AS kpi68_month,
        -- Quarterly ATP U 
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi68 ELSE 0 END AS kpi68_quarter,
        -- Season ATP U 
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi68 ELSE 0 END AS kpi68_season,
        -- Yearly ATP U
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi68 ELSE 0 END AS kpi68_year,   
        -- Monthly ATP FWOS Cost $ 
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi71 ELSE 0 END AS kpi71_month,
        -- Quarterly ATP FWOS Cost $
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi71 ELSE 0 END AS kpi71_quarter,
        -- Season ATP FWOS Cost $
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi71 ELSE 0 END AS kpi71_season,
        -- Yearly ATP FWOS Cost $
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi71 ELSE 0 END AS kpi71_year,   
        -- Monthly ATP FWOS U
        CASE WHEN t.fiscal_year_week = bm.bop_week THEN t.kpi69 ELSE 0 END AS kpi69_month,
        -- Quarterly ATP FWOS U
        CASE WHEN t.fiscal_year_week = bq.bop_week THEN t.kpi69 ELSE 0 END AS kpi69_quarter,
        -- Season ATP FWOS U
        CASE WHEN t.fiscal_year_week = bs.bop_week THEN t.kpi69 ELSE 0 END AS kpi69_season,
        -- Yearly ATP FWOS U
        CASE WHEN t.fiscal_year_week = by.bop_week THEN t.kpi69 ELSE 0 END AS kpi69_year,  
        -- Monthly W BO Sls U 
        CASE WHEN t.fiscal_year_week = bm.eop_week THEN t.kpi38 ELSE 0 END AS kpi38_month,
        -- Quarterly W BO Sls U
        CASE WHEN t.fiscal_year_week = bq.eop_week THEN t.kpi38 ELSE 0 END AS kpi38_quarter,
        -- Season W BO Sls U
        CASE WHEN t.fiscal_year_week = bs.eop_week THEN t.kpi38 ELSE 0 END AS kpi38_season,
        -- Yearly W BO Sls U
        CASE WHEN t.fiscal_year_week = by.eop_week THEN t.kpi38 ELSE 0 END AS kpi38_year,
        -- Monthly W BO Sls $ 
        CASE WHEN t.fiscal_year_week = bm.eop_week THEN t.kpi37 ELSE 0 END AS kpi37_month,
        -- Quarterly W BO Sls $
        CASE WHEN t.fiscal_year_week = bq.eop_week THEN t.kpi37 ELSE 0 END AS kpi37_quarter,
        -- Season W BO Sls $
        CASE WHEN t.fiscal_year_week = bs.eop_week THEN t.kpi37 ELSE 0 END AS kpi37_season,
        -- Yearly W BO Sls $
        CASE WHEN t.fiscal_year_week = by.eop_week THEN t.kpi37 ELSE 0 END AS kpi37_year    
      FROM '|| LOWER(p_version) ||' t
      LEFT JOIN bounds bm
      ON bm.gid = 0
      and t.channel = bm.channel
      and t.hierarchy_code = bm.hierarchy_code 
      AND t.fiscal_year = bm.fiscal_year
      AND t.fiscal_year_quarter = bm.fiscal_year_quarter
      AND t.fiscal_year_season = bm.fiscal_year_season
      AND t.fiscal_year_month = bm.fiscal_year_month
      LEFT JOIN bounds bq
      ON bq.gid = 1
      and t.channel = bq.channel
      and t.hierarchy_code = bq.hierarchy_code 
      AND t.fiscal_year = bq.fiscal_year
      AND t.fiscal_year_season = bq.fiscal_year_season
      AND t.fiscal_year_quarter = bq.fiscal_year_quarter
      LEFT JOIN bounds bs
      ON bs.gid = 3
      and t.channel = bs.channel
      and t.hierarchy_code = bs.hierarchy_code 
      AND t.fiscal_year = bs.fiscal_year
      AND t.fiscal_year_season = bs.fiscal_year_season
      LEFT JOIN bounds by
      ON by.gid = 7
      and t.channel = by.channel
      and t.hierarchy_code = by.hierarchy_code 
      AND t.fiscal_year = by.fiscal_year';

    -- Debugging Output
    RAISE NOTICE 'Table Query: %', v_query;

    RETURN v_query;
END;
$function$
;
