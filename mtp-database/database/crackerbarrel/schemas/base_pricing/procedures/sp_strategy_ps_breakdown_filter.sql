--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_filter_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_filter_2

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_ps_breakdown_filter;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_filter(IN strategy_id integer, IN channel_id text, IN segment_id text, IN comparison_column_1 text, IN comparison_value_1 text, IN comparison_column_2 text, IN comparison_value_2 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    condition_1 TEXT;
    condition_2 TEXT;
    value_list_1 TEXT;
    value_list_2 TEXT;
    temp_table_name TEXT;
BEGIN
    start_time := clock_timestamp();

    -- Table name
    temp_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    -- Value list 1
	IF comparison_column_1 IN ('product_id', 'store_id') THEN
	    value_list_1 := comparison_value_1;
	ELSE
	    value_list_1 := quote_literal(trim(comparison_value_1));
	END IF;
	
	-- Value list 2
	IF comparison_column_2 IN ('product_id', 'store_id') THEN
	    value_list_2 := comparison_value_2;
	ELSE
	    value_list_2 := quote_literal(trim(comparison_value_2));
	END IF;

    -- Conditions
    condition_1 := format('%s IN (%s)', comparison_column_1, value_list_1);
    condition_2 := format('%s IN (%s)', comparison_column_2, value_list_2);

    sql_query := format(
$query$

DROP TABLE IF EXISTS %s;

CREATE UNLOGGED TABLE %s AS
SELECT
    product_id,
    store_id::text AS store_id,
    segment_id,
    channel_id,
    line_group,
    price_zone_name
FROM
    base_pricing.bp_strategy_product_stores_details_%s
WHERE
    channel_id IN (%s)
    AND segment_id IN (%s)
    AND %s
    AND %s;

-- Indexes (short names to avoid identifier truncation)
CREATE INDEX idx_psbf_%s_1
ON %s USING btree (product_id, store_id, segment_id);

CREATE INDEX idx_psbf_%s_2
ON %s USING btree (store_id);

$query$,
        temp_table_name,
        temp_table_name,
        strategy_id,
        channel_id,
        segment_id,
        condition_1,
        condition_2,
        strategy_id,
        temp_table_name,
        strategy_id,
        temp_table_name
    );

    RAISE NOTICE 'Creating table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken for table creation: %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_filter', start_time, end_time, end_time - start_time);

END;
$procedure$
;