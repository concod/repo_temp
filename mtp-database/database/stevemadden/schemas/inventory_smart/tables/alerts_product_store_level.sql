--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:alerts_product_store_level
--comment: initial changeset for alerts_product_store_level

CREATE TABLE if NOT exists  inventory_smart.alerts_product_store_level (
	article text NOT NULL,
	store_code text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	climate text NULL,
	state text NULL,
	city text NULL,
	s1_name varchar NULL,
	s3_name varchar NULL,
	product_group _varchar NOT NULL,
	store_group _varchar NOT NULL,
	channel text NULL,
	product_description text NULL,
	dc_flag bool NULL,
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
	excs_is_resolved int4 NULL,
	shrtfl_is_resolved int4 NULL,
	stckout_is_resolved int4 NULL,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	clearance_is_resolved int4 NULL,
	newly_launched_is_resolved int4 NULL,
	vendor_case_pack varchar NULL,
	CONSTRAINT alerts_product_store_level_pk PRIMARY KEY (article, store_code, store_group, product_group),
	CONSTRAINT alerts_product_store_level_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset sriraj.varanasi@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:MTP-55964 labels:MTP-55964
--comment: add number_of_allocations column

ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS number_of_allocations int4 NULL;

--changeset sriraj.varanasi@impactanalytics.co:alerts_product_store_level_added_columns stripComments:false splitStatements:false context:MTP-55964 labels:added_3_new_columns
--comment: added columns wos_oh, wos_oh_it, tot_inv

ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS wos_oh float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS wos_oh_it float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS tot_inv float4 NULL;



--changeset sriraj.varanasi@impactanalytics.co:added_column_special_classification stripComments:false splitStatements:false context:MTP-55964 labels:added_1_new_column
--comment: added column special_classification

ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS special_classification varchar NULL;

--changeset samarjit.mazumder@impactanalytics.co:added_column_s2_name stripComments:false splitStatements:false context:MTP-55964 labels:added_s2_name_column
--comment: added column s2_name
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS s2_name varchar NULL;

--changeset sriraj.varanasi@impactanalytics.co:added_column_style_name stripComments:false splitStatements:false context:MTP-55964 labels:added_style_name_column
--comment: added column style_name
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS style_name varchar NULL;