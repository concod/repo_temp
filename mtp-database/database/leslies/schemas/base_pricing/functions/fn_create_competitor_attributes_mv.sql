--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_create_competitor_attributes_mv_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_create_competitor_attributes_mv_10

DROP FUNCTION IF EXISTS base_pricing.fn_create_competitor_attributes_mv;

CREATE OR REPLACE FUNCTION base_pricing.fn_create_competitor_attributes_mv()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    case_statements text := '';
    comp_record record;
    mv_sql text;
BEGIN
    RAISE NOTICE 'Starting competitor MV creation (optimized)';

    ------------------------------------------------------------------
    -- STEP 1: Build dynamic CASE statements
    ------------------------------------------------------------------
    FOR comp_record IN
        SELECT attribute_name
        FROM base_pricing.bp_competitor_attributes_metadata
        WHERE is_active = true
        ORDER BY attribute_id
    LOOP
        case_statements := case_statements || format(
            E'\n    max(CASE WHEN (ea.attribute ->> ''attribute_name'') = ''%s''
                     THEN ((ea.attribute -> ''attribute_value'' ->> ''current'')::double precision)
                     ELSE NULL END) AS %s,',
            comp_record.attribute_name,
            lower(regexp_replace(comp_record.attribute_name, '[^a-zA-Z0-9]+', '_', 'g'))
        );
    END LOOP;

    -- Remove trailing comma
    IF length(case_statements) > 0 THEN
        case_statements := left(case_statements, length(case_statements) - 1);
    END IF;

    ------------------------------------------------------------------
    -- STEP 2: Drop old MV
    ------------------------------------------------------------------
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing.mv_competitor_attributes_master';

    ------------------------------------------------------------------
    -- STEP 3: Build new MV SQL
    ------------------------------------------------------------------
    mv_sql := 'CREATE MATERIALIZED VIEW base_pricing.mv_competitor_attributes_master AS
    WITH filtered_data AS (
        SELECT 
            product_id,
            store_id,
            segment_id,
			channel_id,
            --zone_structure,
            --price_zone,
            primary_bucket,
            primary_mode,
            secondary_bucket,
            secondary_mode,
            tertiary_bucket,
            tertiary_mode,
            quaternary_bucket,
            quaternary_mode,
            competitor_attributes
        FROM base_pricing.bp_product_store_attributes_mapping
          where competitor_attributes IS NOT NULL
          AND jsonb_typeof(competitor_attributes) = ''array''
          AND competitor_attributes::text != ''[]''
    ),
    expanded AS (
        SELECT 
            fd.product_id,
            fd.store_id,
            fd.segment_id,
			fd.channel_id,
			--fd.zone_structure,
 			--fd.price_zone,
            fd.primary_bucket,
            fd.primary_mode,
            fd.secondary_bucket,
            fd.secondary_mode,
            fd.tertiary_bucket,
            fd.tertiary_mode,
            fd.quaternary_bucket,
            fd.quaternary_mode,
            jsonb_array_elements(fd.competitor_attributes) AS attribute
        FROM filtered_data fd
    )
    SELECT 
        ea.product_id,
        ea.store_id,
        ea.segment_id,
		--ea.zone_structure,
        --ea.price_zone,
		ea.channel_id,
        ea.primary_bucket,
        ea.primary_mode,
        ea.secondary_bucket,
        ea.secondary_mode,
        ea.tertiary_bucket,
        ea.tertiary_mode,
        ea.quaternary_bucket,
        ea.quaternary_mode,' || case_statements || '
    FROM expanded ea
    GROUP BY 
        ea.product_id,
        ea.store_id,
        ea.segment_id,
		--ea.zone_structure,
        --ea.price_zone,
		ea.channel_id,
        ea.primary_bucket,
        ea.primary_mode,
        ea.secondary_bucket,
        ea.secondary_mode,
        ea.tertiary_bucket,
        ea.tertiary_mode,
        ea.quaternary_bucket,
        ea.quaternary_mode
    WITH DATA';

    ------------------------------------------------------------------
    -- STEP 4: Execute MV creation
    ------------------------------------------------------------------
    RAISE NOTICE 'Executing MV creation...';
    EXECUTE mv_sql;

    ------------------------------------------------------------------
    -- STEP 5: Indexes for fast lookup
    ------------------------------------------------------------------
    EXECUTE 'DROP INDEX IF EXISTS base_pricing.idx_competitor_product_store_segment_id';
    EXECUTE 'DROP INDEX IF EXISTS base_pricing.unique_competitor_product_store_segment_id';

    EXECUTE 'CREATE INDEX idx_competitor_product_store_segment_id
             ON base_pricing.mv_competitor_attributes_master (product_id, store_id, segment_id)';

    EXECUTE 'CREATE UNIQUE INDEX unique_competitor_product_store_segment_id
             ON base_pricing.mv_competitor_attributes_master (product_id, store_id, segment_id)';

    RAISE NOTICE 'Competitor MV created successfully';
END;
$function$
;