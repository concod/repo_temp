--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: pc_auto_clearance_all_procedures_in_sequence runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_auto_clearance_all_procedures_in_sequence

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_auto_clearance_all_procedures_in_sequence();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_auto_clearance_all_procedures_in_sequence()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _trigger_config_ids integer[];
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    elapsed_time INTERVAL;
   _trigger_config_id integer;
BEGIN
    select array_agg(distinct trigger_id)
    from price_markdown.tb_clearance_trigger_info_master
    where not is_deleted 
    and is_trigger_configured into _trigger_config_ids;

    -- Call the first procedure to get each strategy configs start and end date
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_auto_clearance_strategy_start_end_date(_trigger_config_ids);
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_auto_clearance_strategy_start_end_date: %', elapsed_time;

   for _trigger_config_id in (SELECT unnest(_trigger_config_ids))
  loop
    call price_markdown_opt.pc_auto_clearance_get_eligible_sku_store(_trigger_config_id);
  end loop;
 
    -- Call the second procedure to find already existing products in other strategies
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_auto_clearance_already_existing_stg_products(); -- can use as is
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_auto_clearance_already_existing_stg_products: %', elapsed_time;

  
    -- Call the third procedure and to get final list of products
    start_time := clock_timestamp();
    CALL price_markdown_opt.pc_auto_clearance_final_eligible_products_stores(); 
    end_time := clock_timestamp();
    elapsed_time := end_time - start_time;
    RAISE NOTICE 'Execution time for pc_auto_clearance_final_eligible_products_stores: %', elapsed_time;

END;
$procedure$
;