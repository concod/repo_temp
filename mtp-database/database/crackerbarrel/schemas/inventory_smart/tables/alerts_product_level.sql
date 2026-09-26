--liquibase formatted sql
--changeset liquibase:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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
	wos_oh_oo_it float4 NULL,
	size_integrity float4 NULL,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	wos_oh float4 NULL,
	wos_oh_it float4 NULL,
	tot_inv float4 NULL,
	launch_date date NULL,
	primary_trait_desc varchar NULL,
	product_description varchar NULL,
	retirement_alert_flag varchar NULL,
	CONSTRAINT alerts_product_level_pk PRIMARY KEY (article)
);

--changeset kaustubh.gupta:cb_changes_alerts_flag stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_changes_alerts_flag
--comment: cb_changes_alerts_flag
ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN IF NOT EXISTS stockout_is_resolved INT;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN IF NOT EXISTS shortfall_is_resolved INT;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN IF NOT EXISTS overstock_is_resolved INT;
