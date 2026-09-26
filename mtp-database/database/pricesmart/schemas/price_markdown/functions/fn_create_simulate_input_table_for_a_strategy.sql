--liquibase formatted sql
--changeset liquibase:vamsi.balaga@impactanalytics.co:fn_create_simulate_input_table_for_a_strategy-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed return type of price_markdown.fn_create_simulate_input_table_for_a_strategy.


DROP FUNCTION if exists price_markdown.fn_create_simulate_input_table_for_a_strategy;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_simulate_input_table_for_a_strategy(p_strategy_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
	begin
        _query  = format('
            CREATE UNLOGGED TABLE if not exists price_markdown_temp.tb_simulate_input_%1$s (
                    strategy_id int4 NULL,
                    product_level_id int8 NULL,
                    product_level_value text NULL,
                    store_level_id int8 NULL,
                    store_level_value text NULL,
                    pcd_id int4 NULL,
                    discount_percent float8 NULL,
                    previous_discount_percent float8 NULL,
                    incremental_discount float8 NULL,
                    approval_status price_markdown.strategy_approval_status_enum,
                    is_locked int2 NULL,
                    include_pcds _int4 NULL
                )
            ',
            p_strategy_id
        );
        execute _query;
	end;
$function$
;