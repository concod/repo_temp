--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_alerts_product_level
--comment: initial changeset for alerts_product_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level (
	article text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	channel text NULL,
	excs_flg int4 NULL,
	shrtfl_flg int4 NULL,
	stckout_flg int4 NULL,
	excess int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	normal int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	lw_units float4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	wos float4 NULL,
	size_integrity float4 NULL,
	week_to_date_sales float4 NULL,
	last_day_sales float4 NULL,
	oh_dc float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	aur float4 NULL,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	number_of_allocations int4 NULL,
	wos_oh float4 NULL,
	wos_oh_it float4 NULL,
	tot_inv float4 NULL,
	sales_org_name text NULL,
	CONSTRAINT alerts_product_level_pk PRIMARY KEY (article)
);


--changeset samarjit.mazumder@impactanalytics.co:column_add_alerts_product_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:column_add_briscoes_alerts_product_level
--comment: column_rename_column_addition_alerts_product_level
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN excs_flg TO excess_flag;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN shrtfl_flg TO shortfall_flag;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN stckout_flg TO stockout_flag;

ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN style_name text NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN stockout_is_resolved int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN shortfall_is_resolved int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN overstock_is_resolved int4 NULL;

--changeset samarjit.mazumder@impactanalytics.co:rename_col_alerts_product_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:rename_col_briscoes_alerts_product_level
--comment: rename_col_alerts_product_level
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN stockout_is_resolved TO sk_is_resolved;

--changeset navin.chandan@impactanalytics.co:added_column_launch_date stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_alerts_product_level
--comment: Column added Launch Date
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS launch_date date NULL;

--changeset samarjit.mazumder@impactanalytics.co:added_column_newly_launched_is_resolved stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_newly_launched_is_resolved
--comment: Column added Launch Date
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS newly_launched_is_resolved int4 NULL;

--changeset navin.chandan@impactanalytics.co:added_column_clearance_is_resolved stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_newly_launched_is_resolved
--comment: Column added clearance_is_resolved
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS clearance_is_resolved int4 DEFAULT 0;