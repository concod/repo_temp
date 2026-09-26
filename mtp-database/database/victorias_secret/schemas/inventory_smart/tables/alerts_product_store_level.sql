--liquibase formatted sql
--changeset sahana.tadury@impactanalytics.co:alerts_product_store_level_MTP-20674 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.alerts_product_store_level definition

CREATE TABLE inventory_smart.alerts_product_store_level (
	article text NOT NULL,
	store_code text NOT NULL,
	group_division text NOT NULL,
	division text NOT NULL,
	department text NOT NULL,
	sub_department text NOT NULL,
	"class" text NOT NULL,
	dtc_year text NULL,
	pfs_year text NULL,
	dtc_season text NULL,
	pfs_season text NULL,
	brand text NULL,
	country text NULL,
	district text NULL,
	region text NULL,
	climate text NULL,
	state text NULL,
	city text NULL,
	channel text NULL,
	product_description text NULL,
	style_color_id text NOT NULL,
	dc_flg int4 NULL,
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
	CONSTRAINT alerts_product_store_level_pk PRIMARY KEY (article, store_code)
);

-- inventory_smart.alerts_product_store_level foreign keys

ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_fk FOREIGN KEY (store_code) REFERENCES "global".store_attributes_filter(store_code);

-- inventory_smart.alerts_product_store_level renaming columns

ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN group_division TO l0_name;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN division TO l1_name;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN department TO l2_name;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sub_department TO l3_name;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN "class" TO l4_name;

--changeset jagadeesh.pondara@impactanalytics.co:alerts_product_store_level_MTP-20674_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for alerts_product_store_level : renaming columns

ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN dc_flg TO dc_flag;

--changeset vivek.subramanya@impactanalytics.co:alerts_product_store_level_MTP-20674_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for alerts_product_store_level : dc_flag type change, adding new filter columns.

ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN dc_flag TYPE boolean USING dc_flag::boolean;
ALTER TABLE inventory_smart.alerts_product_store_level ADD s1_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD s2_id varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD s3_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD s4_name varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD store_group varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD product_group varchar NULL;

--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_store_level_test_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.alerts_product_store_level DROP COLUMN store_group ;
ALTER TABLE inventory_smart.alerts_product_store_level DROP COLUMN dc_flag ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN last_day_sales to excess ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN lw_margin to forward_wos ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN lw_units to it_dc ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_1_ago to l4w_avg_sales ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_2_ago to lw_sales ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_3_ago to min ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_4_ago to normal ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_5_ago to oo_dc ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_6_ago to shortfall ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_7_ago to size_integrity_oh ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN sales_8_ago to size_integrity_oh_oo_it ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN size_integrity to stockout ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN wos to target_wos ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN excs_flg to below_mins_flag ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN excs_is_resolved to below_mins_ind ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN shrtfl_flg to location_hierarchy_region_code ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN shrtfl_is_resolved to sizes_count ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN stckout_flg to stockout_and_shortfall_flag ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN stckout_is_resolved to total_inv ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN brand to user_defined_5 ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN channel to color ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN city to flex_style ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN climate to form ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN country to generic ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN district to user_defined_6 ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN dtc_season to l5_name ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN dtc_year to l6_name ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN l1_name to sizes_mat ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN pfs_year to store_name ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN product_description to store_tier ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN region to user_defined_1 ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN "state" to user_defined_2  ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN pfs_season to user_defined_3 ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN style_color_id to user_defined_4 ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN product_group to allocate_replen_tag ; 
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN s2_id to inventory_status ;
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN week_to_date_sales to week_to_day_sales ;
ALTER TABLE inventory_smart.alerts_product_store_level ADD wip float4;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_store_level_test_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN sizes_mat DROP NOT NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN user_defined_4 DROP NOT NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_store_level_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.alerts_product_store_level  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level  ADD product_lifecycle varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level   ADD sosf_is_resolved int4 DEFAULT 0 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level   ADD cbm_is_resolved int4 DEFAULT 0 NULL;

--changeset anujkumar.singh@impactanalytics.co:alerts_product_store_level_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding channel
ALTER TABLE inventory_smart.alerts_product_store_level  ADD channel  varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_store_level_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Typecasted the region column 
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN location_hierarchy_region_code TYPE text USING location_hierarchy_region_code::text;

--changeset anujkumar.singh@impactanalytics.co:alerts_product_store_level_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding product group
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists product_group _varchar NULL;

--changeset kamuju.mahaveer@impactanalytics.co:alerts_product_store_level_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-672
--comment: Adding Current Assortment Group 
ALTER TABLE inventory_smart.alerts_product_store_level  ADD COLUMN IF NOT EXISTS current_assortment_group  varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level  ADD COLUMN IF NOT EXISTS current_floorset varchar NULL;

