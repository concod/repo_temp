--liquibase formatted sql
--changeset liquibase:allocation_repo_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for allocation_repo_dimension_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".allocation_repo_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.allocation_repo_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
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
		l0_name_vals TEXT[] := NULL;
	
	    -- Cascading logic variables
	    _has_season_filter BOOLEAN := FALSE;
	    _has_category_filter BOOLEAN := FALSE;
	    _has_l0_name_filter BOOLEAN := FALSE;
	
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
	
	        IF season_names IS NOT NULL AND cardinality(season_names) > 0 THEN
	            _has_season_filter := TRUE;
	        ELSE
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
	
	        IF categories IS NOT NULL AND cardinality(categories) > 0 THEN
	            _has_category_filter := TRUE;
	        ELSE
	            categories := NULL;
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
	
	        IF l0_name_vals IS NOT NULL AND cardinality(l0_name_vals) > 0 THEN
	            _has_l0_name_filter := TRUE;
	        ELSE
	            l0_name_vals := NULL;
	        END IF;
	    END IF;
	    
	    -------------------------------------------------------------------
	    -- Build dynamic SELECT projection
	    -------------------------------------------------------------------
	   FOREACH _col IN ARRAY attribute_list LOOP
	   		-- Handle l0_name like in other dimension functions
	   		IF _col = 'l0_name' THEN
	   			IF l0_name_vals IS NOT NULL THEN
	   				-- Return only filter values
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT $3::TEXT[]) AS l0_name'
	   				);
	   			ELSE
	   				-- Return all l0_name values from product_attributes_filter
	   				_projection_queries := array_append(
	   					_projection_queries,
	   					'(SELECT ARRAY(SELECT DISTINCT l0_name FROM global.product_attributes_filter ORDER BY l0_name)) AS l0_name'
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
	   		
	   		ELSE
	   			_projection_queries := array_append(
	   				_projection_queries,
	   				'array_agg(DISTINCT base.' || _col || ' ORDER BY base.' || _col || ') AS ' || _col
	   			);
	   		END IF;
		END LOOP;
		
	
	    -------------------------------------------------------------------
	    -- Dynamic SQL with cascading filter logic
	    -- Cascading: If season is filtered, show only categories for those seasons
	    -- Backward Cascading: If category is filtered, show only seasons that have those categories
	    -------------------------------------------------------------------
	    _query := '
	        WITH 
	        filtered_seasons AS (
	            SELECT DISTINCT season_name
	            FROM source_smart.allocation_plans
	            WHERE ($1 IS NULL OR cardinality($1) = 0 OR season_name = ANY($1))
	        ),
	        filtered_categories AS (
	            SELECT DISTINCT category
	            FROM source_smart.allocation_plans
	            WHERE ($2 IS NULL OR cardinality($2) = 0 OR category = ANY($2))
	        ),
	        -- Season-Category mapping for cascading logic
	        season_category_mapping AS (
	            SELECT DISTINCT season_name, category
	            FROM source_smart.allocation_plans
	            WHERE ($1 IS NULL OR cardinality($1) = 0 OR season_name = ANY($1))
	              AND ($2 IS NULL OR cardinality($2) = 0 OR category = ANY($2))
	        )
		';
	    
	    -- Apply cascading logic based on what's being filtered
	    IF _has_season_filter AND NOT _has_category_filter THEN
	        -- Season filtered, show categories for those seasons (cascading)
	        _query := _query || '
	            , category_values AS (
	                SELECT DISTINCT category
	                FROM season_category_mapping
	                WHERE season_name = ANY($1)
	            ),
	            season_values AS (
	                SELECT season_name FROM filtered_seasons
	            ),
	            base AS (
	                SELECT 
	                    s.season_name,
	                    c.category
	                FROM season_values s
	                CROSS JOIN category_values c
	            )
			';
	    ELSIF NOT _has_season_filter AND _has_category_filter THEN
	        -- Category filtered, show seasons for those categories (backward cascading)
	        _query := _query || '
	            , season_values AS (
	                SELECT DISTINCT season_name
	                FROM season_category_mapping
	                WHERE category = ANY($2)
	            ),
	            category_values AS (
	                SELECT category FROM filtered_categories
	            ),
	            base AS (
	                SELECT 
	                    s.season_name,
	                    c.category
	                FROM season_values s
	                CROSS JOIN category_values c
	            )
			';
	    ELSIF _has_season_filter AND _has_category_filter THEN
	        -- Both filtered, show only valid combinations
	        _query := _query || '
	            , base AS (
	                SELECT DISTINCT season_name, category
	                FROM season_category_mapping
	                WHERE season_name = ANY($1) AND category = ANY($2)
	            )
			';
	    ELSE
	        -- No filters, show all combinations
	        _query := _query || '
	            , base AS (
	                SELECT DISTINCT season_name, category
	                FROM source_smart.allocation_plans
	            )
			';
	    END IF;
	
	    _query := _query || '
			SELECT ' || array_to_string(_projection_queries, ', ') || ' FROM base;
	    ';
	
	    -------------------------------------------------------------------
	    -- Execute
	    -------------------------------------------------------------------
	    result := input;
	
	    OPEN result FOR EXECUTE _query
	        USING season_names, categories, l0_name_vals;
	
	END;
$function$
;