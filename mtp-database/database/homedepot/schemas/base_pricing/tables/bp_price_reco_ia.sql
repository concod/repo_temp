--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_reco_ia_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_reco_ia_v2



CREATE TABLE base_pricing.bp_price_reco_ia (
	id bigserial NOT NULL,
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NULL,
	channel_id int4 NULL,
	product_name varchar(255) NOT NULL,
	store_name varchar(255) NOT NULL,
	segment_name varchar(255) NOT NULL,
	strategy_name varchar NULL,
	opt_level_bins varchar(255) NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	line_group varchar(100) NULL,
	size_family varchar(100) NULL,
	size_class varchar(100) NULL,
	brand_family varchar(100) NULL,
	brand_class varchar(100) NULL,
	channel varchar(100) NULL,
	zone_structure_id int4 NULL,
	zone_structure_name varchar(255) NULL,
	effective_price_zone text NULL,
	price_zone_id int4 NULL,
	price_zone_name varchar(255) NULL,
	uom varchar(50) NULL,
	"size" float8 NULL,
	"cost" float8 NULL,
	other_family_1 varchar NULL,
	other_family_2 varchar NULL,
	other_class_1 varchar NULL,
	other_class_2 varchar NULL,
	pre_price int2 DEFAULT 0 NULL,
	price_lock int2 DEFAULT 0 NULL,
	zone_exception int2 DEFAULT 0 NULL,
	derived_uom varchar(50) NULL,
	derived_size float8 NULL,
	price float8 NULL,
	base_price float8 NULL,
	price_difference float8 NULL,
	sales_units float8 NULL,
	revenue float8 NULL,
	gross_margin_dollar float8 NULL,
	gross_margin_percentage float8 NULL,
	asp float8 NULL,
	aum float8 NULL,
	promotion_applied float8 NULL,
	revenue_with_promotion float8 NULL,
	gross_margin_with_promotions_dollar float8 NULL,
	gross_margin_with_promotions_percentage float8 NULL,
	competitor_price float8 NULL,
	competitor_price_difference_dollar float8 NULL,
	competitor_price_difference_percentage float8 NULL,
	base_price_per_unit float8 NULL,
	price_change_reason text NULL,
	rules_exception_product jsonb NULL,
	rules_exception_store jsonb NULL,
	rules_exception jsonb NULL,
	rules_followed int4 NULL,
	old_cost float8 NULL,
	cost_changes float8 NULL,
	new_margin float8 NULL,
	"source" varchar(50) NULL,
	connection_id int4 NULL,
	product_attributes jsonb NULL,
	product_store_attributes jsonb NULL,
	CONSTRAINT bp_price_reco_ia_pkey PRIMARY KEY (id, strategy_id),
	CONSTRAINT uq_bp_price_reco_ia_unique UNIQUE (strategy_id, product_id, store_id, segment_id,channel_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_price_reco_ia_product_store ON  base_pricing.bp_price_reco_ia USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_price_reco_ia_product_store_strategy ON  base_pricing.bp_price_reco_ia USING btree (strategy_id, product_id, store_id, segment_id);
CREATE INDEX idx_bp_price_reco_ia_strategy ON  base_pricing.bp_price_reco_ia USING btree (strategy_id);

--changeset krithika.s@impactanalytics.co:bp_price_reco_ia_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_reco_ia_1

ALTER TABLE base_pricing.bp_price_reco_ia
ALTER COLUMN competitor_price TYPE json USING to_json(competitor_price);

ALTER TABLE base_pricing.bp_price_reco_ia
ALTER COLUMN competitor_price_difference_dollar TYPE json USING to_json(competitor_price_difference_dollar);

ALTER TABLE base_pricing.bp_price_reco_ia
ALTER COLUMN competitor_price_difference_percentage TYPE json USING to_json(competitor_price_difference_percentage);

ALTER TABLE base_pricing.bp_price_reco_ia
ADD COLUMN IF NOT EXISTS competitor_mode json NULL;

ALTER TABLE base_pricing.bp_price_reco_ia
ADD COLUMN IF NOT EXISTS competitor_comparison json NULL;

ALTER TABLE base_pricing.bp_price_reco_ia
ADD COLUMN IF NOT EXISTS competitor_name json NULL;