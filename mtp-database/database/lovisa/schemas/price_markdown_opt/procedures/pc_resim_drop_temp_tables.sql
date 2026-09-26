--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_resim_drop_temp_tables_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_resim_drop_temp_tables

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_resim_drop_temp_tables;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_resim_drop_temp_tables(IN _strategy_id integer, IN _temp_table_ssd_blo text, IN _temp_table_agg_blo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_1;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_2;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_3;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_4;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_5;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_resim_temp%s_6;', _strategy_id);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_local;', _temp_table_ssd_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_local;', _temp_table_agg_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_dominating;', _temp_table_ssd_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_dominating;', _temp_table_agg_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_global;', _temp_table_ssd_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.%s_global;', _temp_table_agg_blo);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_stg_disc_local_temp_%s;', _strategy_id);
END $procedure$
;
