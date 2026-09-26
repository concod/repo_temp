--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_baseline_sales_overall stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_baseline_sales_overall

CREATE UNLOGGED TABLE base_pricing.bp_baseline_sales_overall (
	product_id int4 NULL,
	channel_id int4 NULL,
	segment_id int4 NULL,
	week_start_date date NULL,
	segment_price numeric NULL,
	segment_cost numeric NULL,
	segment_baseline_sales float8 NULL
);

CREATE INDEX idx_bp_baseline_sales_overall_idx1 ON base_pricing.bp_baseline_sales_overall USING btree (product_id, channel_id, week_start_date);
CREATE INDEX idx_bp_baseline_sales_overall_idx2 ON base_pricing.bp_baseline_sales_overall USING btree (product_id, segment_id);
CREATE INDEX idx_bp_baseline_sales_overall_idx3 ON base_pricing.bp_baseline_sales_overall USING btree (product_id, segment_id, week_start_date);