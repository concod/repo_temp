--liquibase formatted sql
--changeset kamaleshwaran.k:alerts_product_store_level_version stripComments:false splitStatements:false context:alerts_product_store_level_version
--comment: initial changeset for alerts_product_store_level_version
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level_version (
	version_code int4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	article varchar NULL,
	store_code varchar NULL,
	season varchar NULL,
	gender varchar NULL,
	style_description varchar NULL,
	collection varchar NULL,
	"class" varchar NULL,
	subclass varchar NULL,
	sty_primary_occsn_end_use_dsc varchar NULL,
	product_type varchar NULL,
	launch_date date NULL,
	clearance bool NULL,
	planned_clearance_date date NULL,
	overstock_flag int4 NULL,
	understock_flag int4 NULL,
	stockout_flag int4 NULL,
	depleting_flag int4 NULL,
	define_clearance_flag int4 NULL,
	first_markdown_flag int4 NULL,
	style_first_allocation_flag int4 NULL,
	os_is_resolved int4 NULL,
	us_is_resolved int4 NULL,
	sk_is_resolved int4 NULL,
	dp_is_resolved int4 NULL,
	dc_is_resolved int4 NULL,
	fm_is_resolved int4 NULL,
	sfa_is_resolved int4 NULL,
	overstock_net_dc_available_incoming float4 NULL,
	understock_net_dc_available_incoming float4 NULL,
	overstock_total_wos float4 NULL,
	understock_total_wos float4 NULL,
	overstock_style_life_cycle float4 NULL,
	understock_style_life_cycle float4 NULL,
	stockout_instock_per float4 NULL,
	stockout_ata float4 NULL,
	depleting_ata float4 NULL,
	define_clearance_strategy_ata float4 NULL,
	first_markdown_planned_clearance_ata float4 NULL,
	stockout_str_oh float4 NULL,
	depleting_dc_oh_wos float4 NULL,
	sfa_launch_date date NULL,
	sfa_allocation_date date NULL,
	sfa_ata float4 NULL,
	sfa_packs float4 NULL,
	sfa_eaches float4 NULL,
	store_name varchar NULL,
	store_grade varchar NULL,
	price float8 NULL,
	msrp float8 NULL,
	oh float8 NULL,
	it float8 NULL,
	oo float8 NULL,
	total_inv float8 NULL,
	lw_units float8 NULL,
	lw_margin float8 NULL,
	lw_revenue float8 NULL,
	l4w_units float8 NULL,
	l4w_revenue float8 NULL,
	l8w_units float8 NULL,
	discount float8 NULL,
	promo float8 NULL,
	wos_oh_oo_it float8 NULL,
	wos_oh_oo float8 NULL,
	wos_oh float8 NULL,
	dc_wos_oh_oo_it float8 NULL,
	dc_wos_oh_oo float8 NULL,
	dc_wos_oh float8 NULL,
	stockout float8 NULL,
	shortfall float8 NULL,
	excess float8 NULL,
	normal float8 NULL,
	sell_through_perc float8 NULL,
	ata_eaches float8 NULL,
	ata_packs float8 NULL,
	ata float8 NULL,
	dc_instock float8 NULL,
	in_stock float8 NULL,
	in_stock_ata float8 NULL,
	allocated_units float8 NULL,
	dc_oo float8 NULL,
	CONSTRAINT alerts_product_store_level_version_u_key UNIQUE (version_code),
	CONSTRAINT alerts_product_store_level_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset swapnil.bhange:alerts_product_store_level_version_v2 stripComments:false splitStatements:false context:alerts_product_store_level_version
--comment: lovisa changes for alerts_product_store_level_version_v2
-- Add new columns
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS product_code varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS first_weekly_predicted_qty FLOAT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS second_weekly_predicted_qty FLOAT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS third_weekly_predicted_qty FLOAT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS fourth_weekly_predicted_qty FLOAT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS next_4_weeks_predicted_qty FLOAT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS max_stock INT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS is_resolved INT4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS forecast_over_max INT4 NULL;

-- Drop columns that are not in the new schema
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS l5_name;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS article;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS season;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS gender;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS style_description;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS collection;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS "class";
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS subclass;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sty_primary_occsn_end_use_dsc;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS product_type;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS launch_date;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS clearance;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS overstock_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS understock_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS stockout_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS depleting_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS define_clearance_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS first_markdown_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS style_first_allocation_flag;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS os_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS us_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sk_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dp_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS fm_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_is_resolved;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS overstock_net_dc_available_incoming;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS understock_net_dc_available_incoming;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS overstock_total_wos;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS understock_total_wos;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS overstock_style_life_cycle;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS understock_style_life_cycle;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS stockout_instock_per;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS stockout_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS depleting_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS define_clearance_strategy_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS first_markdown_planned_clearance_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS stockout_str_oh;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS depleting_dc_oh_wos;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_launch_date;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_allocation_date;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_packs;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sfa_eaches;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS store_name;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS price;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS msrp;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS oh;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS it;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS oo;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS total_inv;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS lw_units;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS lw_margin;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS lw_revenue;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS l4w_units;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS l4w_revenue;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS l8w_units;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS discount;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS promo;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS wos_oh_oo_it;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS wos_oh_oo;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS wos_oh;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_wos_oh_oo_it;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_wos_oh_oo;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_wos_oh;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS stockout;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS shortfall;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS excess;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS normal;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS sell_through_perc;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS ata_eaches;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS ata_packs;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_instock;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS in_stock;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS in_stock_ata;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS allocated_units;
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP COLUMN IF EXISTS dc_oo;


-- First, drop the existing unique constraint
ALTER TABLE inventory_smart.alerts_product_store_level_version DROP CONSTRAINT alerts_product_store_level_version_u_key;

-- Recreate the unique constraint with the new column name
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD CONSTRAINT alerts_product_store_level_version_u_key UNIQUE (version_code, product_code, store_code);

--changeset swapnil.bhange:alerts_product_store_level_version_v3 stripComments:false splitStatements:false context:alerts_product_store_level_version
--comment: lovisa changes for alerts_product_store_level_version_v3
-- Add new columns
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS article varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS launch_date date NULL;

--changeset swapnil.bhange:alerts_product_store_level_version_v4 stripComments:false splitStatements:false context:alerts_product_store_level_version
--comment: lovisa changes for alerts_product_store_level_version_v4
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD COLUMN IF NOT EXISTS min_stock INT4;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS style_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS store_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS range_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS store_type varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS lw_qty float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS oh int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS it int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS oo int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level_version ADD IF NOT EXISTS tot_inv int4 NULL;
