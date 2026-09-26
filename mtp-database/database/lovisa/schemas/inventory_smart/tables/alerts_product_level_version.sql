--liquibase formatted sql
--changeset kamaleshwaran.k:alerts_product_level_version stripComments:false splitStatements:false context:alerts_product_level_version
--comment: initial changeset for alerts_product_level_version
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level_version (
	version_code int4 NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	article varchar NOT NULL,
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
	overstock_planned_clearance_date date NULL,
	understock_planned_clearance_date date NULL,
	define_clearance_strategy_planned_clearance_date date NULL,
	first_markdown_planned_clearance_date date NULL,
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
	sfa_ata float4 NULL,
	sfa_packs float4 NULL,
	sfa_eaches float4 NULL,
	"style" varchar NULL,
	product_group _varchar NULL,
	clearance_flag varchar NULL,
	CONSTRAINT alerts_product_level_version_u_key UNIQUE (version_code, article),
	CONSTRAINT alerts_product_level_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset swapnil.bhange:alerts_product_level_version_v2 stripComments:false splitStatements:false context:alerts_product_level_version
--comment: changes for lovisa in alerts_product_level_version

-- First, drop the existing unique constraint
ALTER TABLE inventory_smart.alerts_product_level_version DROP CONSTRAINT alerts_product_level_version_u_key;

-- Rename article to product_code
ALTER TABLE inventory_smart.alerts_product_level_version RENAME COLUMN article TO product_code;

-- Add new columns
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN channel varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN excs_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN shrtfl_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN stckout_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN excess int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN shortfall int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN stockout int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN normal int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN oh float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN it float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN oo float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN lw_units int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN lw_revenue float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN lw_margin float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN promo_percentage float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN dos float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN size_integrity int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN week_to_date_sales int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN last_day_sales int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN oh_dc float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN sales_1_ago int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN sales_2_ago int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN sales_3_ago int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN sales_4_ago int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN aur int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN clearance_alert_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN newly_launched_alert_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN number_of_allocations int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN dos_oh float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN wos_oh_it int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN tot_inv float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN recent_deviation_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN repeat_deviation_flg int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN new_deviation_flg int4 NULL;

-- Recreate the unique constraint with the new column name
ALTER TABLE inventory_smart.alerts_product_level_version ADD CONSTRAINT alerts_product_level_version_u_key UNIQUE (version_code, product_code);

-- Drop columns that are no longer needed
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS l5_name;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS style_description;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS collection;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS class;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS subclass;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sty_primary_occsn_end_use_dsc;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS product_type;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS clearance;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS depleting_flag;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS define_clearance_flag;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS first_markdown_flag;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS style_first_allocation_flag;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS os_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS us_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sk_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS dp_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS dc_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS fm_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sfa_is_resolved;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS overstock_net_dc_available_incoming;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS understock_net_dc_available_incoming;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS overstock_planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS understock_planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS define_clearance_strategy_planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS first_markdown_planned_clearance_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS overstock_total_wos;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS understock_total_wos;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS overstock_style_life_cycle;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS understock_style_life_cycle;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS stockout_instock_per;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS stockout_ata;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS depleting_ata;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS define_clearance_strategy_ata;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS first_markdown_planned_clearance_ata;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS stockout_str_oh;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS depleting_dc_oh_wos;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sfa_launch_date;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sfa_ata;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sfa_pack;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS sfa_eaches;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS style;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS product_group;
ALTER TABLE inventory_smart.alerts_product_level_version DROP COLUMN IF EXISTS clearance_flag;

--changeset swapnil.bhange:alerts_product_level_version_v3 stripComments:false splitStatements:false context:alerts_product_level_version
--comment: changes for lovisa in alerts_product_level_version_v3
ALTER TABLE inventory_smart.alerts_product_level_version ADD COLUMN IF NOT EXISTS article varchar NULL;

--changeset swapnil.bhange:alerts_product_level_version_v4 stripComments:false splitStatements:false context:alerts_product_level_version
--comment: changes for lovisa in alerts_product_level_version_v4
ALTER TABLE inventory_smart.alerts_product_level_version RENAME COLUMN wos_oh_it TO dos_oh_it;
ALTER TABLE inventory_smart.alerts_product_level_version RENAME COLUMN lw_units TO lw_qty;
ALTER TABLE inventory_smart.alerts_product_level_version ADD style_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level_version ADD range_name varchar NULL;



