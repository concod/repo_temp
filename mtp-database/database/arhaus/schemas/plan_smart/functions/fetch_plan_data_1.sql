--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:fetch_plan_data_1_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-70175
--comment: Updated SP to calculate invetory KPIs.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.fetch_plan_data_1(refcursor, _text, varchar, _text, jsonb, _int4, text);
CREATE OR REPLACE FUNCTION plan_smart.fetch_plan_data_1(p_refcursor refcursor, p_versions text[], p_formula_string character varying, p_channels text[], p_product_filter jsonb, p_weeks integer[], p_fiscal text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    version TEXT;
    table_name TEXT;
    queries TEXT := '';
    v_phf_code_sql TEXT := '';
    v_hierarchy_code_list TEXT := '';
    v_query_filter TEXT := '';
    v_level_id TEXT := '4';
    v_grouping_sets TEXT := '';
    grouping_set TEXT := '';
    first_query BOOLEAN := TRUE;
    v_formula_string TEXT  :='';
BEGIN
    -- Construct GROUPING SETS dynamically based on p_fiscal
    CASE p_fiscal
        WHEN 'fiscal_year' THEN 
            v_grouping_sets := 'GROUP BY GROUPING SETS (
                (channel, fdm.fiscal_year, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (channel, fdm.fiscal_year,  phf.l0_name, phf.l1_name, phf.l2_name),
                (channel, fdm.fiscal_year, phf.l0_name, phf.l1_name),
                (channel, fdm.fiscal_year, phf.l0_name),
                (channel, fdm.fiscal_year),
                (fdm.fiscal_year, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (fdm.fiscal_year, phf.l0_name, phf.l1_name, phf.l2_name),
                (fdm.fiscal_year, phf.l0_name, phf.l1_name),
                (fdm.fiscal_year)
            )';
            SELECT * into v_formula_string from plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula_string,'fiscal_year');
        WHEN 'fiscal_season_name' THEN 
            v_grouping_sets := 'GROUP BY GROUPING SETS (
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name, phf.l2_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name, phf.l2_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, phf.l0_name, phf.l1_name),
                (fdm.fiscal_year, fdm.fiscal_season_name)
            )';
            SELECT * into v_formula_string from plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula_string,'fiscal_season_name');
        WHEN 'fiscal_quarter_in_year' THEN 
            v_grouping_sets := 'GROUP BY GROUPING SETS (
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name, phf.l2_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name, phf.l2_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, phf.l0_name, phf.l1_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year)
            )';
            SELECT * into v_formula_string from plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula_string,'fiscal_quarter_in_year');
        WHEN 'fiscal_year_month' THEN 
            v_grouping_sets := 'GROUP BY GROUPING SETS (
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name, phf.l2_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name, phf.l2_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, phf.l0_name, phf.l1_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb)
            )';
            SELECT * into v_formula_string from plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula_string,'fiscal_year_month');
		WHEN 'current_week' THEN 
            v_grouping_sets := 'GROUP BY GROUPING SETS (
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name, phf.l1_name, phf.l2_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name, phf.l1_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week),
                (channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, current_week,phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name, phf.l1_name, phf.l2_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week, phf.l0_name, phf.l1_name),
                (fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb,current_week)
            )';
            SELECT * into v_formula_string from plan_smart.fetch_plan_data_1_replace_kpi_formula(p_formula_string,'current_week');
    END CASE;

    -- Debugging
    RAISE NOTICE 'Grouping Sets: %', v_grouping_sets;


    -- Construct SQL query dynamically per version
    FOREACH version IN ARRAY p_versions LOOP
      --table_name := 'plan_smart.' || LOWER(version) || '_master_1';

      table_name := plan_smart.fetch_plan_data_1_table_query(version,p_channels,p_product_filter,p_weeks);

      v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
      v_phf_code_sql := 'SELECT string_agg(hierarchy_code::text, '','') FROM (' || v_query_filter || ' AND level = ' || v_level_id || ') phf';
      RAISE NOTICE 'v_phf_code_sql: %', v_phf_code_sql;
      EXECUTE v_phf_code_sql INTO v_hierarchy_code_list;

        -- Handle UNION ALL
        IF NOT first_query THEN
            queries := queries || ' UNION ALL ';
        ELSE
            first_query := FALSE;
        END IF;

        -- Construct final query
        IF p_fiscal = 'fiscal_year' THEN
            queries := queries || '
            SELECT ' || quote_literal(version) || ' AS version, channel, fdm.fiscal_year,
                   phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name, ' || v_formula_string || '
            FROM (' || table_name || ') p
             JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month_name_abb, fiscal_season_name, fiscal_quarter_in_year FROM "global".fiscal_date_mapping) fdm
            ON fdm.fiscal_year_week = p.current_week
            JOIN plan_smart.product_hierarchies_filter phf
            ON phf.hierarchy_code = p.hierarchy_code
            WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
			and p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
            AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
            ' || v_grouping_sets;

        ELSIF p_fiscal = 'fiscal_season_name' THEN
            queries := queries || '
            SELECT ' || quote_literal(version) || ' AS version, channel, fdm.fiscal_year, fdm.fiscal_season_name, 
                   phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name, ' || v_formula_string || '
            FROM (' || table_name || ') p
             JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month_name_abb, fiscal_season_name, fiscal_quarter_in_year FROM "global".fiscal_date_mapping) fdm
            ON fdm.fiscal_year_week = p.current_week
            JOIN plan_smart.product_hierarchies_filter phf
            ON phf.hierarchy_code = p.hierarchy_code
            WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
			and p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
            AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
            ' || v_grouping_sets;

        ELSIF p_fiscal = 'fiscal_quarter_in_year' THEN
            queries := queries || '
            SELECT ' || quote_literal(version) || ' AS version, channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year,  
                   phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name, ' || v_formula_string || '
            FROM (' || table_name || ') p
             JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month_name_abb, fiscal_season_name, fiscal_quarter_in_year FROM "global".fiscal_date_mapping) fdm
            ON fdm.fiscal_year_week = p.current_week
            JOIN plan_smart.product_hierarchies_filter phf
            ON phf.hierarchy_code = p.hierarchy_code
            WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
			and p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
            AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
            ' || v_grouping_sets;

        ELSIF p_fiscal = 'fiscal_year_month' THEN
            queries := queries || '
            SELECT ' || quote_literal(version) || ' AS version, channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, 
                   phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name, ' || v_formula_string || '
            FROM (' || table_name || ') p
             JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month_name_abb, fiscal_season_name, fiscal_quarter_in_year FROM "global".fiscal_date_mapping) fdm
            ON fdm.fiscal_year_week = p.current_week
            JOIN plan_smart.product_hierarchies_filter phf
            ON phf.hierarchy_code = p.hierarchy_code
            WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
			and p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
            AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
            ' || v_grouping_sets;

        ELSE
            queries := queries || '
            SELECT ' || quote_literal(version) || ' AS version, channel, fdm.fiscal_year, fdm.fiscal_season_name, fdm.fiscal_quarter_in_year, fdm.fiscal_month_name_abb, current_week,
                   phf.l0_name, phf.l1_name, phf.l2_name, phf.l3_name, ' || v_formula_string || '
            FROM (' || table_name || ') p
              JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month_name_abb, fiscal_season_name, fiscal_quarter_in_year FROM "global".fiscal_date_mapping) fdm
            ON fdm.fiscal_year_week = p.current_week
            JOIN plan_smart.product_hierarchies_filter phf
            ON phf.hierarchy_code = p.hierarchy_code
            WHERE p.channel = ANY(''{' || array_to_string(p_channels, ',') || '}'')
			and p.hierarchy_code = any(''{' || v_hierarchy_code_list || '}'')
            AND p.current_week = ANY(''{' || array_to_string(p_weeks, ',') || '}'')
            ' || v_grouping_sets;
        END IF;

    END LOOP;

    -- Debugging Output
    RAISE NOTICE 'Final Query: %', queries;

    -- Execute and open the cursor
    OPEN p_refcursor FOR EXECUTE queries;
    RETURN p_refcursor;
END;
$function$
;
