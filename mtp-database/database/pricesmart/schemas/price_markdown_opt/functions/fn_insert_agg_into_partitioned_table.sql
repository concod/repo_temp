--liquibase formatted sql
--changeset liquibase:fn_insert_agg_into_partitioned_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_insert_agg_into_partitioned_table

DROP FUNCTION IF EXISTS price_markdown_opt.fn_insert_agg_into_partitioned_table(int4, text, int4, text, text);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_insert_agg_into_partitioned_table(_strategy_id integer, _tb_agg_temp_10 text, _pcd_id integer, _table_type text, _version text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    query_1 text;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    _part_pcd_start_date text;
begin
    SELECT to_char(pcd_start_date ,'yyyymmdd') as _part_pcd_start_date
    FROM (
        SELECT t1.pcd_start_date FROM price_markdown.tb_strategy_pcd t1
        where strategy_id = _strategy_id and pcd_id = _pcd_id group by 1) tab into _part_pcd_start_date;

    query_1 := format('
            INSERT INTO price_markdown.tb_%5$s_%6$s_%1$s_%2$s
            (
            strategy_id, product_level_id, store_level_id,
            recommendation_date, recommended_offer_percentage, effective_price_point,
            pcd_id, sales_units, margin, revenue, status, created_at, updated_at,
            created_by, updated_by, rem_inv, spend, sales_units_uncapped, previous_markdown_percentage, channel_info
            )
            select strategy_id, product_level_id, store_level_id, recommendation_date,
                recommended_offer_percentage, effective_price_point, pcd_id, sales_units,
                margin, revenue, 1 as status, created_at,
                updated_at, 0 as created_by, 0 as updated_by,
                rem_inv, spend, sales_units_uncapped, previous_markdown_percentage, channel_info
            FROM %3$s
            WHERE
                pcd_id = %4$s;',
            _strategy_id, _part_pcd_start_date, _tb_agg_temp_10, _pcd_id, _table_type, _version);

        RAISE NOTICE 'query -- %', query_1;

        start_time := clock_timestamp();
        EXECUTE query_1;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL for event %: %',  _pcd_id, end_time - start_time;

END;
$function$
;
