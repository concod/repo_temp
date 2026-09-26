--liquibase formatted sql
--changeset liquibase:pc_opt_drop_temp_tables_06012026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_drop_temp_tables

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_drop_temp_tables;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_drop_temp_tables(IN _strategy_id integer, IN _process_name text, IN _version text DEFAULT NULL::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
	IF _process_name = 'postprocess_end' THEN
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.store_cluster_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_recal_inv;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.product_store_filter_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.item_opt_mapping_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.simulation_data_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.opt_constraints_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.store_split_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.prev_weeks_promo_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.client_recommended_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_store_cluster_base_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_ssd_temp;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_new_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_opt_bin_mapping_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.product_store_filter_new_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.opt_constraints_new_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.prev_weeks_promo_new_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.client_recommended_new_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_discount_store_cluster_base_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_store_cluster_data_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_store_cluster_base_id_temp_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_ssd_ia_temp7_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_agg_ia_temp7_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_custom_rules_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_discounts_filter_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_discount_opt_cluster_base_id_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_stg_disc_local_temp_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_applicable_price_disc_sim_base_data_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_strategy_sku_store_mapping_local_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_strategy_sku_store_mapping_dominating_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_strategy_sku_store_mapping_global_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp1_%s_local;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp2_%s_local;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp1_%s_dominating;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp2_%s_dominating;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp1_%s_global;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_dia_temp2_%s_global;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.generic_cadence_id_%s;', _strategy_id);

	ELSIF _process_name = 'postprocess_start' THEN
        EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_id_%s;', _strategy_id);
	    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_id_temp_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_new_id_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_id_local_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_id_dominating_%s;', _strategy_id);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.gurobi_output_id_global_%s;', _strategy_id);

    ELSIF _process_name = 'actualization' THEN
        EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_temp_actuals_%s;', _strategy_id);
        EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_temp_item_actuals_%s;', _strategy_id);

	ELSIF _process_name = 'strategy_sync' then
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ss_temp1_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssp_temp2_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssd_temp3_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssdd_temp4_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_%s_%s_ssd_temp;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssdd_temp5_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssdd_temp6_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssd_prevpcd_temp7_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_ssd_temp8_%s_%s;', _strategy_id, _version);
		EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.syn_agg_temp8_%s_%s;', _strategy_id, _version);
    ELSE
        RAISE NOTICE 'No matching process found for %', _process_name;
    END IF;
END $procedure$
;

