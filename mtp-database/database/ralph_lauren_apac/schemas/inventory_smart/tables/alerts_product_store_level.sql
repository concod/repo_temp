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

--changeset vivek.subramanya@impactanalytics.co:alerts_product_store_level_RLIS_82 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for alerts_product_store_level : added excess,shortfall,stockout,normal columns and changed unique constraint.

ALTER TABLE inventory_smart.alerts_product_store_level ADD excess int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD shortfall int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD stockout int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD normal int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT if exists alerts_product_store_level_pk;
ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT if exists alerts_product_store_level_un;
ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_un UNIQUE (article,store_code,l0_name,l1_name,l2_name,l3_name,l4_name,product_group,store_group);

--changeset vivek.subramanya@impactanalytics.co:alerts_product_store_level_change_group_columns_to_varchar[] stripComments:false splitStatements:false context:MTP-18913 labels:RLIS-178
--comment: change product_group and store_group from varchar to varchar[], add unique constraint

ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN store_group TYPE _varchar USING store_group::_varchar;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN product_group TYPE _varchar USING product_group::_varchar;
ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT if exists alerts_product_store_level_pk;
ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT if exists alerts_product_store_level_un;
ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_un UNIQUE (article,store_code);

--changeset linu.nazil@impactanalytics.co:alerts_product_store_level_change_last_allocated_and_number_of_allocations stripComments:false splitStatements:false context:MTP-26581 labels:color coding
--comment: added last_allocated and Number_of_allocations columns

ALTER TABLE inventory_smart.alerts_product_store_level ADD last_allocated date NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD number_of_allocations int4 NULL;

--changeset dushant.raut@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: added foe_year and season columns

ALTER TABLE inventory_smart.alerts_product_store_level ADD foe_year varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD season varchar NULL;

--changeset dushant.raut@impactanalytics.co:alerts_product_store_level_added_eight_cols stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: added clearance_alert_flag,markdown_alert_flag,floorset_alert_flag,newly_launched_alert_flag,clearance_is_resolved,markdown_is_resolved,floorset_is_resolved,newly_launched_is_resolved columns
ALTER TABLE inventory_smart.alerts_product_store_level ADD clearance_alert_flag varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD markdown_alert_flag varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD floorset_alert_flag varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD newly_launched_alert_flag varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD clearance_is_resolved varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD markdown_is_resolved varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD floorset_is_resolved varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD newly_launched_is_resolved varchar NULL;

--changeset dushant.raut@impactanalytics.co:alerts_product_store_level_eight_cols_datatype_changed stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-33853
--comment: datatype changed for clearance_alert_flag,markdown_alert_flag,floorset_alert_flag,newly_launched_alert_flag,clearance_is_resolved,markdown_is_resolved,floorset_is_resolved,newly_launched_is_resolved columns

ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN clearance_alert_flag TYPE int4 USING clearance_alert_flag::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN markdown_alert_flag TYPE int4 USING markdown_alert_flag::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN floorset_alert_flag TYPE int4 USING floorset_alert_flag::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN newly_launched_alert_flag TYPE int4 USING newly_launched_alert_flag::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN clearance_is_resolved TYPE int4 USING clearance_is_resolved::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN markdown_is_resolved TYPE int4 USING markdown_is_resolved::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN floorset_is_resolved TYPE int4 USING floorset_is_resolved::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN newly_launched_is_resolved TYPE int4 USING newly_launched_is_resolved::int4;

--changeset dushant.raut@impactanalytics.co:alerts_product_store_level_added_vendor_case_pack_coln stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-37135
--comment: added vendor_case_pack column
ALTER TABLE inventory_smart.alerts_product_store_level ADD vendor_case_pack varchar NULL;

--changeset saad.adeeb@impactanalytics.co:alerts_product_store_level_added_model_desc stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-39663
--comment: added model_desc column
ALTER TABLE inventory_smart.alerts_product_store_level ADD model_description varchar NULL;
--changeset jugal.mehra@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-50161
--comment: added floorset,markdown,clearance,newlylaunched column,dc_instock_pct,dc_instock_pct_details RLIS-868 MTP-50161 MTP-57695

ALTER TABLE inventory_smart.alerts_product_store_level ADD clearance int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD markdown int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD floorset int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD newlylaunched int4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD dc_instock_pct float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD dc_instock_pct_details float4 NULL;

--changeset ishaan.singh@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-5016
--comment: added rtl_coordinate_group_desc
ALTER TABLE inventory_smart.alerts_product_store_level ADD rtl_coordinate_group_desc varchar NULL;

--changeset pooja.shekar@impactanalytics.co:adding rtl_zone_id column stripComments:false splitStatements:false context:Release_1_2 labels:MTP-69186
--comment: Adding rtl_zone_id column
ALTER TABLE inventory_smart.alerts_product_store_level ADD rtl_zone_id varchar NULL;


--changeset sidhartha.c@impactanalytics.co:alerts_product_store_level_dropped_climate_coln stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac_1 labels:MTP-37135
--comment: dropped vendor_case_pack column
ALTER TABLE inventory_smart.alerts_product_store_level 
DROP COLUMN climate,
DROP COLUMN foe_year;

--changeset sidhartha.c@impactanalytics.co:alerts_product_store_level_added_column stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac_2 labels:MTP-37135
--comment: added forecasting_channel and retail_region
ALTER TABLE inventory_smart.alerts_product_store_level 
ADD forecasting_channel varchar NULL,
ADD retail_region varchar NULL;


--changeset sidhartha.c@impactanalytics.co:alerts_product_store_level_added_column_ stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart_apac_3 labels:MTP-37135
--comment: added year
ALTER TABLE inventory_smart.alerts_product_store_level 
ADD year varchar NULL;
