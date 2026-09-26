--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_kpi_data_template_new_trend runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updation of the if condition
--rollback: SELECT 1

DROP FUNCTION IF EXISTS monday_smart.get_kpi_data_template_new_trend(_varchar);

CREATE OR REPLACE FUNCTION monday_smart.get_kpi_data_template_new_trend(kpi_list character varying[])
 RETURNS TABLE(kpi_template text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    intermediate_columns varchar[];
    kpi_final_formulas jsonb;
    inter_formula_tables jsonb;
    template_queries jsonb;
    final_template text := '';
    cte_columns jsonb := '[]'::jsonb;
    elem jsonb;
    table_name text;
    cols jsonb;
    col text;
    select_list text;
    cte_idx int := 1;
    col_arr varchar[];
    cte_names text[] := '{}';
    _kpi_name text;
    kpi_formula text;
    kpi_formula_qualified text;
    kpi_select_list text := '';
    from_clause text := '';
    i int;
    template_ text;
    template_cols jsonb;
    final_select_statement text := '';
    current_kpi_select_list text := '';
    current_kpi_name text;
BEGIN
    -- Get intermediate columns for the KPI list
    SELECT ARRAY_AGG(intermediate_column)
    INTO intermediate_columns
    FROM monday_smart.kpis_master_intermediate_link
    WHERE kpi_name = ANY (kpi_list);

    -- Get intermediate formula tables
    WITH base AS (
        SELECT a.table_name, ARRAY_AGG(array[intermediate_column, formula]) AS intermediate_col_array
        FROM monday_smart.kpis_master_intermediate_v2 as a
        WHERE intermediate_column = ANY(intermediate_columns)
          AND (template IS NULL or template = '')
        GROUP BY a.table_name
    )
    SELECT JSON_AGG(ROW_TO_JSON(base))
    INTO inter_formula_tables
    FROM base;

    -- Get template queries
    WITH base AS (
        SELECT template, ARRAY_AGG(array[intermediate_column]) AS templates
        FROM monday_smart.kpis_master_intermediate_v2
        WHERE intermediate_column = ANY (intermediate_columns)
          AND length(template) > 0
        GROUP BY template
    )
    SELECT JSON_AGG(ROW_TO_JSON(base))
    INTO template_queries
    FROM base;

    -- Get KPI final formulas
    WITH base AS (
        SELECT name, formula
        FROM monday_smart.kpis_master_v2
        WHERE name = ANY (kpi_list) 
    )
    SELECT JSON_AGG(ROW_TO_JSON(base))
    INTO kpi_final_formulas
    FROM base;

    -- Build CURRENT PERIOD CTEs (Last 5 days data)
    IF template_queries IS NOT NULL THEN
        FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(template_queries)
        LOOP 
            template_ := elem->>'template';
            template_cols := elem->'templates';

            IF final_template = '' THEN
                final_template := 'cte_' || cte_idx || ' AS (' || template_ || ')';
            ELSE
                final_template := final_template || E',\n' || 'cte_' || cte_idx || ' AS (' || template_ || ')';
            END IF;

            cte_columns := cte_columns || JSONB_BUILD_OBJECT(
                'cte', 'cte_' || cte_idx,
                'columns', COALESCE(template_cols, '[]'::jsonb)
            );

            cte_names := ARRAY_APPEND(cte_names, 'cte_' || cte_idx);
            cte_idx := cte_idx + 1;
        END LOOP;
    END IF;

    -- Build intermediate formula CTEs for current period
    IF inter_formula_tables IS NOT NULL THEN
        FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(inter_formula_tables)
        LOOP
            table_name := elem->>'table_name';
            cols := elem->'intermediate_col_array';

            select_list := '';
            IF cols IS NOT NULL AND JSONB_TYPEOF(cols) = 'array' THEN
                FOR col IN
                    SELECT value FROM JSONB_ARRAY_ELEMENTS(cols) AS t(value)
                LOOP
                    col_arr := REPLACE(REPLACE(col, '[', '{'),']','}')::varchar[];
                    select_list := CASE
                        WHEN select_list = '' THEN col_arr[2] || ' AS ' || col_arr[1]
                        ELSE select_list || ', ' || col_arr[2] || ' AS ' || col_arr[1]
                    END;
                END LOOP;
            END IF;

            -- Build current period CTE with daily aggregation for last 5 days
            IF final_template = '' THEN
                final_template := 'cte_' || cte_idx || ' AS (SELECT {{ agg_cols | join_list_with_prefix('''') }}, date_id, EXTRACT(DAYOFWEEK FROM date_id) AS weekday';
                IF select_list != '' THEN
                    final_template := final_template || ', ' || select_list;
                END IF;
                final_template := final_template || ' FROM {{ project_id }}.{{ dataset_id }}.' || table_name || ' WHERE {{ timeline_where_clause }}';
                IF select_list != '' THEN
                    final_template := final_template || ' {% if agg_cols %} GROUP BY {{ agg_cols | join_list_with_prefix('''') }}, date_id, EXTRACT(DAYOFWEEK FROM date_id) {% endif %}';
                END IF;
                final_template := final_template || ')';
            ELSE
                final_template := final_template || E',\n' || 'cte_' || cte_idx || ' AS (SELECT {{ agg_cols | join_list_with_prefix('''') }}, date_id, EXTRACT(DAYOFWEEK FROM date_id) AS weekday';
                IF select_list != '' THEN
                    final_template := final_template || ', ' || select_list;
                END IF;
                final_template := final_template || ' FROM {{ project_id }}.{{ dataset_id }}.' || table_name || ' WHERE {{ timeline_where_clause }}';
                IF select_list != '' THEN
                    final_template := final_template || ' {% if agg_cols %} GROUP BY {{ agg_cols | join_list_with_prefix('''') }}, date_id, EXTRACT(DAYOFWEEK FROM date_id) {% endif %}';
                END IF;
                final_template := final_template || ')';
            END IF;

            cte_columns := cte_columns || JSONB_BUILD_OBJECT(
                'cte', 'cte_' || cte_idx,
                'columns', COALESCE(cols, '[]'::jsonb)
            );

            cte_names := ARRAY_APPEND(cte_names, 'cte_' || cte_idx);
            cte_idx := cte_idx + 1;
        END LOOP;
    END IF;

    -- Build KPI selection list
    IF kpi_final_formulas IS NOT NULL THEN
        FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(kpi_final_formulas)
        LOOP
            _kpi_name := elem->>'name';
            kpi_formula := elem->>'formula';
            IF kpi_formula IS NULL OR kpi_formula = '' THEN
                CONTINUE;
            END IF;

            kpi_formula_qualified := kpi_formula;

            -- Qualify column names with CTE names
            IF cte_columns IS NOT NULL AND JSONB_TYPEOF(cte_columns) = 'array' THEN
                DECLARE cte_obj jsonb;
                DECLARE cte_col_pair jsonb;
                DECLARE cte_name_text text;
                DECLARE col_name_text text;
                BEGIN
                    FOR cte_obj IN SELECT * FROM JSONB_ARRAY_ELEMENTS(cte_columns)
                    LOOP
                        cte_name_text := cte_obj->>'cte';
                        IF cte_obj ? 'columns' AND JSONB_TYPEOF(cte_obj->'columns') = 'array' THEN
                            FOR cte_col_pair IN SELECT * FROM JSONB_ARRAY_ELEMENTS(cte_obj->'columns')
                            LOOP
                                col_name_text := cte_col_pair->>0;
                                IF col_name_text IS NOT NULL AND col_name_text <> '' THEN
                                    kpi_formula_qualified := REGEXP_REPLACE(
                                        kpi_formula_qualified,
                                        E'\\y' || col_name_text || E'\\y',
                                        cte_name_text || '.' || col_name_text,
                                        'g'
                                    );
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END;
            END IF;

            -- Generate current period KPI columns for final SELECT
            current_kpi_select_list := CASE
                WHEN current_kpi_select_list = '' THEN 'final_cte.' || _kpi_name || ' AS ' || _kpi_name
                ELSE current_kpi_select_list || ', final_cte.' || _kpi_name || ' AS ' || _kpi_name
            END;

            -- Original kpi_select_list for final_cte
            kpi_select_list := CASE
                WHEN kpi_select_list = '' THEN kpi_formula_qualified || ' AS ' || _kpi_name
                ELSE kpi_select_list || ', ' || kpi_formula_qualified || ' AS ' || _kpi_name
            END;
        END LOOP;
    END IF;

    -- Build FROM clause
    IF ARRAY_LENGTH(cte_names, 1) IS NOT NULL AND ARRAY_LENGTH(cte_names, 1) > 0 THEN
        from_clause := 'FROM ' || cte_names[1];
        IF ARRAY_LENGTH(cte_names, 1) > 1 THEN
            FOR i IN 2..ARRAY_LENGTH(cte_names, 1) LOOP
                from_clause := from_clause || ' FULL OUTER JOIN ' || cte_names[i] || ' {% if agg_cols %} USING ({{ agg_cols | join_list_with_prefix('''') }}) {% else %} ON TRUE {% endif %}';
            END LOOP;
        END IF;
    END IF;

    -- Build final CTE
    IF kpi_select_list <> '' AND from_clause <> '' THEN
        final_template := final_template || E',\n' ||
            'final_cte AS (SELECT {{ agg_cols | join_list_with_prefix('''') }}, date_id, weekday, ' || kpi_select_list || ' ' || from_clause || ')';
    END IF;

    -- Generate the final SELECT statement with proper final_cte references
    final_select_statement := E'SELECT \n' ||
        E'    -- Product and Date Information\n' ||
        E'    {{ agg_cols | join_list_with_prefix(''final_cte'') }} AS product_name,\n' ||
        E'    final_cte.date_id,\n' ||
        E'    final_cte.weekday,\n' ||
        E'    \n' ||
        E'    -- KPI Data (Last 5 days)\n' ||
        current_kpi_select_list || E'\n' ||
        E'\n' ||
        E'FROM final_cte\n' ||
        E'ORDER BY {{ agg_cols | join_list_with_prefix(''final_cte'') }}, final_cte.date_id';

    -- Return the complete template
    RETURN QUERY SELECT 'WITH ' || final_template || E'\n' || final_select_statement;
END;
$function$
;

