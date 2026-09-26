--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_ps_filter_overall_kvi stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_ps_filter_overall_kvi

CREATE UNLOGGED TABLE base_pricing.bp_ps_filter_overall_kvi (
	product_id int8 NULL,
	store_id int4 NULL,
	segment_id int4 NULL,
	segment_cost numeric NULL,
	segment_price numeric NULL
);

CREATE INDEX idx_bp_ps_filter_overall_kvi_idx1 ON base_pricing.bp_ps_filter_overall_kvi USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_ps_filter_overall_kvi_idx2 ON base_pricing.bp_ps_filter_overall_kvi USING btree (product_id);
CREATE INDEX idx_bp_ps_filter_overall_kvi_idx3 ON base_pricing.bp_ps_filter_overall_kvi USING btree (segment_id);