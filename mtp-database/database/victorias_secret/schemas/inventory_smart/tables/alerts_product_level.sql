--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:alerts_product_level_MTP-20674 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alerts_product_level definition

CREATE TABLE inventory_smart.alerts_product_level (
	article varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	dtc_year varchar NULL,
	pfs_year varchar NULL,
	dtc_season varchar NULL,
	pfs_season varchar NULL,
	brand varchar NULL,
	product_description varchar NULL,
	style_color_id varchar NOT NULL,
	dc_flag int4 NULL,
	excs_flg int4 NULL,
	shrtfl_flg int4 NULL,
	stckout_flg int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	lw_units float4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	lw_gm_perc float4 NULL,
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
	sales_5_ago float4 NULL,
	sales_6_ago float4 NULL,
	sales_7_ago float4 NULL,
	sales_8_ago float4 NULL,
	aur float4 NULL,
	excs_is_resolved int4 NULL,
	shrtfl_is_resolved int4 NULL,
	stckout_is_resolved int4 NULL,
	CONSTRAINT alerts_product_level_pk PRIMARY KEY (article)
);
--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_level_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN last_day_sales ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN lw_gm_perc ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN lw_margin ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN lw_revenue ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN lw_units ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN promo_percentage ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_1_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_2_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_3_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_4_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_5_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_6_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_7_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN sales_8_ago ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN size_integrity ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN week_to_date_sales ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN wos ; 
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN shrtfl_flg ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN shrtfl_is_resolved ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN stckout_flg ;
ALTER TABLE inventory_smart.alerts_product_level DROP COLUMN stckout_is_resolved ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN aur TO forecast_over_target_wos ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN dc_flag to new_choice_flag ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN excs_flg to upcoming_po ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN excs_is_resolved to wip ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN brand to color ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN dtc_season to flex_style ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN dtc_year to form ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN l1_name to generic ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN pfs_season to l5_name ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN pfs_year to l6_name ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN product_description to launch_floorset ;
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN style_color_id to sizes_mat ;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_1 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_2 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_3 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_4 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_5 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD user_defined_6 varchar;
ALTER TABLE inventory_smart.alerts_product_level  ADD floorset_end_date date;
ALTER TABLE inventory_smart.alerts_product_level  ADD floorset_start_date date;
ALTER TABLE inventory_smart.alerts_product_level  ADD launch_date date;
ALTER TABLE inventory_smart.alerts_product_level  ADD next_po_upcoming_date date;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_level_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.alerts_product_level  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level  ADD product_lifecycle varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level  ADD nc_is_resolved int4 DEFAULT 0 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_level_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-158
--comment: adding store_count based on Req
ALTER TABLE inventory_smart.alerts_product_level  ADD store_count int4 NULL;

--changeset anujkumar.singh@impactanalytics.co:alerts_product_level_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-158
--comment: adding product group
ALTER TABLE inventory_smart.alerts_product_level ADD if not exists product_group _varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_level_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-672
--comment: Adding Current Assortment Group 
ALTER TABLE inventory_smart.alerts_product_level  ADD COLUMN IF NOT EXISTS current_assortment_group  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level  ADD COLUMN IF NOT EXISTS current_floorset varchar NULL;

