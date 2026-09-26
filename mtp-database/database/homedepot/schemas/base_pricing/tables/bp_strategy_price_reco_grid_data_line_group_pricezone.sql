--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_price_reco_grid_data_line_group_pricezone_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone_v2


CREATE TABLE base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone (
	product_id int4 NULL,
	store_id int4 NULL,
	strategy_id int4 NOT NULL,
	channel_id int4 NULL,
	segment_id int4 NULL,
	product_ids text NULL,
	store_ids text NULL,
	store_names text NULL,
	product_names text NULL,
	segment_name text NULL,
	channel text NULL,
	zone_structure_name text NULL,
	price_zone_name text NULL,
	opt_level_bins int4 NULL,
	product_attributes jsonb NULL,
	product_store_attributes jsonb NULL,
	other_family_1 text NULL,
	other_family_2 text NULL,
	other_class_1 text NULL,
	other_class_2 text NULL,
	line_group text NULL,
	size_family text NULL,
	size_class text NULL,
	brand_family text NULL,
	brand_class text NULL,
	pre_price int2 DEFAULT 0 NULL,
	price_lock int2 DEFAULT 0 NULL,
	zone_exception int2 DEFAULT 0 NULL,
	"cost" float8 NULL,
	"size" float8 NULL,
	uom text NULL,
	derived_uom text NULL,
	derived_size float8 NULL,
	asp jsonb NULL,
	aum jsonb NULL,
	revenue jsonb NULL,
	base_price jsonb NULL,
	sales_unit jsonb NULL,
	gross_margin jsonb NULL,
	rules_exception jsonb NULL,
	price_difference jsonb NULL,
	base_price_per_unit jsonb NULL,
	revenue_with_promotion jsonb NULL,
	gross_margin_percentage jsonb NULL,
	gross_margin_with_promotion jsonb NULL,
	competitor_price_difference_dollar jsonb NULL,
	competitor_price_difference_percentage jsonb NULL,
	gross_margin_with_promotion_percentage jsonb NULL,
	price_change_reason text NULL,
	competitor_price float8 NULL,
	price_change jsonb NULL,
	price_changes text NULL,
	price_change_percentage jsonb NULL,
	revenue_change_percentage jsonb NULL,
	sales_units_change_percentage jsonb NULL,
	gross_margin_change_percentage jsonb NULL,
	promotion_applied float8 NULL,
	old_cost float8 NULL,
	cost_changes float8 NULL,
	new_margin float8 NULL,
	"source" text NULL,
	"comments" text NULL,
	CONSTRAINT unique_strategy_product_store_line_group_pricezone UNIQUE (strategy_id, line_group, price_zone_name,segment_id, channel_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bpspgd_lg_pricezone_brand_class ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (brand_class);
CREATE INDEX idx_bpspgd_lg_pricezone_brand_family ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (brand_family);
CREATE INDEX idx_bpspgd_lg_pricezone_cost ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (cost);
CREATE INDEX idx_bpspgd_lg_pricezone_current_price ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (base_price);
CREATE INDEX idx_bpspgd_lg_pricezone_finalized_price ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (revenue_with_promotion);
CREATE INDEX idx_bpspgd_lg_pricezone_ia_recommended ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (price_difference);
CREATE INDEX idx_bpspgd_lg_pricezone_line_group ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (line_group);
CREATE INDEX idx_bpspgd_lg_pricezone_other_class_1 ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (other_class_1);
CREATE INDEX idx_bpspgd_lg_pricezone_other_family_1 ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (other_family_1);
CREATE INDEX idx_bpspgd_lg_pricezone_price_change ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (price_change_reason);
CREATE INDEX idx_bpspgd_lg_pricezone_price_zone_name ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (price_zone_name);
CREATE INDEX idx_bpspgd_lg_pricezone_product_id ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (product_id);
CREATE INDEX idx_bpspgd_lg_pricezone_rules_exception ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING gin (rules_exception);
CREATE INDEX idx_bpspgd_lg_pricezone_size_class ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (size_class);
CREATE INDEX idx_bpspgd_lg_pricezone_size_family ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (size_family);
CREATE INDEX idx_bpspgd_lg_pricezone_store_id ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (store_id);
CREATE INDEX idx_bpspgd_lg_pricezone_strategy_id ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (strategy_id);
CREATE INDEX idx_bpspgd_lg_pricezone_uom ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (uom);
CREATE INDEX idx_bpspgd_lg_pricezone_zone_exception ON  base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone USING btree (zone_exception);

--changeset krithika.s@impactanalytics.co:bp_strategy_price_reco_grid_data_line_group_pricezone_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone_1

ALTER TABLE base_pricing.bp_strategy_price_reco_grid_data_line_group_pricezone 
ADD COLUMN IF NOT EXISTS competitor_details json NULL;