--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_finalized_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_to_finalized_batch

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_to_finalized_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_finalized_batch(IN var_promo_id integer, IN table_name_to_insert character varying, IN from_table_to_insert character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    v_parent_table varchar;
    v_date_suffix varchar;
    v_partition_date date;
    query varchar;

BEGIN

-- Purpose: Transfers simulated promotion results to a finalized table for reporting and analysis.
--   Uses unlogged table + partition exchange (DETACH/ATTACH) for maximum performance.
-- Partition hierarchy:
--   ps_recommended_finalized (LIST by promo_id)
--     └─ ps_recommended_finalized_{promo_id} (RANGE by recommendation_date)
--          └─ ps_recommended_finalized_{promo_id}_{YYYYMMDD} (leaf) ← this is table_name_to_insert
-- Example: CALL price_promo_opt.pc_simulation_insert_data_to_finalized_batch_v2(933, 'price_promo.ps_recommended_finalized_933_20260529', 'price_promo_opt_temp.promo_results_933_100');
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input from_table_to_insert - Source table containing simulation results
--   * Output table_name_to_insert - Leaf partition table (e.g. ps_recommended_finalized_933_20260529)
-- Returns: No direct return value; detaches old leaf, creates unlogged table with same name,
--   inserts new data, and attaches it as the new leaf partition. No rename needed.

        -- Step 1: Derive parent table name and partition date from the leaf table name
        --   table_name_to_insert = 'price_promo.ps_recommended_finalized_933_20260529'
        --   parent = 'price_promo.ps_recommended_finalized_933'
        --   date suffix = '20260529'
        v_date_suffix := substring(table_name_to_insert from '_([0-9]{8})$');
        v_parent_table := substring(table_name_to_insert from '^(.+)_[0-9]{8}$');
        v_partition_date := to_date(v_date_suffix, 'YYYYMMDD');

        RAISE NOTICE 'Parent: %, Leaf: %, Date: %', v_parent_table, table_name_to_insert, v_partition_date;

        -- Step 2: Detach the old leaf partition from its parent (metadata-only, near instant)
        EXECUTE format('ALTER TABLE %s DETACH PARTITION %s',
                        v_parent_table, table_name_to_insert);
        RAISE NOTICE 'Detached old leaf: % from %', table_name_to_insert, v_parent_table;

        -- Step 3: Drop the old leaf partition table (frees the name)
        EXECUTE format('DROP TABLE IF EXISTS %s', table_name_to_insert);
        RAISE NOTICE 'Dropped old leaf: %', table_name_to_insert;

        -- Step 4: Create UNLOGGED table with the original leaf name (no WAL, no rename needed)
        EXECUTE format('CREATE UNLOGGED TABLE %s (LIKE %s INCLUDING DEFAULTS)',
                        table_name_to_insert, v_parent_table);
        RAISE NOTICE 'Created unlogged table: %', table_name_to_insert;

        -- Step 5: Bulk insert from source into the new unlogged table (single copy, no WAL)
        query := format('
            INSERT INTO %s
            (event_id, promo_id, product_id, recommendation_date,
            store_reco_level, customer_reco_level, currency_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price,
            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue,
            margin, baseline_margin, incremental_margin,
            affinity_revenue, cannibalization_revenue, pull_forward_revenue,
            affinity_margin, cannibalization_margin, pull_forward_margin,
            created_by, updated_by, created_at, updated_at,
            contribution_margin, contribution_revenue, coupon_spend, offer_type_combined_display_name)
            SELECT event_id, promo_id, product_id, recommendation_date,
            store_reco_level, customer_reco_level, currency_id,
            discount_level_value, offer_type_id,
            effective_discount, original_cost, discounted_price,
            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,
            revenue, baseline_revenue, incremental_revenue,
            margin, baseline_margin, incremental_margin,
            affinity_revenue, cannibalization_revenue, pull_forward_revenue,
            affinity_margin, cannibalization_margin, pull_forward_margin,
            created_by, updated_by, created_at, updated_at,
            contribution_margin, contribution_revenue, coupon_spend, offer_type_combined_display_name
            FROM %s;
        ', table_name_to_insert, from_table_to_insert);

        RAISE NOTICE 'Inserting data: %', query;
        EXECUTE query;

        -- Step 6: Attach the new table as the leaf partition (metadata-only, near instant)
        EXECUTE format('ALTER TABLE %s ATTACH PARTITION %s FOR VALUES FROM (''%s'') TO (''%s'')',
                        v_parent_table, table_name_to_insert,
                        v_partition_date, v_partition_date + INTERVAL '1 day');
        RAISE NOTICE 'Attached new leaf partition: % for date %', table_name_to_insert, v_partition_date;

END;


$procedure$
;
