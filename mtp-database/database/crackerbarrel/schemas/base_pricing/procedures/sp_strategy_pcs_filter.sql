--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_pcs_filter stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pcs_filter

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pcs_filter;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pcs_filter(IN strategy_id integer, IN product_hierarchy_string character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    temp_strategy_pcs_filter_query TEXT;
BEGIN
    start_time := clock_timestamp();
    temp_strategy_pcs_filter_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.strategy_pcs_filter_%s;
CREATE UNLOGGED TABLE base_pricing.strategy_pcs_filter_%s AS
SELECT DISTINCT
    product_id,
    %s
    s0_cid AS channel_id,
    segment_id
FROM
    base_pricing.bp_unlogged_combinations_%s bsps
    INNER JOIN base_pricing.bp_product_master bpm
        USING (product_id)
    INNER JOIN base_pricing.bp_store_master bsm
        USING (store_id)
;
-- INDEX creation
CREATE INDEX bp_strategy_pcs_filter_%s_idx1
    ON base_pricing.strategy_pcs_filter_%s USING btree (product_id, channel_id, segment_id);
CREATE INDEX bp_strategy_pcs_filter_%s_idx2
    ON base_pricing.strategy_pcs_filter_%s USING btree (%s channel_id, segment_id);
$query$,
    strategy_id,
    strategy_id,
    product_hierarchy_string,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    product_hierarchy_string
    );
    -- Execute the query
    RAISE NOTICE 'Creating temp_strategy_pcs_filter table: %', temp_strategy_pcs_filter_query;
    EXECUTE temp_strategy_pcs_filter_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken temp_strategy_pcs_filter table : %', end_time - start_time;
END;
$procedure$
;