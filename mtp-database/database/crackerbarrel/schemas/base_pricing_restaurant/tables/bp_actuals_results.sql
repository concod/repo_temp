--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_actuals_results_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_actuals_results_1

CREATE TABLE base_pricing_restaurant.bp_actuals_results (
	id bigserial NOT NULL,
	strategy_id int4 NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	product_id int4 NULL,
	store_id varchar(255) NULL,
	segment_id int4 NULL,
	sales_units float8 DEFAULT 0 NOT NULL,
	revenue float8 DEFAULT 0 NOT NULL,
	gross_margin_dollar float8 DEFAULT 0 NOT NULL,
	gross_margin_percentage float8 DEFAULT 0 NOT NULL,
	average_selling_price float8 DEFAULT 0 NOT NULL,
	average_unit_margin float8 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_actuals_results_pkey PRIMARY KEY (id),
	CONSTRAINT bp_actuals_results_unique_strategy_product_store_segment UNIQUE (strategy_id, product_id, store_id, segment_id),
	CONSTRAINT bp_actuals_results_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_actuals_results_created_at ON base_pricing_restaurant.bp_actuals_results USING btree (created_at);
CREATE INDEX idx_actuals_results_date_range ON base_pricing_restaurant.bp_actuals_results USING btree (strategy_id, start_date, end_date);
CREATE INDEX idx_actuals_results_product_id ON base_pricing_restaurant.bp_actuals_results USING btree (product_id);
CREATE INDEX idx_actuals_results_segment_id ON base_pricing_restaurant.bp_actuals_results USING btree (segment_id);
CREATE INDEX idx_actuals_results_store_id ON base_pricing_restaurant.bp_actuals_results USING btree (store_id);
CREATE INDEX idx_actuals_results_strategy_dates ON base_pricing_restaurant.bp_actuals_results USING btree (strategy_id, start_date, end_date, created_at);
CREATE INDEX idx_actuals_results_strategy_id ON base_pricing_restaurant.bp_actuals_results USING btree (strategy_id);
CREATE INDEX idx_actuals_results_strategy_product ON base_pricing_restaurant.bp_actuals_results USING btree (strategy_id, product_id);
CREATE INDEX idx_actuals_results_strategy_product_store_segment ON base_pricing_restaurant.bp_actuals_results USING btree (strategy_id, product_id, store_id, segment_id);