-- liquibase formatted sql
-- changeset abhishek.singh@impactanalytics.co:bp_unlogged_competitor_positioning_heatmap stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
-- comment: changeset for base_pricing.bp_unlogged_competitor_positioning_heatmap


CREATE UNLOGGED TABLE base_pricing.bp_unlogged_competitor_positioning_heatmap (
	product_id int8 NULL,
	store_id int4 NULL,
	segment_id int4 NULL,
	segment_name varchar(100) NULL,
	price_zone varchar(50) NULL,
	effective_price_zone varchar NULL,
	attribute_3 numeric NULL,
	attribute_4 numeric NULL,
	competitor_price numeric NULL,
	competitor_name varchar(50) NULL,
	competitor_display_name varchar(100) NULL,
	price_difference_raw numeric NULL,
	price_difference numeric NULL,
	price_difference_percent_raw numeric NULL,
	price_difference_percent numeric NULL,
	price_category text NULL,
	price_bucket varchar NULL
);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_id1 ON base_pricing.bp_unlogged_competitor_positioning_heatmap USING btree (product_id, store_id, competitor_name);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_id2 ON base_pricing.bp_unlogged_competitor_positioning_heatmap USING btree (product_id, store_id);
