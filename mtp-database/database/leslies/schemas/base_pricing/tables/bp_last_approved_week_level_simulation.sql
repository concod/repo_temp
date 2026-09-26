--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_week_level_simulation_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_week_level_simulation_10


CREATE TABLE base_pricing.bp_last_approved_week_level_simulation (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	week_start_date date NOT NULL,
	price_point float8 NOT NULL,
	bnm_sales_units float8 NOT NULL,
	bnm_baseline_sales_units float8 NOT NULL,
	bnm_elasticity float8 NOT NULL,
	ecom_sales_units float8 NOT NULL,
	ecom_baseline_sales_units float8 NOT NULL,
	ecom_elasticity float8 NOT NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_week_level_simulation_pkey PRIMARY KEY (strategy_id, product_id, week_start_date),
	CONSTRAINT bp_last_approved_week_level_simulation_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_last_approved_week_approval_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_week_date_range ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_week_product_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, week_start_date);
CREATE INDEX idx_last_approved_week_strategy_date_product ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date, product_id);
CREATE INDEX idx_last_approved_week_strategy_id ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id);