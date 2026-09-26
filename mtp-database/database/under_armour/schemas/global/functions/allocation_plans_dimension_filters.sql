--liquibase formatted sql
--changeset liquibase:allocation_plans_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for allocation_plans_dimension_filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS "global".allocation_plans_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.allocation_plans_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	DECLARE
	    _query TEXT;
	
	    -- Dynamic projections
	    _projection_queries TEXT[] := ARRAY[]::TEXT[];
	    _col TEXT;
	
	    -- Filter arrays
	    season_names TEXT[] := NULL;
		categories TEXT[] := NULL;
		forecast_versions TEXT[] := NULL;
		l0_name_vals TEXT[] := NULL;
	
	BEGIN
	    -------------------------------------------------------------------
	    -- Extract filter arrays from JSON
	    -------------------------------------------------------------------
	    IF filter_json ? 'season_name' THEN
	        SELECT array_agg(value)
	        INTO season_names
	        FROM (
	            SELECT jsonb_array_elements_text(f->'values') AS value
	            FROM jsonb_array_elements(filter_json->'season_name') AS f
	            WHERE f ? 'values'
	        ) s;
	
	        IF season_names IS NOT NULL AND cardinality(season_names) = 0 THEN
	            season_names := NULL;
	        END IF;
	    END IF;
	
	    IF filter_json ? 'category' THEN
	        SELECT array_agg(value)
	        INTO categories
	        FROM (
	            SELECT jsonb_array_elements_text(f->'values') AS value
	            FROM jsonb_array_elements(filter_json->'category') AS f
	            WHERE f ? 'values'
	        ) s;
	
	        IF categories IS NOT NULL AND cardinality(categories) = 0 THEN
	            categories := NULL;
	        END IF;
	    END IF;

		IF filter_json ? 'forecast_version' THEN
	        SELECT array_agg(value)
	        INTO forecast_versions
	        FROM (
	            SELECT jsonb_array_elements_text(f->'values') AS value
	            FROM jsonb_array_elements(filter_json->'forecast_version') AS f
	            WHERE f ? 'values'
	        ) s;
	
	        IF forecast_versions IS NOT NULL AND cardinality(forecast_versions) = 0 THEN
	            forecast_versions := NULL;
	        END IF;
	    END IF;

		IF filter_json ? 'l0_name' THEN
	        SELECT array_agg(value)
	        INTO l0_name_vals
	        FROM (
	            SELECT jsonb_array_elements_text(f->'values') AS value
	            FROM jsonb_array_elements(filter_json->'l0_name') AS f
	            WHERE f ? 'values'
	        ) s;
	
	        IF l0_name_vals IS NOT NULL AND cardinality(l0_name_vals) = 0 THEN
	            l0_name_vals := NULL;
	        END IF;
	    END IF;
	
	    
	    -------------------------------------------------------------------
	    -- Build dynamic SELECT projection
	    -------------------------------------------------------------------
	   FOREACH _col IN ARRAY attribute_list LOOP
	   		-- Handle l0_name like in vendor_dimension_filters
	   		IF _col = 'l0_name' THEN
	   			IF l0_name_vals IS NOT NULL THEN
	   				-- Return only filter values
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT $4::TEXT[]) AS l0_name'
	   				);
	   			ELSE
	   				-- Return all l0_name values from product_attributes_filter
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT ARRAY(SELECT DISTINCT l0_name FROM global.product_attributes_filter ORDER BY l0_name)) AS l0_name'
	   				);
	   			END IF;
	   		
	   		ELSIF _col = 'season_name' THEN
	   			IF season_names IS NOT NULL THEN
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT $1::TEXT[]) AS season_name'
	   				);
	   			ELSE
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT ARRAY(SELECT DISTINCT season_name FROM source_smart.season_master ORDER BY season_name)) AS season_name'
	   				);
	   			END IF;
	   		
	   		ELSIF _col = 'category' THEN
	   			IF categories IS NOT NULL THEN
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT $2::TEXT[]) AS category'
	   				);
	   			ELSE
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT ARRAY(SELECT DISTINCT l0_name FROM global.product_attributes_filter ORDER BY l0_name)) AS category'
	   				);
	   			END IF;
	   		
	   		ELSIF _col = 'forecast_version' THEN
	   			IF forecast_versions IS NOT NULL THEN
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT $3::TEXT[]) AS forecast_version'
	   				);
	   			ELSE
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT ARRAY(SELECT forecast_version FROM (VALUES (''GMP 0.5''::text), (''GMP 1''::text), (''RDP 1''::text), (''CYCLE''::text)) AS t(forecast_version) ORDER BY forecast_version)) AS forecast_version'
	   				);
	   			END IF;
	   		
	   		ELSE
	   			_projection_queries := array_append(
	   				_projection_queries,
	   				'array_agg(DISTINCT base.' || _col || ' ORDER BY base.' || _col || ') AS ' || _col
	   			);
	   		END IF;
		END LOOP;

	
	    -------------------------------------------------------------------
	    -- Dynamic SQL with filter logic
	    -------------------------------------------------------------------
	    _query := '
	        WITH 
	        anchor AS (
	            SELECT 1
	            WHERE EXISTS (
	                SELECT 1 FROM source_smart.season_master
	            )
	        )
			SELECT ' || array_to_string(_projection_queries, ', ') || ' FROM anchor';
	
	    -------------------------------------------------------------------
	    -- Execute
	    -------------------------------------------------------------------
	    result := input;
		raise notice '_query: %', _query;
	    OPEN result FOR EXECUTE _query
	        USING season_names, categories, forecast_versions, l0_name_vals;
	
	END;
$function$
;