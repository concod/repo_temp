--liquibase formatted sql
--changeset liquibase:pc_resim_drop_temp_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_resim_drop_temp_tables

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_resim_drop_temp_tables;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_resim_drop_temp_tables(IN _strategy_id integer, IN _temp_table_ssd_blo text, IN _temp_table_agg_blo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_1;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_2;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_3;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_4;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_5;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_resim_temp_6;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s;', _temp_table_ssd_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s;', _temp_table_agg_blo);
END $procedure$
;
