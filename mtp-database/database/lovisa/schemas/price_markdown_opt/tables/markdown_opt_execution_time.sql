--liquibase formatted sql
--changeset liquibase:markdown_opt_execution_time stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for markdown_opt_execution_time

CREATE TABLE price_markdown_opt.markdown_opt_execution_time (
	id serial4 NOT NULL,
	user_id int4 NULL,
	strategy_id int4 NOT NULL,
	strategy_name varchar NOT NULL,
	preprocessing_flag int4 NULL DEFAULT 0,
	preprocessing_start_time timestamptz NULL,
	preprocessing_end_time timestamptz NULL,
	store_cluster_time int4 NULL,
	product_store_filter_time int4 NULL,
	simulation_time int4 NULL,
	constraints_time int4 NULL,
	rules_target_time int4 NULL,
	store_split_time int4 NULL,
	prev_pcd_time int4 NULL,
	pcd_dates_time int4 NULL,
	client_reco_offer_time int4 NULL,
	gurobi_time int4 NULL,
	postprocessing_flag int4 NULL DEFAULT 0,
	postprocessing_start_time timestamptz NULL,
	postprocessing_end_time timestamptz NULL,
	get_post_data_time int4 NULL,
	copy_to_bl_time int4 NULL,
	stg_disc_ia_time int4 NULL,
	get_ssd_temp_time int4 NULL,
	total_time int4 NULL,
	detailed json NULL,
	status bool NULL DEFAULT false,
	message varchar NULL DEFAULT 'Not Finished'::character varying,
	payload_input json NULL,
	payload_output json NULL
);