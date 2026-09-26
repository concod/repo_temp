--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_kpi_data_template_anomalous runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updation of the if condition
--rollback: SELECT 1

drop function if exists monday_smart.get_kpi_data_template_anomalous(_varchar);

CREATE FUNCTION monday_smart.get_kpi_data_template_anomalous(kpi_list character varying[])
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
    -- Variables for proper KPI column generation
    current_kpi_select_list text := '';
    comparable_kpi_select_list text := '';
    historical_kpi_select_list text := '';
    final_select_statement text := '';
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

    -- Build CURRENT PERIOD CTEs
    IF template_queries IS NOT NULL THEN
        FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(template_queries)
        LOOP 
            template_ := elem->>'template';
            template_cols := elem->'templates';

            IF final_template = '' THEN
                final_template := 'cte_' || cte_idx || ' AS (' || template_ || ')';
            ELSE
                final_template := final_template || ', ' || chr(10) || 'cte_' || cte_idx || ' AS (' || template_ || ')';
            END IF;

            cte_columns := cte_columns || JSONB_BUILD_OBJECT(
                'cte', 'cte_' || cte_idx,
                'columns', COALESCE(template_cols, '[]'::jsonb)
            );

            cte_names := ARRAY_APPEND(cte_names, 'cte_' || cte_idx);
            cte_idx := cte_idx + 1;
        END LOOP;
    END IF;

    -- Build intermediate formula CTEs
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

            IF final_template = '' THEN
                final_template := 'cte_' || cte_idx || ' AS (SELECT {{ agg_cols | join_list_with_prefix('''') }}';
                IF select_list != '' THEN
                    final_template := final_template || ', ' || select_list;
                END IF;
                final_template := final_template || ' FROM {{ project_id }}.{{ dataset_id }}.' || table_name || ' WHERE {{ timeline_where_clause }}';
                IF select_list != '' THEN
                    final_template := final_template || ' {% if agg_cols %} GROUP BY {{ agg_cols | join_list_with_prefix('''') }} {% endif %}';
                END IF;
                final_template := final_template || ')';
            ELSE
                final_template := final_template || ', ' || chr(10) || 'cte_' || cte_idx || ' AS (SELECT {{ agg_cols | join_list_with_prefix('''') }}';
                IF select_list != '' THEN
                    final_template := final_template || ', ' || select_list;
                END IF;
                final_template := final_template || ' FROM {{ project_id }}.{{ dataset_id }}.' || table_name || ' WHERE {{ timeline_where_clause }}';
                IF select_list != '' THEN
                    final_template := final_template || ' {% if agg_cols %} GROUP BY {{ agg_cols | join_list_with_prefix('''') }} {% endif %}';
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

    -- Build KPI selection list and generate proper period-specific columns
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
                                        '\y' || col_name_text || '\y',
                                        cte_name_text || '.' || col_name_text,
                                        'g'
                                    );
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END;
            END IF;

            -- Generate proper period-specific KPI columns
            current_kpi_select_list := CASE
                WHEN current_kpi_select_list = '' THEN 'final_cte.' || _kpi_name || ' AS current_' || _kpi_name
                ELSE current_kpi_select_list || ', final_cte.' || _kpi_name || ' AS current_' || _kpi_name
            END;
            
            comparable_kpi_select_list := CASE
                WHEN comparable_kpi_select_list = '' THEN 'final_ccte.' || _kpi_name || ' AS comparable_' || _kpi_name
                ELSE comparable_kpi_select_list || ', final_ccte.' || _kpi_name || ' AS comparable_' || _kpi_name
            END;
            
            historical_kpi_select_list := CASE
                WHEN historical_kpi_select_list = '' THEN 'final_hcte.' || _kpi_name || ' AS historical_' || _kpi_name
                ELSE historical_kpi_select_list || ', final_hcte.' || _kpi_name || ' AS historical_' || _kpi_name
            END;

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

    -- Build final CTE with proper comma placement
    IF kpi_select_list <> '' AND from_clause <> '' THEN
        final_template := final_template || ', ' || chr(10) ||
            'final_cte AS (SELECT {% if timeline_agg_cols %} row_number() over(order by {{ timeline_agg_cols }}) as _rnk, {% endif %} {{ agg_cols | join_list_with_prefix('''') }} {% if agg_cols %} , {% endif %} ' || kpi_select_list || ' ' || from_clause || ')';
    END IF;

    -- **CRITICAL FIX**: Generate the final SELECT statement with proper comma placement
    final_select_statement := 'SELECT ' || chr(10) ||
        '    -- Hierarchy Columns (Dynamic based on agg_cols)' || chr(10) ||
        '    {% for col in agg_cols %}' || chr(10) ||
        '    COALESCE(final_cte.{{ col }}, final_ccte.{{ col }}, final_hcte.{{ col }}) AS {{ col }}{% if not loop.last %},{% endif %}' || chr(10) ||
        '    {% endfor %}' || ',' || chr(10) ||
        '    ' || chr(10) ||
        '    -- Current Period Data' || chr(10) ||
        current_kpi_select_list || ',' || chr(10) ||  -- ✅ COMMA ADDED HERE
        '    ' || chr(10) ||
        '    -- Comparable Period Data' || chr(10) ||
        comparable_kpi_select_list || ',' || chr(10) ||  -- ✅ COMMA ADDED HERE
        '    ' || chr(10) ||
        '    -- Historical Period Data' || chr(10) ||
        historical_kpi_select_list || ',' || chr(10) ||  -- ✅ COMMA ADDED HERE
        '    ' || chr(10) ||
        '    -- Period Identifiers' || chr(10) ||
        '    ''current'' AS current_period_type,' || chr(10) ||
        '    ''comparable'' AS comparable_period_type,' || chr(10) ||
        '    ''historical'' AS historical_period_type,' || chr(10) ||
        '    '''' AS period_type,' || chr(10) ||
        '    ''product'' AS dimension_type' || chr(10) ||
        ' ' || chr(10) ||
        'FROM final_cte' || chr(10) ||
        'FULL OUTER JOIN final_ccte USING ({{ agg_cols | join_list_with_prefix('''') }})' || chr(10) ||
        'FULL OUTER JOIN final_hcte USING ({{ agg_cols | join_list_with_prefix('''') }})' || chr(10) ||
        'ORDER BY {% for col in agg_cols %}{% if not loop.first %}, {% endif %}COALESCE(final_cte.{{ col }}, final_ccte.{{ col }}, final_hcte.{{ col }}){% endfor %}';

    -- Create the three periods and final SELECT with proper KPI references
    RETURN QUERY SELECT 'WITH ' || final_template || ', ' || chr(10) || 
        replace(replace(replace(final_template, 'cte_', 'ccte_'), '_cte', '_ccte'), 'timeline_where_clause', 'compare_timeline_where_clause') || ', ' || chr(10) ||
        replace(replace(replace(final_template, 'cte_', 'hcte_'), '_cte', '_hcte'), 'timeline_where_clause', 'historical_timeline_where_clause') || chr(10) ||
        final_select_statement;
END;
$function$
;

