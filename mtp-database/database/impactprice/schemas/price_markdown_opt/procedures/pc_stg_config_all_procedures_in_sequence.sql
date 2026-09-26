--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_config_all_procedures_in_sequence_v091024 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_all_procedures_in_sequence

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_all_procedures_in_sequence();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_all_procedures_in_sequence()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    elapsed_time INTERVAL;
BEGIN
    -- Call the first procedure to get each stg configs product and store
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_stg_config_all_config_products_stores();
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_stg_config_all_config_products_stores: %', elapsed_time;

    -- Call the second procedure to get each strategy configs start and end date
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_stg_config_strategy_start_end_date();
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_stg_config_strategy_start_end_date: %', elapsed_time;


    -- Call the third procedure to find eligible clearance products
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_stg_config_eligible_products_stores();
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_stg_config_eligible_products_stores: %', elapsed_time;

    -- Call the third procedure to find already existing products in other strategies
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_stg_config_already_existing_stg_products();
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_stg_config_already_existing_stg_products: %', elapsed_time;


    -- Call the fifth procedure and to get final list of products
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_stg_config_final_eligible_products_stores();
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_stg_config_final_eligible_products_stores: %', elapsed_time;

END;
$procedure$
;
