-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context: db_sync labels:alerts_product_level
-- comment: initial changeset for alerts_product_level
CREATE TABLE inventory_smart.alerts_product_level (
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
	overstock_str_oh float4 NULL,
	depleting_dc_oh_wos float4 NULL,
	sfa_launch_date date NULL,
	sfa_allocation_date date NULL,
	sfa_ata float4 NULL,
	sfa_packs float4 NULL,
	sfa_eaches float4 NULL,
	CONSTRAINT alerts_product_level_article_key UNIQUE (article)
);
--changeset shrinidhi.choragi@impactanalytics.co:alerts_product_store stripComments:false splitStatements:false context: style column addition labels:schema 
--comment: style column addition
ALTER TABLE inventory_smart.alerts_product_level ADD if not exists style varchar NULL;

--changeset shameel.zeshan@impactanalytics.co:alerts_product_store stripComments:false splitStatements:false context: rename column from overstock_str_oh TO stockout_str_oh labels:schema 
--comment: rename column from overstock_str_oh TO stockout_str_oh
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN overstock_str_oh TO stockout_str_oh; 

-- changeset kanishka.parashar@impactanalytics.co:alerts_product_level_allocation_date stripComments:false splitStatements:false context:db_sync labels:delete column 
-- comment: deleting column allocation_date
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sfa_allocation_date

--changeset shameel.zeshan@impactanalytics.co:alerts_product_store_v1 stripComments:false splitStatements:false context: style column addition labels:added product_group 
--comment: added product_group
;ALTER TABLE inventory_smart.alerts_product_level ADD if not exists product_group _varchar NULL;

--changeset shameel.zeshan@impactanalytics.co:alerts_product_store_v2 stripComments:false splitStatements:false context: clearance_flag column addition labels:added clearance_flag 
--comment: added clearance_flag
ALTER TABLE inventory_smart.alerts_product_level ADD if not exists clearance_flag varchar NULL;