-- liquibase formatted sql
-- changeset abhishek.singh@impactanalytics.co:bp_unlogged_competitor_positioning_summary_cards stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
-- comment: changeset for base_pricing.bp_unlogged_competitor_positioning_summary_cards


CREATE UNLOGGED TABLE base_pricing.bp_unlogged_competitor_positioning_summary_cards (
	product_id int8 NULL,
	store_id int4 NULL,
	attribute_3 numeric NULL,
	attribute_4 numeric NULL,
	competitor_name varchar(50) NULL,
	competitor_display_name varchar(100) NULL,
	competitor_price numeric NULL,
	sales_units numeric NULL
);
CREATE INDEX idx_bp_unlogged_competitor_positioning_summary_cards_id1 ON base_pricing.bp_unlogged_competitor_positioning_summary_cards USING btree (product_id, store_id);
