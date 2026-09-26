--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_backsync_promo_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_backsync_promo_master

DROP TABLE IF EXISTS price_promo_opt.tb_backsync_promo_master;

CREATE TABLE price_promo_opt.tb_backsync_promo_master (
	promo_id serial4 NOT NULL,
	promo_code varchar(100) NULL,
	event_id int4 NULL,
	"name" text NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	step_count int2 NULL,
	status int2 DEFAULT 0 NOT NULL,
	status_name text DEFAULT 'Draft/Copied'::text NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	products_count int4 DEFAULT 0 NULL,
	stores_count int4 DEFAULT 0 NULL,
	style_id_count int4 NULL,
	product_selection_type int2 NULL,
	store_selection_type int2 NULL,
	exclusion_selection_type int2 NULL,
	customer_type int2 NULL,
	offer_distribution_channel int2 NULL,
	ad_type int2 DEFAULT 1 NULL,
	is_hero_promo int2 DEFAULT 0 NOT NULL,
	is_lock_promo int2 DEFAULT 0 NOT NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT (now() AT TIME ZONE 'UTC'::text) NOT NULL,
	updated_at timestamptz NULL,
	marketing_channel varchar(100) DEFAULT '0'::character varying NULL,
	copied_from int4 NULL,
	future_sku_selection varchar(20) NULL,
	last_approved_scenario_id int4 NULL,
	offer_comment text NULL,
	upload_used int2 DEFAULT 0 NULL,
	sap_promo_level int2 DEFAULT 5 NULL,
	is_auto_resimulated int2 DEFAULT 0 NULL,
	is_under_processing int2 DEFAULT 0 NULL,
	is_overridden_scenario int2 DEFAULT 0 NULL,
	recommendation_type_id int2 NULL,
	copied_at timestamptz NULL,
	last_exmd_synced_time timestamptz NULL,
	is_overridden_scenario_finalized bool DEFAULT false NULL,
	has_stacked_offers bool NULL,
	is_simulation_disabled bool DEFAULT false NULL,
	last_simulation_time timestamp NULL,
	last_optimized_time timestamp NULL,
	total_inventory int4 NULL,
	currency_id int4 DEFAULT 1 NULL,
	to_be_simulated bool DEFAULT false NULL,
	to_be_optimised bool DEFAULT false NULL,
	is_vendor_created_promo bool DEFAULT false NULL,
	vendor_portal_status int2 DEFAULT 0 NOT NULL,
	vendor_created_by int4 NULL,
	finalized_promo_id_by_merchant int4 NULL,
	parent_vendor_promo_id int4 NULL,
	review_status int4 NULL,
	review_status_updated_at timestamptz NULL,
	vendor_portal_status_updated_at timestamptz NULL,
	last_backsync_at timestamptz NOT NULL
);

--changeset harshith.mandli@impactanalytics.co:alter_backsync_promo_master stripComments:false splitStatements:false context:Release_1_0 labels: alter_backsync_promo_master
--comment: ALTER statements to backsync promo master table

ALTER TABLE price_promo_opt.tb_backsync_promo_master
ADD COLUMN IF NOT EXISTS is_synced_to_vendor_portal bool DEFAULT false NULL,
ADD COLUMN IF NOT EXISTS kvi_tagged_products_count int4 DEFAULT 0 NULL,
ADD COLUMN IF NOT EXISTS execution_metadata jsonb NULL,
ADD COLUMN IF NOT EXISTS customers_count int4 DEFAULT 0 NULL,
ADD COLUMN IF NOT EXISTS customer_selection_type int2 NULL;

ALTER TABLE price_promo_opt.tb_backsync_promo_master
DROP COLUMN IF EXISTS has_stacked_offers;

ALTER TABLE price_promo_opt.tb_backsync_promo_master
DROP COLUMN IF EXISTS is_overridden_scenario_finalized;