--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_final_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_final_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_final_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_final_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    segment_codes text[];
    final_price_selection text := '';
    seg text;
BEGIN
    start_time := clock_timestamp();
    -- Fetch active segment codes
    SELECT array_agg(segment_code) INTO segment_codes
    FROM base_pricing_restaurant.bp_customer_segment_master
    WHERE is_active IS TRUE;
    -- Final price selection string
    FOREACH seg IN ARRAY segment_codes LOOP
        final_price_selection := final_price_selection ||
        format(
    ',
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pfppd.%s_price_final
        ELSE COALESCE(
                pfplda.%s_price_final_lg,
                pfpldi.%s_price_final_lg,
                pfpldi.%s_price_lg,
                pfppd.%s_price_final,
                pfppd.%s_price
        ) END AS %s_price_final'
            , seg, seg, seg, seg, seg, seg, seg
        );
    END LOOP;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_final_data;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_passive_final_prices_final_data AS
SELECT
    pfppd.product_id,
    pfppd.line_group,
    pfppd.pre_price,
    pfppd.price_freeze
    -- Final prices
    %s
FROM
    base_pricing_restaurant.temp_passive_final_prices_product_data_inactive pfppd
    LEFT JOIN base_pricing_restaurant.temp_passive_final_prices_lg_data_active pfplda
        USING (line_group)
    LEFT JOIN base_pricing_restaurant.temp_passive_final_prices_lg_data_inactive pfpldi
        USING (line_group);
-- INDEX creation
CREATE INDEX idx_temp_passive_final_prices_final_data_id1
    ON base_pricing_restaurant.temp_passive_final_prices_final_data (product_id);
$query$,
    final_price_selection
);
    RAISE NOTICE 'Creating temp_passive_final_prices_final_data : %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_passive_final_prices_final_data : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_final_data - ', start_time, end_time, end_time - start_time);
END;
$procedure$
;