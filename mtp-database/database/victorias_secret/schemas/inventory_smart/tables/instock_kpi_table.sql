--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: initial changeset for instock_kpi_table

CREATE TABLE inventory_smart.instock_kpi_table (
	oh_flag int4 NULL,
	"date" date NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	pfs_season varchar NULL,
	pfs_year varchar NULL,
	dtc_season varchar NULL,
	dtc_year varchar NULL,
	brand varchar NULL,
	channel varchar NULL,
	state varchar NULL,
	district varchar NULL,
	climate varchar NULL,
	country varchar NULL,
	city varchar NULL,
	region varchar NULL
);

--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table_columns_added_1 stripComments:false splitStatements:false context:MTP-18913 labels:MTP-18913
--comment: add identifier columns

ALTER TABLE inventory_smart.instock_kpi_table ADD s1_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s2_id varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s3_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD s4_name varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD store_group varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD product_group varchar NULL;

--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-310
--comment: Schema Modified as per Victorias Secret requirement
ALTER TABLE inventory_smart.instock_kpi_table RENAME COLUMN oh_flag TO store_flag;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN "date";
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN l0_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN l1_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN l2_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN l3_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN l4_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN pfs_season;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN pfs_year;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN dtc_season;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN dtc_year;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN brand;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN channel;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN "state";
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN district;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN country;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN region;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN climate;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN city;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN s1_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN s2_id;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN s3_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN s4_name;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN store_group;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN product_group;
ALTER TABLE inventory_smart.instock_kpi_table ADD size_integrity_oh float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD size_integrity_oh_oo_it float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD ph_code int4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD choice varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD store_code varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD oh int4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD oo int4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD it int4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD last_week_sales float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD last_4_week_sales float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD last_8_week_sales float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD wos_oh float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD wos_oh_it float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD wos_oh_it_oo float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD accuracy_bucket varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_pk PRIMARY KEY (choice,store_code,ph_code);
ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_ph_code_fk FOREIGN KEY (ph_code)  REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_store_code_fk FOREIGN KEY (store_code)  REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX instock_kpi_table_ph_code_idx ON inventory_smart.instock_kpi_table USING btree (ph_code);



--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Added new column based on Req
ALTER TABLE inventory_smart.instock_kpi_table ADD wip int4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table ADD store_tier varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.instock_kpi_table DROP CONSTRAINT instock_kpi_table_pk ;
ALTER TABLE inventory_smart.instock_kpi_table DROP CONSTRAINT instock_kpi_table_ph_code_fk ;
ALTER TABLE inventory_smart.instock_kpi_table DROP COLUMN ph_code ;
ALTER TABLE inventory_smart.instock_kpi_table RENAME COLUMN choice TO article ;
ALTER TABLE inventory_smart.instock_kpi_table ADD store_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD location_hierarchy_region_code int4 NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD s1_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD s3_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD s4_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l0_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l2_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l3_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l4_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l5_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD l6_name varchar NULL ;
ALTER TABLE inventory_smart.instock_kpi_table ADD CONSTRAINT instock_kpi_table_pk PRIMARY KEY (article,store_code);


--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.instock_kpi_table  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD product_lifecycle varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding channel based on req
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS channel varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-215
--comment: adding dc level metrics in KPIs
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS oh_dc float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS oo_dc float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS it_dc float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS dc_size_integrity_oh float4 NULL;
ALTER TABLE inventory_smart.instock_kpi_table  ADD COLUMN IF NOT EXISTS dc_size_integrity_oh_oo_it float4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:instock_kpi_table_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Typecasted the region column 
ALTER TABLE inventory_smart.instock_kpi_table ALTER COLUMN location_hierarchy_region_code TYPE text USING location_hierarchy_region_code::text;

