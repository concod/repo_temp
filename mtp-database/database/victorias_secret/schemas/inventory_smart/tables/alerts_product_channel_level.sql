--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: initial changeset for alerts_product_channel_level

CREATE TABLE inventory_smart.alerts_product_channel_level (
	article varchar NOT NULL,
	channel varchar NULL,
	dc_oh float4 NULL,
	next_4_weeks_forecast float4 NULL,
	past_4_weeks_actual float4 NULL,
	past_4_weeks_forecast float4 NULL,
	absolute_error float4 NULL,
	ly_deviation float4 NULL,
	accuracy float4 NULL,
	ly_next_4_weeks_actual float4 NULL,
	mfp_deviation float4 NULL,
	recent_deviation float4 NULL,
	next_4_weeks_store_count int4 NULL,
	allocate_replen_flag int4 NULL,
	past_4_weeks_store_count int4 NULL,
	recent_deviation_flag int4 NULL,
	mfp_deviation_flag int4 NULL,
	l6_name varchar NULL,
	color varchar NULL,
	l0_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	flex_style varchar NULL,
	generic varchar NULL,
	sizes_mat varchar NULL,
	form varchar NULL,
	user_defined_1 varchar NULL,
	user_defined_2 varchar NULL,
	user_defined_3 varchar NULL,
	user_defined_4 varchar NULL,
	user_defined_5 varchar NULL,
	user_defined_6 varchar NULL,
	allocate_replen_tag varchar NULL,
	ly_past_4_weeks_actual float4 NULL,
	next_4_weeks_mfp_forecast float4 NULL,
	next_4_weeks_planned_promo float4 NULL,
	past_4_weeks_actual_promo float4 NULL,
	past_4_weeks_planned_promo float4 NULL,
	promo_deviation float4 NULL,
	recently_launched_choice_flag int4 NULL,
	store_count_deviation float4 NULL,
	total_inv int4 NULL,
	CONSTRAINT alerts_product_channel_level_un UNIQUE (article, channel)
);


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-119
--comment: adding is_resolved column based on product team required
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD is_resolved int4 DEFAULT 0 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-120
--comment: adding is_resolved column based on product team required
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD ar_is_resolved int4 DEFAULT 0 NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD mfpd_is_resolved int4 DEFAULT 0 NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD rd_is_resolved int4 DEFAULT 0 NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level RENAME COLUMN is_resolved to rlc_is_resolved;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD product_lifecycle varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: Updated and renamed dc_oh to oh_dc
ALTER TABLE inventory_smart.alerts_product_channel_level RENAME COLUMN dc_oh to oh_dc;

--changeset anujkumar.singh@impactanalytics.co:alerts_product_channel_level_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: Adding Product Group
ALTER TABLE inventory_smart.alerts_product_channel_level ADD if not exists product_group _varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_channel_level_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-672
--comment: Adding Current Assortment Group 
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD COLUMN IF NOT EXISTS current_assortment_group  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_channel_level  ADD COLUMN IF NOT EXISTS current_floorset varchar NULL;

