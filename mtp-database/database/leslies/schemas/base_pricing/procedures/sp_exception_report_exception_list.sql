--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_exception_report_exception_list_3 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_exception_report_exception_list_3

DROP PROCEDURE IF EXISTS base_pricing.sp_exception_report_exception_list();

CREATE OR REPLACE PROCEDURE base_pricing.sp_exception_report_exception_list(IN p_mv_name text DEFAULT 'mv_exception_report_exception_list'::text, IN p_drop_if_exists boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_eligibility_condition TEXT;
    v_final_sql TEXT;
    v_final_rules_sql TEXT;
    p_final_rules_mv_name TEXT;
    v_competitor_count INTEGER;
    v_index_name TEXT;
BEGIN
    -- Drop existing materialized view if requested
    p_final_rules_mv_name = 'mv_exception_report_rule_list';
    
    IF p_drop_if_exists THEN
        -- Drop the main MV and its indexes will be automatically dropped
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing.%I CASCADE', p_mv_name);
        
        -- Also drop the rules MV if it exists
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing.%I CASCADE', p_final_rules_mv_name);
    END IF;

    -- Build Dynamic Attribute Query Statements
    SELECT 
        format('psam.%I <> ''N'' ', database_column)
    INTO v_eligibility_condition
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE attribute_name in ('eligibility');
    

    -- Step 2: Build the complete dynamic SQL
    v_final_sql := format($sql$
    CREATE MATERIALIZED VIEW base_pricing.%I AS
    WITH strategy_filter AS (
        SELECT strategy_id, strategy_name, strategy_status_id
        FROM base_pricing.bp_strategy_master
        WHERE strategy_status_id IN (110, 200, 210, 220)
    ),
    strategy_status AS (
        SELECT 
            ssl.strategy_status_display_name,
            ssl.strategy_status_id,
            sf.strategy_id,
            sf.strategy_name
        FROM strategy_filter sf
        JOIN base_pricing.bp_strategy_status_level ssl 
            ON sf.strategy_status_id = ssl.strategy_status_id
    ),
    finalized_with_rules_base AS (
        SELECT
            fin.strategy_id,
            fin.product_id,
            fin.store_ids,
            fin.segment_id,
            fin.opt_level_bins,
            fin.price_zone_name,
            fin.line_group,
            pcr.rule_types_applied,
            pcr.rule_exceptions_finalized
        FROM base_pricing.bp_price_reco_finalized_v2 fin
        INNER JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
        LEFT JOIN base_pricing.bp_price_change_reason pcr
            ON pcr.strategy_id = fin.strategy_id
            AND pcr.opt_level_bins = fin.opt_level_bins
    ),
    finalized_unnested AS MATERIALIZED(
        SELECT
            strategy_id,
            product_id,
            store_unnest AS store_id,
            segment_id,
            opt_level_bins,
            price_zone_name,
            line_group,
            rule_types_applied,
            rule_exceptions_finalized
        FROM finalized_with_rules_base
        CROSS JOIN LATERAL unnest(store_ids) AS store_unnest
        WHERE rule_exceptions_finalized is not null and rule_exceptions_finalized <> '{}'
    ),
    base_data AS MATERIALIZED (
        SELECT DISTINCT
            psam.product_id,
            psam.store_id,
            psam.segment_id,
            psam.price_zone,
            psam.effective_price_zone
        FROM base_pricing.bp_product_store_attributes_mapping_v4 psam
        INNER JOIN (
            SELECT DISTINCT 
                fin.product_id,
                store_unnest AS store_id,
                fin.segment_id
            FROM base_pricing.bp_price_reco_finalized_v2 fin
            INNER JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
            CROSS JOIN LATERAL unnest(fin.store_ids) AS store_unnest
        ) fin_products ON fin_products.product_id = psam.product_id
            AND fin_products.store_id = psam.store_id
            AND fin_products.segment_id = psam.segment_id
        WHERE %s -- Eligibility Condition
    ),
    finalized_prices_optimized AS (
        SELECT
            fin.strategy_id,
            fin.product_id,
            store_unnest as store_id,
            fin.segment_id,
            fin.channel_id,
            fin_un.rule_exceptions_finalized,
            STRING_AGG(DISTINCT fin.segment_name, ',') AS segment_name,
            STRING_AGG(DISTINCT fin.opt_level_bins::text, ', ') AS opt_level_bins,
            STRING_AGG(DISTINCT fin.product_name::text, ', ') AS product_name,
            STRING_AGG(DISTINCT fin.store_name::text, ', ') AS store_name,
            STRING_AGG(DISTINCT fin.price_zone_name::text, ', ') AS price_zone_name,
            STRING_AGG(DISTINCT fin.channel, ',') AS channel,
            STRING_AGG(DISTINCT fin.line_group, ',') AS line_group,
            STRING_AGG(DISTINCT fin.zone_structure_name, ',') AS zone_structure_name,
            STRING_AGG(DISTINCT fin.size_family, ',') AS size_family,
            STRING_AGG(DISTINCT fin.size_class, ',') AS size_class,
            STRING_AGG(DISTINCT fin.brand_family, ',') AS brand_family,
            STRING_AGG(DISTINCT fin.brand_class, ',') AS brand_class,
            STRING_AGG(DISTINCT fin.custom_class_1, ',') AS custom_class_1,
            STRING_AGG(DISTINCT fin.custom_family_1, ',') AS custom_family_1,
            STRING_AGG(DISTINCT fin.derived_uom, ',') AS derived_uom,
            STRING_AGG(DISTINCT fin.price_change_reason, ',') AS price_change_reason,
            ROUND(AVG(fin.base_price)::numeric, 2) AS finalized_price,
            SUM(fin.sales_units) AS total_sales_units,
            ROUND(SUM(fin.revenue)::numeric, 2) AS total_revenue,
            AVG(fin.cost) AS cost,
            AVG(fin.derived_size) AS derived_size,
            ROUND(AVG(fin.price)::numeric, 2) AS price
        FROM base_pricing.bp_price_reco_finalized_v2 fin
        CROSS JOIN LATERAL unnest(fin.store_ids) AS store_unnest
        JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
        JOIN finalized_unnested fin_un 
            ON fin_un.strategy_id = fin.strategy_id
            AND fin_un.product_id = fin.product_id
            AND fin_un.store_id::int4 = store_unnest::int4
            AND fin_un.segment_id = fin.segment_id
        GROUP BY fin.strategy_id, fin.product_id, store_unnest, fin.segment_id, fin.channel_id, fin_un.rule_exceptions_finalized
    )
    SELECT
        fp.strategy_id,
        fp.product_id::text,
        fp.store_id::text,
        fp.rule_exceptions_finalized,
        fp.segment_name,
        fp.segment_id,
        fp.channel_id,
        fp.opt_level_bins,
        fp.product_name,
        fp.store_name,
        fp.price_zone_name,
        fp.finalized_price,
        fp.total_sales_units,
        fp.total_revenue,
        fp.channel,
        fp.line_group,
        fp.zone_structure_name,
        fp.size_family,
        fp.size_class,
        fp.brand_family,
        fp.brand_class,
        fp.custom_class_1,
        fp.custom_family_1,
        fp.cost,
        fp.derived_size,
        fp.derived_uom,
        fp.price_change_reason,
        fp.price,
        ss.strategy_status_display_name AS strategy_status,
        ss.strategy_name
    FROM finalized_prices_optimized fp
    JOIN strategy_status ss ON ss.strategy_id = fp.strategy_id
    ORDER BY fp.strategy_id, fp.product_id, fp.store_id
    $sql$,
            p_mv_name,                    -- %I for MV name
            v_eligibility_condition
        );

    -- Step 3: Execute the dynamic SQL
    EXECUTE v_final_sql;

    -- Step 4: Create indexes for performance with unique names
    v_index_name := format('idx_%I_strategy_id', REPLACE(p_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(strategy_id)',
                   v_index_name, p_mv_name);

    v_index_name := format('idx_%I_product_id', REPLACE(p_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(product_id)',
                   v_index_name, p_mv_name);
    
    v_index_name := format('idx_%I_store_id', REPLACE(p_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(store_id)',
                   v_index_name, p_mv_name);

    v_index_name := format('idx_%I_segment_id', REPLACE(p_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(segment_id)',
                   v_index_name, p_mv_name);

    RAISE NOTICE 'Main MV of Exception List Created Successfully.';

    -- Build the rules MV SQL
    v_final_rules_sql := format($sql$
    CREATE MATERIALIZED VIEW base_pricing.%I
    TABLESPACE pg_default
    AS
    WITH split_rules AS (
       SELECT
           erel.strategy_id,
           erel.product_id,
           erel.store_id,
           erel.segment_id,
           erel.channel_id,
           TRIM(BOTH FROM rule_item) AS distinct_rules
       FROM base_pricing.%I erel
       CROSS JOIN LATERAL unnest(erel.rule_exceptions_finalized) AS rule_item
       WHERE erel.rule_exceptions_finalized IS NOT NULL
         AND array_length(erel.rule_exceptions_finalized, 1) > 0
    )
    SELECT DISTINCT
       distinct_rules,
       strategy_id,
       product_id,
       store_id,
       segment_id,
	   channel_id
    FROM split_rules
    WHERE distinct_rules <> ''
      AND distinct_rules IS NOT NULL
    WITH DATA;
    $sql$,
        p_final_rules_mv_name,
        p_mv_name  -- Reference the main MV name
    );
    
    -- Step 5: Execute the dynamic SQL
    EXECUTE v_final_rules_sql;

    -- Step 6: Create indexes for performance with unique names
    v_index_name := format('idx_%I_strategy_id', REPLACE(p_final_rules_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(strategy_id)',
                   v_index_name, p_final_rules_mv_name);

    v_index_name := format('idx_%I_product_id', REPLACE(p_final_rules_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(product_id)',
                   v_index_name, p_final_rules_mv_name);
    
    v_index_name := format('idx_%I_store_id', REPLACE(p_final_rules_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(store_id)',
                   v_index_name, p_final_rules_mv_name);

    v_index_name := format('idx_%I_segment_id', REPLACE(p_final_rules_mv_name, 'mv_', ''));
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON base_pricing.%I(segment_id)',
                   v_index_name, p_final_rules_mv_name);
    
    RAISE NOTICE 'Sub MV of Exception List Created Successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create materialized view %: % (SQLSTATE: %)', 
                        p_mv_name, SQLERRM, SQLSTATE;
END;
$procedure$
;
