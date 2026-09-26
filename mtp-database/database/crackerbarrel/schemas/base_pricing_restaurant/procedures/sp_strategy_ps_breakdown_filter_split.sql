--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_filter_split_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_ps_breakdown_filter_split_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_ps_breakdown_filter_split;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_ps_breakdown_filter_split(IN strategy_id integer, IN kvi_status text, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    split_table_name text;
    filter_table_name text;
BEGIN
    start_time := clock_timestamp();

    split_table_name := format(
        'base_pricing_restaurant.temp_strategy_ps_breakdown_filter_split_%s_%s_%s_%s_%s',
        strategy_id,
        kvi_status,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    filter_table_name := format(
        'base_pricing_restaurant.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    sql_query := format(
$query$

DROP TABLE IF EXISTS %s;

CREATE UNLOGGED TABLE %s AS
SELECT
    buc.product_id,
    buc.store_id,
    buc.segment_id,
    sbf.price_zone_name
FROM
    base_pricing_restaurant.bp_strategy_products_stores_%s buc
    INNER JOIN %s sbf
        ON buc.product_id = sbf.product_id
        AND buc.store_id::text = sbf.store_id
        AND buc.segment_id = sbf.segment_id;

DROP INDEX IF EXISTS %s;

CREATE INDEX %s ON %s USING btree (product_id, store_id, segment_id);

$query$,
        split_table_name,
        split_table_name,
        strategy_id,
        filter_table_name,
        format('idx_ps_split_%s_%s_%s_%s_%s',
	        strategy_id,
	        kvi_status,
	        comparison_column_1,
	        comparison_value_1,
	        user_id
	    ),
	
	    format('idx_ps_split_%s_%s_%s_%s_%s',
	        strategy_id,
	        kvi_status,
	        comparison_column_1,
	        comparison_value_1,
	        user_id
	    ),
        split_table_name
    );

    RAISE NOTICE 'Creating table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken: %', end_time - start_time;

    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_filter_split', start_time, end_time, end_time - start_time);

END;
$procedure$
;