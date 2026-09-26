--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_master stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_master

CREATE TABLE base_pricing.bp_strategy_master (
	strategy_id serial4 NOT NULL,
	strategy_name varchar(255) NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	strategy_status_id int2 DEFAULT 0 NOT NULL,
	current_stage_id int2 DEFAULT 0 NOT NULL,
	sync_status_id int2 NULL,
	product_selection_id int4 NULL,
	product_hierarchy_level varchar(255) NULL,
	product_count int2 DEFAULT 0 NOT NULL,
	store_selection_id int4 NULL,
	store_hierarchy_level varchar(255) NULL,
	store_count int2 DEFAULT 0 NOT NULL,
	segment_count int2 DEFAULT 0 NOT NULL,
	rules_count int2 DEFAULT 0 NOT NULL,
	rules_exception_ids jsonb NULL,
	rules_exception_count int8 DEFAULT 0 NOT NULL,
	price_changes int8 DEFAULT 0 NULL,
	price_increased int8 DEFAULT 0 NULL,
	price_decreased int8 DEFAULT 0 NULL,
	total_number_forecast_records int4 DEFAULT 0 NOT NULL,
	total_no_of_product_store_records int4 DEFAULT 0 NOT NULL,
	product_hierarchy jsonb NULL,
	store_hierarchy jsonb NULL,
	model_type varchar(255) NULL,
	initial_model_type varchar(255) NULL,
	is_simulated bool DEFAULT false NOT NULL,
	is_approved bool DEFAULT false NOT NULL,
	is_refresh bool DEFAULT false NULL,
	is_clone bool DEFAULT false NULL,
	is_download_allowed int2 DEFAULT 0 NULL,
	is_active bool DEFAULT true NOT NULL,
	finalized_sales_units int8 NULL,
	ia_rec_sales_units int8 NULL,
	sales_units_target int4 NULL,
	sales_units_priority int4 NULL,
	finalized_revenue numeric(15, 2) NULL,
	ia_rec_revenue numeric(15, 2) NULL,
	revenue_target int4 NULL,
	revenue_priority int4 NULL,
	finalized_gm_dollar numeric(15, 2) NULL,
	ia_rec_gm_dollar numeric(15, 2) NULL,
	gm_dollar_target int4 NULL,
	gm_dollar_priority int4 NULL,
	finalized_gm_percent int4 NULL,
	ia_rec_gm_percent int4 NULL,
	gm_percent_target int4 NULL,
	gm_percent_priority int4 NULL,
	finalized_asp int8 NULL,
	ia_rec_asp int8 NULL,
	asp_target int4 NULL,
	asp_priority int4 NULL,
	finalized_aum int8 NULL,
	ia_rec_aum int8 NULL,
	aum_target int4 NULL,
	aum_priority int4 NULL,
	source_clone_id int4 NULL,
	skip_notification bool DEFAULT false NULL,
	threshold_amount numeric(10, 2) DEFAULT 0.0 NULL,
	gross_margin_type varchar(200) NULL,
	last_snapshot_created_at timestamp NULL,
	snapshot_approval_count int2 DEFAULT 0 NOT NULL,
	has_approved_forecast_snapshot bool DEFAULT false NOT NULL,
	last_approved_forecast_updated_at timestamp NULL,
	last_approved_forecast_updated_by int4 NULL,
	approval_history jsonb NULL,
	approved_by int4 NULL,
	approved_on timestamp NULL,
	unapproved_by int4 NULL,
	unapproval_date timestamp NULL,
	refresh_on timestamp NULL,
	refresh_by int4 NULL,
	description text NULL,
	created_by int4 NOT NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NOT NULL,
	updated_at timestamp NOT NULL,
	total_price_points int4 NULL,
	maximization_parameter varchar(200) NULL,
	is_multi_channel_strategy bool DEFAULT false NULL,
	channel varchar(50) NULL,
	current_revenue numeric(15, 2) NULL,
	current_gm_dollar numeric(15, 2) NULL,
	current_gm_percent numeric(10, 2) NULL,
	current_asp numeric(10, 2) NULL,
	current_aum numeric(10, 2) NULL,
	current_sales_units numeric(10, 2) NULL,
	segment_hierarchy jsonb NULL,
	is_product_store_mapping bool DEFAULT false NULL,
	product_store_segment_mappings jsonb NULL,
	CONSTRAINT bp_strategy_master_id_name_unique UNIQUE (strategy_id, strategy_name),
	CONSTRAINT bp_strategy_master_pkey PRIMARY KEY (strategy_id),
	CONSTRAINT valid_date_range CHECK ((start_date < end_date)),
	CONSTRAINT bp_strategy_master_current_stage_fk FOREIGN KEY (current_stage_id) REFERENCES base_pricing.bp_strategy_current_stage_level(current_stage_id) ON DELETE CASCADE,
	CONSTRAINT bp_strategy_master_status_fk FOREIGN KEY (strategy_status_id) REFERENCES base_pricing.bp_strategy_status_level(strategy_status_id) ON DELETE CASCADE,
	CONSTRAINT bp_strategy_master_sync_status_id_fkey FOREIGN KEY (sync_status_id) REFERENCES base_pricing.bp_sync_status(sync_status_id)
);

CREATE INDEX idx_strategy_master_active_approved ON base_pricing.bp_strategy_master USING btree (strategy_id, approved_on) WHERE ((is_approved = true) AND (is_active = true));
CREATE INDEX idx_strategy_master_approval_tracking ON base_pricing.bp_strategy_master USING btree (strategy_id, is_approved, last_snapshot_created_at);
CREATE INDEX idx_strategy_master_approved_on ON base_pricing.bp_strategy_master USING btree (approved_on, is_approved);
CREATE INDEX idx_strategy_master_has_snapshot ON base_pricing.bp_strategy_master USING btree (has_approved_forecast_snapshot, is_approved);



--changeset yashraj.jha@impactanalytics.co:bp_strategy_master_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_master_2
ALTER TABLE base_pricing.bp_strategy_master
ADD COLUMN explain_report_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;


--changeset yashraj.jha@impactanalytics.co:bp_strategy_master_5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_master_5
ALTER TABLE base_pricing.bp_strategy_master
ADD COLUMN actuals_sales_units FLOAT8 NULL,
ADD COLUMN actuals_revenue FLOAT8 NULL,
ADD COLUMN actuals_gm_dollar FLOAT8 NULL,
ADD COLUMN actuals_gm_percent FLOAT8 NULL,
ADD COLUMN actuals_asp FLOAT8 NULL,
ADD COLUMN actuals_aum FLOAT8 NULL;

--changeset vishnuvardhan@impactanalytics.co:bp_strategy_master_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_master_3

ALTER TABLE base_pricing.bp_strategy_master
    ADD COLUMN monthly_forecast_status base_pricing.monthly_forecast_status_enum NOT NULL DEFAULT 'READY_TO_FORECAST';