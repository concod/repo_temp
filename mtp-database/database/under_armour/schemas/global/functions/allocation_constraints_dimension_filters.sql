--liquibase formatted sql
--changeset liquibase:allocation_constraints_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for allocation_constraints_dimension_filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.allocation_constraints_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.allocation_constraints_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	DECLARE
	    _query TEXT;
	
	    -- Dynamic projections
	    _projection_queries TEXT[] := ARRAY[]::TEXT[];
	    _col TEXT;
	
	    -- Filter arrays
	    l0_names TEXT[] := NULL;
	    season_names TEXT[] := NULL;
	
	BEGIN
	    -------------------------------------------------------------------
	    -- Extract filter arrays from JSON
	    -------------------------------------------------------------------
	    IF filter_json ? 'l0_name' THEN
	        SELECT array_agg(value)
	        INTO l0_names
	        FROM (
	            SELECT jsonb_array_elements_text(f->'values') AS value
	            FROM jsonb_array_elements(filter_json->'l0_name') AS f
	            WHERE f ? 'values'
	        ) s;
	
	        IF l0_names IS NOT NULL AND cardinality(l0_names) = 0 THEN
	            l0_names := NULL;
	        END IF;
	    END IF;
	
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
	
	    
	
	    -------------------------------------------------------------------
	    -- Build dynamic SELECT projection
	    -------------------------------------------------------------------
	   FOREACH _col IN ARRAY attribute_list LOOP
	    _projection_queries := array_append(
	        _projection_queries,
	        'array_agg(DISTINCT base.' || _col || ' ORDER BY base.' || _col || ') AS ' || _col
	    );
		END LOOP;

	
	    -------------------------------------------------------------------
	    -- Dynamic SQL with filter logic
	    -------------------------------------------------------------------
	    _query := '
	        WITH 
	        l0_values AS (
	            SELECT DISTINCT paf.l0_name
	            FROM global.product_attributes_filter paf 
	            WHERE ($2 IS NULL OR cardinality($2) = 0 OR paf.l0_name = ANY($2))
	        ),
	        season_values AS (
	            SELECT DISTINCT sm.season_name
	            FROM source_smart.season_master sm
	            WHERE ($1 IS NULL OR cardinality($1) = 0 OR sm.season_name = ANY($1))
	        ),
	        base AS (
	            SELECT 
	                l0.l0_name,
	                s.season_name
	            FROM l0_values l0
	            CROSS JOIN season_values s
	        )
			SELECT ' || array_to_string(_projection_queries, ', ') || ' FROM base;
	    ';
	
	    -------------------------------------------------------------------
	    -- Execute
	    -------------------------------------------------------------------
	    result := input;
	
	    OPEN result FOR EXECUTE _query
	        USING season_names, l0_names;
	
	END;
$function$
;
