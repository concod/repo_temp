--liquibase formatted sql
--changeset liquibase:vendor_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for vendor_dimension_filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.vendor_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.vendor_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query TEXT;

    -- Dynamic projections
    _projection_queries TEXT[] := ARRAY[]::TEXT[];
    _col TEXT;

    -- Filter arrays
    vendor_group_vals TEXT[] := NULL;
    relationship_type_vals TEXT[] := NULL;
    region_vals TEXT[] := NULL;
	vendor_name_vals TEXT[] := NULL;
	season_name_vals TEXT[] := NULL;
	l0_name_vals TEXT[] := NULL;

BEGIN

    -------------------------------------------------------------------
    -- Extract filter arrays from JSON
    -------------------------------------------------------------------
	IF filter_json ? 'vendor_name' THEN 
		SELECT array_agg(value) 
		INTO vendor_name_vals 
		FROM ( 
			SELECT jsonb_array_elements_text(f->'values') AS value 
			FROM jsonb_array_elements(filter_json->'vendor_name') AS f 
			WHERE f ? 'values' 
		) s;
		
		IF vendor_name_vals IS NOT NULL AND cardinality(vendor_name_vals) = 0 THEN 
			vendor_name_vals := NULL; 
		END IF;
	END IF;

    IF filter_json ? 'vendor_group' THEN
        SELECT array_agg(value)
        INTO vendor_group_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'vendor_group') AS f
            WHERE f ? 'values'
        ) s;

        IF vendor_group_vals IS NOT NULL AND cardinality(vendor_group_vals) = 0 THEN
            vendor_group_vals := NULL;
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

    IF filter_json ? 'relationship_type' THEN
        SELECT array_agg(value)
        INTO relationship_type_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'relationship_type') AS f
            WHERE f ? 'values'
        ) s;

        IF relationship_type_vals IS NOT NULL AND cardinality(relationship_type_vals) = 0 THEN
            relationship_type_vals := NULL;
        END IF;
    END IF;

    IF filter_json ? 'region' THEN
        SELECT array_agg(value)
        INTO region_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'region') AS f
            WHERE f ? 'values'
        ) s;

        IF region_vals IS NOT NULL AND cardinality(region_vals) = 0 THEN
            region_vals := NULL;
        END IF;
    END IF;

	IF filter_json ? 'season_name' THEN
        SELECT array_agg(value)
        INTO season_name_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'season_name') AS f
            WHERE f ? 'values'
        ) s;
        IF season_name_vals IS NOT NULL AND cardinality(season_name_vals) = 0 THEN
            season_name_vals := NULL;
        END IF;
    END IF;

    -------------------------------------------------------------------
    -- Build dynamic SELECT projection
    -------------------------------------------------------------------
    FOREACH _col IN ARRAY attribute_list LOOP
        -- Handle vendor_group and l0_name the same way - with array intersection
        IF _col = 'vendor_group' THEN
            IF vendor_group_vals IS NOT NULL THEN
                -- Return only filter values
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT $1::TEXT[]) AS vendor_group'
                );
            ELSE
                -- Return all vendor_group values from rows
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT ARRAY(SELECT DISTINCT unnest(b.vendor_group) FROM b ORDER BY 1)) AS vendor_group'
                );
            END IF;

        ELSIF _col = 'l0_name' THEN
            IF l0_name_vals IS NOT NULL THEN
                -- Return only filter values
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT $5::TEXT[]) AS l0_name'
                );
            ELSE
                -- Return all l0_name values from product_attributes_filter
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT ARRAY(SELECT DISTINCT l0_name FROM global.product_attributes_filter ORDER BY l0_name)) AS l0_name'
                );
            END IF;

        ELSIF _col = 'vendor_name' OR _col = 'relationship_type' OR _col = 'region' THEN
            _projection_queries := array_append(
                _projection_queries,
                'array_agg(DISTINCT b.' || _col || ' ORDER BY b.' || _col || ') AS ' || _col
            );

		ELSIF _col = 'season_name' THEN
            IF season_name_vals IS NOT NULL THEN
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT $4::TEXT[]) AS season_name'
                );
            ELSE
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT ARRAY(SELECT DISTINCT season_name FROM source_smart.season_master ORDER BY season_name)) AS season_name'
                );
            END IF;
        END IF;
    END LOOP;

    -------------------------------------------------------------------
    -- Dynamic SQL with filter logic
    -------------------------------------------------------------------
    _query := '
        WITH base AS (
            SELECT *
            FROM source_smart.vendor_master_ua vm
            WHERE 
                ($1 IS NULL OR cardinality($1) = 0 OR vm.vendor_group && $1)
                AND ($2 IS NULL OR cardinality($2) = 0 OR vm.relationship_type = ANY($2))
                AND ($3 IS NULL OR cardinality($3) = 0 OR vm.region = ANY($3))
                AND ($4 IS NULL OR cardinality($4) = 0 OR vm.vendor_name = ANY($4))
                AND ($5 IS NULL OR cardinality($5) = 0 OR vm.vendor_group && $5)
        ),
        b AS (
            SELECT * FROM base
        ),
        anchor AS (
            SELECT 1
            WHERE EXISTS (
                SELECT 1 FROM source_smart.season_master
            )
        )
        SELECT ' || array_to_string(_projection_queries, ', ') || '
        FROM anchor
        LEFT JOIN b ON TRUE;
    ';

    -------------------------------------------------------------------
    -- Execute
    -------------------------------------------------------------------
    result := input;
	raise notice '_query: %', _query;
    OPEN result FOR EXECUTE _query
        USING vendor_group_vals, relationship_type_vals, region_vals, vendor_name_vals, l0_name_vals;

END;
$function$
;
