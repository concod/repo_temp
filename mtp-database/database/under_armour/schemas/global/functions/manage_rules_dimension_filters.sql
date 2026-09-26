--liquibase formatted sql
--changeset liquibase:manage_rules_dimension_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: making function compatible with l0 selected in filter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.manage_rules_dimension_filters(in refcursor, in _varchar, in jsonb, out refcursor);

CREATE OR REPLACE FUNCTION global.manage_rules_dimension_filters(input refcursor, attribute_list character varying[], filter_json jsonb, OUT result refcursor)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
   _query TEXT;
   _projection_queries TEXT[] := ARRAY[]::TEXT[];
   _col TEXT;
   -- extracted filters
   season_name_vals TEXT[];
   l0_vals TEXT[];
   l2_vals TEXT[];
   subcategory_vals TEXT[];
   sourcing_class_vals TEXT[];
   calender_vals TEXT[];
   expected_toolset_vals TEXT[];
   region_vals TEXT[];
   -- l0_name restriction based on attribute_list
   l0_allowed TEXT[];
BEGIN
   ------------------------------------------------------------------
   -- Extract filters from payload.filters[]
   ------------------------------------------------------------------
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
       INTO l0_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'l0_name') AS f
           WHERE f ? 'values'
       ) s;
       IF l0_vals IS NOT NULL AND cardinality(l0_vals) = 0 THEN
           l0_vals := NULL;
       END IF;
   END IF;
	IF filter_json ? 'l2_name' THEN
       SELECT array_agg(value)
       INTO l2_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'l2_name') AS f
           WHERE f ? 'values'
       ) s;
       IF l2_vals IS NOT NULL AND cardinality(l2_vals) = 0 THEN
           l2_vals := NULL;
       END IF;
   END IF;
	IF filter_json ? 'subcategory' THEN
       SELECT array_agg(value)
       INTO subcategory_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'subcategory') AS f
           WHERE f ? 'values'
       ) s;
       IF subcategory_vals IS NOT NULL AND cardinality(subcategory_vals) = 0 THEN
           subcategory_vals := NULL;
       END IF;
   END IF;
	IF filter_json ? 'sourcing_class_name' THEN
       SELECT array_agg(value)
       INTO sourcing_class_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'sourcing_class_name') AS f
           WHERE f ? 'values'
       ) s;
       IF sourcing_class_vals IS NOT NULL AND cardinality(sourcing_class_vals) = 0 THEN
           sourcing_class_vals := NULL;
       END IF;
   END IF;
IF filter_json ? 'calendar' THEN
       SELECT array_agg(value)
       INTO calender_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'calendar') AS f
           WHERE f ? 'values'
       ) s;
       IF calender_vals IS NOT NULL AND cardinality(calender_vals) = 0 THEN
           calender_vals := NULL;
       END IF;
   END IF;
IF filter_json ? 'expected_toolset' THEN
       SELECT array_agg(value)
       INTO expected_toolset_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'expected_toolset') AS f
           WHERE f ? 'values'
       ) s;
       IF expected_toolset_vals IS NOT NULL AND cardinality(expected_toolset_vals) = 0 THEN
           expected_toolset_vals := NULL;
       END IF;
   END IF;
IF filter_json ? 'store_code' THEN
       SELECT array_agg(value)
       INTO region_vals
       FROM (
           SELECT jsonb_array_elements_text(f->'values') AS value
           FROM jsonb_array_elements(filter_json->'store_code') AS f
           WHERE f ? 'values'
       ) s;
       IF region_vals IS NOT NULL AND cardinality(region_vals) = 0 THEN
           region_vals := NULL;
       END IF;
   END IF;

   ------------------------------------------------------------------
   -- Determine l0_name allowed values based on attribute_list
   ------------------------------------------------------------------
   IF 'expected_toolset' = ANY(attribute_list) OR 'subcategory' = ANY(attribute_list) THEN
       l0_allowed := ARRAY['Footwear'];
   ELSIF 'sourcing_class_name' = ANY(attribute_list) OR 'calendar' = ANY(attribute_list) THEN
       l0_allowed := ARRAY['Accessories', 'Apparel'];
   END IF;

   -- If l0_allowed is set and l0_vals is not explicitly selected, restrict l0_vals
   IF l0_allowed IS NOT NULL THEN
       IF l0_vals IS NULL THEN
           l0_vals := l0_allowed;
       ELSE
           -- Intersect user selection with allowed values
           SELECT array_agg(v)
           INTO l0_vals
           FROM unnest(l0_vals) AS v
           WHERE v = ANY(l0_allowed);
       END IF;
   END IF;

   ------------------------------------------------------------------
   -- Build projections
   ------------------------------------------------------------------
  FOREACH _col IN ARRAY attribute_list LOOP
       IF _col = 'forecast_version' THEN
           _projection_queries := array_append(
               _projection_queries,
               '(SELECT ARRAY[''GMP'',''RDP'']) AS forecast_version'
           );
       ELSIF _col = 'store_code' THEN
           _projection_queries := array_append(
               _projection_queries,
               '(SELECT COALESCE(array_agg(DISTINCT store_code ORDER BY store_code), ARRAY[]::text[])
                 FROM source_smart.store_master_ua
                 WHERE ($8 IS NULL OR store_code = ANY($8))) AS region'
           );
       ELSIF _col = 'season_name' THEN
           _projection_queries := array_append(
               _projection_queries,
               '(SELECT COALESCE(array_agg(DISTINCT season_name ORDER BY season_name), ARRAY[]::text[])
                 FROM source_smart.season_master) AS season_name'
           );
       ELSIF _col = 'l0_name' THEN
           -- If l0_allowed is set, return only allowed values
           IF l0_allowed IS NOT NULL THEN
               _projection_queries := array_append(
                   _projection_queries,
                   format(
                       '(SELECT COALESCE(array_agg(DISTINCT %I ORDER BY %I), ARRAY[]::text[])
                        FROM base_query WHERE %I = ANY($9)) AS %I',
                       _col, _col, _col, _col
                   )
               );
           ELSE
               _projection_queries := array_append(
                   _projection_queries,
                   format(
                       '(SELECT COALESCE(array_agg(DISTINCT %I ORDER BY %I), ARRAY[]::text[])
                        FROM base_query) AS %I',
                       _col, _col, _col
                   )
               );
           END IF;
       ELSE
           -- For cascaded product attributes, use COALESCE and do not filter by the same attribute
           _projection_queries := array_append(
               _projection_queries,
               format(
                   '(SELECT COALESCE(array_agg(DISTINCT %I ORDER BY %I), ARRAY[]::text[])
                    FROM base_query) AS %I',
                   _col, _col, _col
               )
           );
       END IF;
   END LOOP;
   ------------------------------------------------------------------
   -- Final query
   ------------------------------------------------------------------
   _query := '
       WITH eligible_products AS (
           SELECT sp.product_code
           FROM source_smart.season_product_mapping_ua sp
           JOIN source_smart.season_master sm
             ON sm.season_id = sp.season_id
           WHERE ($1 IS NULL OR sm.season_name = ANY($1))
       ),
       base_query AS (
           SELECT
               pa.l0_name,
               pa.l2_name,
               pa.subcategory,
               pa.calendar,
               pa.expected_toolset,
               sc.sourcing_class_name,
               pa.product_code
           FROM "global".product_attributes_filter pa
           JOIN source_smart.sourcing_class_master_ua sc
             ON pa.sourcing_class_id = sc.sourcing_class_id
           JOIN eligible_products ep
             ON ep.product_code = pa.product_code
           WHERE
   ($2 IS NULL OR cardinality($2) = 0 OR pa.l0_name = ANY($2))
AND ($3 IS NULL OR cardinality($3) = 0 OR pa.l2_name = ANY($3))
AND ($4 IS NULL OR cardinality($4) = 0 OR pa.subcategory = ANY($4))
AND ($5 IS NULL OR cardinality($5) = 0 OR sc.sourcing_class_name = ANY($5))
AND ($6 IS NULL OR cardinality($6) = 0 OR pa.calendar = ANY($6))
AND ($7 IS NULL OR cardinality($7) = 0 OR pa.expected_toolset = ANY($7))
       )
       SELECT ' || array_to_string(_projection_queries, ', ') || ';
   ';
   ------------------------------------------------------------------
   -- Execute
   ------------------------------------------------------------------
   result := input;
   OPEN result FOR EXECUTE _query
       USING
           season_name_vals,
           l0_vals,
           l2_vals,
           subcategory_vals,
           sourcing_class_vals,
           calender_vals,
           expected_toolset_vals,
           region_vals,
           l0_allowed;
END;
$function$
;