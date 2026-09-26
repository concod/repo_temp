-- liquibase formatted sql
-- changeset abhishek.singh@impactanalytics.co:bp_unlogged_competitor_positioning_heatmap_details stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
-- comment: changeset for base_pricing.bp_unlogged_competitor_positioning_heatmap_details



CREATE UNLOGGED TABLE base_pricing.bp_unlogged_competitor_positioning_heatmap_details (
	product_id int8 NULL,
	store_id int4 NULL,
	segment_id int4 NULL,
	segment_name varchar(100) NULL,
	price_zone varchar(50) NULL,
	effective_price_zone varchar NULL,
	attribute_3 numeric NULL,
	attribute_4 numeric NULL,
	competitor_name varchar(50) NULL,
	competitor_display_name varchar(100) NULL,
	competitor_price numeric NULL,
	price_difference_percent numeric NULL,
	price_difference numeric NULL,
	price_bucket varchar NULL,
	channel varchar(100) NULL,
	product_name varchar(255) NULL,
	strategy_id int4 NULL,
	historical_price numeric NULL,
	sales_units numeric NULL,
	date_range daterange NULL,
	strategy_name varchar(255) NULL,
	line_group_computed text NULL,
	price_zone_computed text NULL,
	strategy_status varchar(255) NULL
);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id1 ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (product_id, store_id);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id2 ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (competitor_display_name);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id3 ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (price_bucket);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id4 ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (price_zone_computed, line_group_computed);
