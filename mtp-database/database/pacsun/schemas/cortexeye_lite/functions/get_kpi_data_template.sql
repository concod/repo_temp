--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:get_kpi_data_template runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_kpi_data_template
--rollback: SELECT 1

DROP FUNCTION IF EXISTS cortexeye_lite.get_kpi_data_template(kpi_list character varying[]);

CREATE OR REPLACE FUNCTION cortexeye_lite.get_kpi_data_template(kpi_list character varying[])
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
BEGIN

	SELECT ARRAY_AGG(intermediate_column)
	INTO intermediate_columns
	FROM cortexeye_lite.kpis_master_intermediate_link
	WHERE kpi_name = ANY (kpi_list);

	WITH base AS (
		SELECT a.table_name, ARRAY_AGG(array[intermediate_column, formula]) AS intermediate_col_array
		FROM cortexeye_lite.kpis_master_intermediate_v2 as a
		WHERE intermediate_column = ANY(intermediate_columns)
		  AND (template IS NULL or template = '')
		GROUP BY a.table_name
	)
	SELECT JSON_AGG(ROW_TO_JSON(base))
	INTO inter_formula_tables
	FROM base;

	RAISE NOTICE '%s', inter_formula_tables::text;
		
	WITH base AS (
		SELECT template, ARRAY_AGG(array[intermediate_column]) AS templates
		FROM cortexeye_lite.kpis_master_intermediate_v2
		WHERE intermediate_column = ANY (intermediate_columns)
		  AND length(template) > 0
        GROUP BY template
	)
	SELECT JSON_AGG(ROW_TO_JSON(base))
	INTO template_queries
	FROM base;
	
	RAISE NOTICE '%', template_queries::text;

	WITH base AS (
		SELECT name, formula
		FROM cortexeye_lite.kpis_master_v2
		WHERE name = ANY (kpi_list) 
	)
	SELECT JSON_AGG(ROW_TO_JSON(base))
	INTO kpi_final_formulas
	FROM base;


	IF template_queries IS NOT NULL THEN
		FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(template_queries)
		LOOP 
			template_ := elem->>'template';
			template_cols := elem->'templates';

			IF final_template = '' THEN
				final_template := format('cte_%s AS (%s)', cte_idx, template_);
			ELSE
				final_template := final_template  || E', 
' || format('cte_%s AS (%s)', cte_idx, template_);
			END IF;

			cte_columns := cte_columns || JSONB_BUILD_OBJECT(
				'cte', format('cte_%s', cte_idx),
				'columns', COALESCE(template_cols, '[]'::jsonb)
			);

			cte_names := ARRAY_APPEND(cte_names, format('cte_%s', cte_idx));

			cte_idx := cte_idx + 1;
		END LOOP;
	END IF;

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
						WHEN select_list = '' THEN format('%s AS %I', col_arr[2], col_arr[1])
						ELSE select_list || format(', %s AS %I', col_arr[2], col_arr[1])
					END;
				END LOOP;
			END IF;

			IF final_template = '' THEN
				final_template := format(
					'cte_%s AS (SELECT {{ agg_cols | join_list_with_prefix('''') }} {%% if agg_cols %%} , {%% endif %%} %s FROM {{ project_id }}.{{ dataset_id }}.%s WHERE {{ timeline_where_clause }} {%% if where_clause %%} AND {{ where_clause}} {%% endif %%} {%% if agg_cols %%} GROUP BY {{ agg_cols | join_list_with_prefix('''') }} {%% endif %%})',
					cte_idx, select_list, table_name
				);
			ELSE
				final_template := final_template || E',
' || format(
					'cte_%s AS (SELECT {{ agg_cols | join_list_with_prefix('''') }} {%% if agg_cols %%} , {%% endif %%} %s FROM {{ project_id }}.{{ dataset_id }}.%s WHERE {{ timeline_where_clause }} {%% if where_clause %%} AND {{ where_clause}} {%% endif %%} {%% if agg_cols %%} GROUP BY {{ agg_cols | join_list_with_prefix('''') }} {%% endif %%})',
					cte_idx, select_list, table_name
				);
			END IF;

			cte_columns := cte_columns || JSONB_BUILD_OBJECT(
				'cte', format('cte_%s', cte_idx),
				'columns', COALESCE(cols, '[]'::jsonb)
			);

			cte_names := ARRAY_APPEND(cte_names, format('cte_%s', cte_idx));

			cte_idx := cte_idx + 1;
		END LOOP;
	END IF;

	IF kpi_final_formulas IS NOT NULL THEN
		FOR elem IN SELECT * FROM JSONB_ARRAY_ELEMENTS(kpi_final_formulas)
		LOOP
			_kpi_name := elem->>'name';
			kpi_formula := elem->>'formula';
			IF kpi_formula IS NULL OR kpi_formula = '' THEN
				CONTINUE;
			END IF;

			kpi_formula_qualified := kpi_formula;

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
										format(E'\y%s\y', col_name_text),
										format('%I.%I', cte_name_text, col_name_text),
										'g'
									);
								END IF;
							END LOOP;
						END IF;
					END LOOP;
				END;
			END IF;

			kpi_select_list := CASE
				WHEN kpi_select_list = '' THEN format('%s AS %I', kpi_formula_qualified, _kpi_name)
				ELSE kpi_select_list || format(', %s AS %I', kpi_formula_qualified, _kpi_name)
			END;
		END LOOP;
	END IF;

	IF ARRAY_LENGTH(cte_names, 1) IS NOT NULL AND ARRAY_LENGTH(cte_names, 1) > 0 THEN
		from_clause := format('FROM %I', cte_names[1]);
		IF ARRAY_LENGTH(cte_names, 1) > 1 THEN
			FOR i IN 2..ARRAY_LENGTH(cte_names, 1) LOOP
				from_clause := from_clause || format(' FULL OUTER JOIN %I {%% if agg_cols %%} USING ({{ agg_cols | join_list_with_prefix('''') }}) {%% else %%} ON TRUE {%% endif %%}', cte_names[i]);
			END LOOP;
		END IF;
	END IF;

	IF kpi_select_list <> '' AND from_clause <> '' THEN
		final_template := final_template || E',
' ||
			format('final_cte AS (SELECT {%% if timeline_agg_cols %%} row_number() over(order by {{ timeline_agg_cols }}) as _rnk, {%% endif %%} {{ agg_cols | join_list_with_prefix('''') }} {%% if agg_cols %%} , {%% endif %%} %s %s)', kpi_select_list, from_clause);
	END IF;

	RETURN QUERY SELECT final_template || E',
' || replace(replace(replace(final_template, 'cte_', 'ccte_'), '_cte', '_ccte'), 'timeline_where_clause', 'compare_timeline_where_clause');
END;
$function$
;