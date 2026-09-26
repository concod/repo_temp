--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:fiscal_date_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:fiscal_date_dimension_filters
--comment: Fiscal date dimension filters with cascading logic updated
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.fiscal_date_dimension_filters(input refcursor, character varying[], jsonb);
CREATE OR REPLACE FUNCTION global.fiscal_date_dimension_filters(input refcursor, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 Returns aggregated distinct values for fiscal date attributes with special formatting for product_season_name and product_sub_season
 with associated fiscal_year_week ranges and column values in structured format
 Calling Statement: 
 	 select * from global.fiscal_date_dimension_filters('abc','{"fiscal_year","fiscal_quarter","fiscal_month"}', 
 	'{"start_date": [{"operator": "in", "type": "list", "values": ["2024-01-01"], "dimension": "fiscal_date"}], "end_date": [{"operator": "in", "type": "list", "values": ["2024-03-31"], "dimension": "fiscal_date"}]}')
  */
	declare
	_query text := '';
	_projection_queries text[];
	_col text;
    _attr_obj jsonb;
	_check_config jsonb;
	_check_config_val jsonb;
	_res jsonb;
	_res_item jsonb;
    _res_array text[] := '{}';
    _temp text;
    _sp_input_arg text;
    _gap_fill_query text := '';
    _date_range_filter text := '';
    _min_date date;
    _max_date date;
    _current_week_start date;
    _weeks_end date;
    _base_filter_query text;
    _cascading_where text := '';
    _start_date_filter jsonb;
    _end_date_filter jsonb;
    _start_date text;
    _end_date text;
    _date_series_array text[];
    _date_record record;
    _season_projection_queries text[];
    
	begin

		-- Get base query from form_attribute_table_filters_v21 using modified filters
		_base_filter_query := "global".form_attribute_table_filters_v4('fiscal_date_attributes',
				'date', 'global.fiscal_date_mapping', $3);
		
		raise notice 'Base filter query: %', _base_filter_query;
		
		-- Build the final query with CTE for single base query execution
		_projection_queries := array[]::text[];
		
		-- Build projections for all columns
		foreach _col in array $2 loop
			if _col IN ('product_season_name', 'product_sub_season', 'product_week') then
				-- These columns get special treatment with fiscal_year_week ranges
				_projection_queries := array_append(_projection_queries, 
					'(SELECT json_agg(
						json_build_object(
							' || _col || ', 
							json_build_object(''fiscal_year_week'', json_build_array(min_week, max_week))
						)
					 )
					 FROM (
						SELECT ' || _col || ', 
							   min(fiscal_year_week) as min_week, 
							   max(fiscal_year_week) as max_week
						FROM filtered_data
						WHERE date IS NOT NULL AND ' || _col || ' IS NOT NULL AND fiscal_year_week IS NOT NULL
						GROUP BY ' || _col || '
						ORDER BY ' || _col || '
					 ) ranges) as ' || _col);
			else
				-- Other columns use normal aggregation from CTE
				_projection_queries := array_append(_projection_queries, 
					'array_agg(distinct ' || _col || ' ORDER BY ' || _col || ') as ' || _col);
			end if;
		end loop;
		
		-- Build the final query with CTE
		_query := 'WITH filtered_data AS (' || _base_filter_query || ')
			SELECT ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || '
			FROM filtered_data
			WHERE date IS NOT NULL';
				 
 		raise notice 'Final query: %', _query;
		
    open $1 for execute _query;
 	RETURN $1;
	end
$function$; 