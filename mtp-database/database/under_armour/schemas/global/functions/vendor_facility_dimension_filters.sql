--liquibase formatted sql
--changeset liquibase:vendor_facility_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for vendor_facility_dimension_filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.vendor_facility_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.vendor_facility_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query TEXT;

    -- Dynamic projections
    _projection_queries TEXT[] := ARRAY[]::TEXT[];
    _col TEXT;

    -- Filter arrays
    region_vals TEXT[] := NULL;
    country_vals TEXT[] := NULL;
    facility_name_vals TEXT[] := NULL;
    vendor_name_vals TEXT[] := NULL;
    season_name_vals TEXT[] := NULL;
    l0_name_vals TEXT[] := NULL;

BEGIN
    -------------------------------------------------------------------
    -- Extract filter arrays from JSON
    -------------------------------------------------------------------
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

    IF filter_json ? 'country' THEN
        SELECT array_agg(value)
        INTO country_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'country') AS f
            WHERE f ? 'values'
        ) s;

        IF country_vals IS NOT NULL AND cardinality(country_vals) = 0 THEN
            country_vals := NULL;
        END IF;
    END IF;

    IF filter_json ? 'facility_name' THEN
        SELECT array_agg(value)
        INTO facility_name_vals
        FROM (
            SELECT jsonb_array_elements_text(f->'values') AS value
            FROM jsonb_array_elements(filter_json->'facility_name') AS f
            WHERE f ? 'values'
        ) s;

        IF facility_name_vals IS NOT NULL AND cardinality(facility_name_vals) = 0 THEN
            facility_name_vals := NULL;
        END IF;
    END IF;

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

        IF _col = 'season_name' THEN
            IF season_name_vals IS NOT NULL THEN
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT $6::TEXT[]) AS season_name'
                );
            ELSE
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT ARRAY(
                        SELECT DISTINCT season_name
                        FROM source_smart.season_master
                        ORDER BY season_name
                    )) AS season_name'
                );
            END IF;

        ELSIF _col = 'l0_name' THEN
            IF l0_name_vals IS NOT NULL THEN
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT $6::TEXT[]) AS l0_name'
                );
            ELSE
                _projection_queries := array_append(
                    _projection_queries,
                    '(SELECT ARRAY(
                        SELECT DISTINCT vg
                        FROM b, unnest(b.vendor_group) AS vg
                        WHERE vg IS NOT NULL
                        ORDER BY vg
                    )) AS l0_name'
                );
            END IF;

        ELSIF _col = 'region'
           OR _col = 'country'
           OR _col = 'facility_name'
           OR _col = 'vendor_name' THEN

            _projection_queries := array_append(
                _projection_queries,
                'array_agg(DISTINCT b.' || _col || ' ORDER BY b.' || _col || ') AS ' || _col
            );
        END IF;

    END LOOP;

    -------------------------------------------------------------------
    -- Dynamic SQL with filter logic
    -------------------------------------------------------------------
    _query := '
        WITH base AS (
            SELECT
                fm.region,
                fm.country,
                fm.facility_name,
                vm.vendor_name,
                vm.vendor_group
            FROM source_smart.facility_master_ua fm
            JOIN source_smart.vendor_master_ua vm
                ON fm.vendor_id = vm.vendor_id
            WHERE
                ($1 IS NULL OR cardinality($1) = 0 OR fm.region = ANY($1))
                AND ($2 IS NULL OR cardinality($2) = 0 OR fm.country = ANY($2))
                AND ($3 IS NULL OR cardinality($3) = 0 OR fm.facility_name = ANY($3))
                AND ($4 IS NULL OR cardinality($4) = 0 OR vm.vendor_name = ANY($4))
                AND ($6 IS NULL OR cardinality($6) = 0 OR vm.vendor_group && $6)
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

    OPEN result FOR EXECUTE _query
        USING region_vals,
              country_vals,
              facility_name_vals,
              vendor_name_vals,
              season_name_vals,
              l0_name_vals;

END;
$function$
;
