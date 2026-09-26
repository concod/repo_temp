--liquibase formatted sql
--changeset liquibase:get_pivot_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_pivot_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_pivot_data(refcursor, integer, text[], jsonb);
CREATE OR REPLACE FUNCTION plan_smart.get_pivot_data(refcursor, integer, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	/*  
	 * Function/Procedure name: plan_smart.get_pivot_data
	 * Created by: Devaraj Jagannath
	 * Created at: 30-Jul-2022
	 * No of input parameter: 4
	 * Parameter Description: $1 = Cursor
	 *                        $2 = Plan code
	 *						  $3 = List of metrics to fetch	 
	 *                        $4 = Product hierarchy
	 * 
	 * Purpose: Fetches the metrics pivot data for a given hierarchy 
	 */
	DECLARE 
		_query_filter TEXT := '';
		_week_level_sql TEXT[];
		_weeks INT[];
		_wk INT;
		_query_combine TEXT := '';
		_cols TEXT[];
		_col TEXT;
		_cols_combined TEXT := '';
		_max_levels INT; 
		_level_cols TEXT[];
		_rollup_cols INT[];
		_level_cols_combined TEXT;
		_rollup_cols_combined TEXT;

	BEGIN
		SELECT attribute_value::int[] INTO _weeks FROM plan_smart.plan_attributes WHERE plan_code = $2 AND attribute_name = 'weeks';
		_query_filter := "plan_smart".form_attribute_table_filters('product_hierarchies', 'hierarchy_code', $4);
	 
		SELECT count(*) INTO _max_levels FROM jsonb_object_keys($4); 
		FOR cnt IN 0.._max_levels-1 LOOP
			_level_cols := array_append(_level_cols, 'l' || cnt || '_name');
			_rollup_cols := array_append(_rollup_cols, cnt+1);
		END LOOP;
	   
		_rollup_cols := array_append(_rollup_cols, array_length(_rollup_cols, 1)+1);
		_level_cols_combined := array_to_string(_level_cols, ',', '');
		_rollup_cols_combined := array_to_string(_rollup_cols, ',', '');
		RAISE NOTICE '% | % ', _level_cols_combined, _rollup_cols_combined;
	 
		FOREACH _col IN ARRAY $3 LOOP
			_cols := array_append(_cols, '
			sum((compared_week_data->>'''|| _col ||''')::float8) AS ly_'||_col||',
			sum((current_week_data->>'''|| _col ||''')::float8) AS cy_'||_col);
		END LOOP;
		_cols_combined := array_to_string(_cols, ',', '');
		FOREACH _col IN ARRAY $3 LOOP
			_cols_combined := _cols_combined || ',
			sum((forecasted_data->>'''|| _col ||''')::float8) AS forecasted_'||_col;
		END LOOP;
		 FOREACH _wk IN ARRAY _weeks LOOP
			_week_level_sql := array_append(_week_level_sql, '
				select 
					' || _level_cols_combined || ',
					current_week,
					'|| _cols_combined || '
				from (
					select
						*
					from
						plan_smart.plan_metrics_data
					where
						plan_code = ' || $2 || '
						and current_week = ' || _wk || ') pmd
				join (' || (replace(_query_filter, '"', '')) || ') phf on
					pmd.hierarchy_code = phf.hierarchy_code
				group by rollup(' || _rollup_cols_combined || ')');
		END LOOP;
		_query_combine := array_to_string(_week_level_sql, ' UNION ALL ', '');
		RAISE NOTICE '%', _query_combine;
		OPEN $1 FOR EXECUTE _query_combine;
		RETURN $1;
	END;
$function$
;
