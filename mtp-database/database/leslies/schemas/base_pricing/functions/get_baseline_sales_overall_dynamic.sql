--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:get_baseline_sales_overall_dynamic_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.get_baseline_sales_overall_dynamic_10

DROP FUNCTION IF EXISTS base_pricing.get_baseline_sales_overall_dynamic;

CREATE OR REPLACE FUNCTION base_pricing.get_baseline_sales_overall_dynamic(p_week_dates date[], p_strategy_id integer, p_is_logged boolean)
 RETURNS TABLE(product_id bigint, store_id integer, segment_id integer, channel_id integer, week_start_date date, segment_baseline_sales double precision, segment_price numeric, segment_cost numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    unlogged_table TEXT;
    table_suffix TEXT;
BEGIN
    IF p_is_logged THEN
        table_suffix := '_true';
    ELSE
        table_suffix := '_false';
    END IF;
    
    unlogged_table := 'bp_unlogged_combinations_' || p_strategy_id || table_suffix;
    
    RETURN QUERY EXECUTE format('
        SELECT 
            bso.product_id,
            bso.store_id,
            bso.segment_id,
            bso.channel_id,
            bso.week_start_date,
            bso.segment_baseline_sales,
            bso.segment_price,
            bso.segment_cost
        FROM
            base_pricing.bp_baseline_sales_overall bso
            INNER JOIN (
                SELECT DISTINCT 
                    product_id::BIGINT as product_id,
                    store_id,
                    segment_id 
                FROM base_pricing.%I
            ) pf USING (product_id, store_id, segment_id)
        WHERE 
            bso.week_start_date = ANY($1)
    ', unlogged_table) USING p_week_dates;
END;
$function$
;