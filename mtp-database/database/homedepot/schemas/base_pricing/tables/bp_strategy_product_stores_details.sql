--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_strategy_product_stores_details_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_product_stores_details_v3

CREATE TABLE base_pricing.bp_strategy_product_stores_details (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NULL,
	opt_level_bins varchar NOT NULL,
	price float8 NULL,
	"size" float8 NULL,
	price_zone_name varchar NULL,
	brand_family varchar NULL,
	brand_class varchar NULL,
	size_family varchar NULL,
	size_class varchar NULL,
	line_group varchar NULL,
	channel varchar NULL,
	channel_id int4 NULL,
	other_family_1 varchar NULL,
	other_class_1 varchar NULL,
	other_family_2 varchar NULL,
	other_class_2 varchar NULL,
	"cost" float8 NULL,
	pre_price float8 NULL,
	price_lock int4 NULL,
	include_all int4 NULL,
	product_name varchar NULL,
	store_name varchar NULL,
	segment_name varchar NULL,
	zone_structure_id int4 NULL,
	strategy_id int4 NOT NULL,
	strategy_name varchar NULL,
	start_date date NULL,
	end_date date NULL,
	l2_cid int4 NULL,
	l4_cid int4 NULL,
	derived_size float8 NULL,
	zone_structure_name varchar NULL,
	uom text NULL,
	derived_uom text NULL,
	price_zone_id int4 NULL,
	product_attributes jsonb NULL,
	product_store_attributes jsonb NULL,
	zone_exception int4 NULL,
	weekly_sales int4 DEFAULT 1 NULL,
	competitor_prices json NULL,
	old_cost float8 NULL,
	cost_changes float8 NULL,
	new_margin float8 NULL,
	effective_price_zone text NULL,
	manual_edited_prices float8 NULL,
	"cluster" text NULL,
	CONSTRAINT unique_strategy_opt_bins UNIQUE (strategy_id, opt_level_bins)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_product_stores_details_opt_level_bins ON base_pricing.bp_strategy_product_stores_details USING btree (opt_level_bins);
CREATE INDEX idx_bp_strategy_product_stores_details_product_id ON base_pricing.bp_strategy_product_stores_details USING btree (product_id);
CREATE INDEX idx_bp_strategy_product_stores_details_segment_id ON base_pricing.bp_strategy_product_stores_details USING btree (segment_id);
CREATE INDEX idx_bp_strategy_product_stores_details_store_id ON base_pricing.bp_strategy_product_stores_details USING btree (store_id);
CREATE INDEX idx_bp_strategy_product_stores_details_strategy_id ON base_pricing.bp_strategy_product_stores_details USING btree (strategy_id);


--changeset krithika.s@impactanalytics.co:bp_strategy_product_stores_details_7 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_product_stores_details_7

ALTER TABLE base_pricing.bp_strategy_product_stores_details
ADD COLUMN bucket_competitor_prices json NULL,
ADD COLUMN bucket_competitor_modes json NULL,
ADD COLUMN bucket_competitor_names json NULL;