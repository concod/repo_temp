--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for asn_to_allocate_alert

CREATE TABLE inventory_smart.asn_to_allocate_alert (
	asn_id varchar NOT NULL,
	ph_code int4 NOT NULL,
	choice varchar NOT NULL,
	choice_description varchar NULL,
	brand varchar NULL,
	category varchar NULL,
	merchandise_category varchar NULL,
	subclass varchar NULL,
	"style" varchar NULL,
	flex_style varchar NULL,
	generic varchar NULL,
	sizes varchar NULL,
	form varchar NULL,
	user_defined_1 varchar NULL,
	user_defined_2 varchar NULL,
	user_defined_3 varchar NULL,
	user_defined_4 varchar NULL,
	user_defined_5 varchar NULL,
	user_defined_6 varchar NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	asn_qty float4 NULL,
	sizes_count int4 NULL,
	oh_dc int4 NULL,
	forecast_over_target_wos float4 NULL,
	floorset varchar NULL,
	floorset_start_date date NULL,
	floorset_end_date date NULL,
	instore_date date NULL,
	delivery_date date NULL,
	store_count_asn int4 NULL,
	store_count_choice int4 NULL,
	choice_type varchar NULL,
	CONSTRAINT asn_to_allocate_alert_un UNIQUE (asn_id, choice, ph_code),
	CONSTRAINT asn_to_allocate_alert_ph_code_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE CASCADE
);


--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Adding new column wip as per requirement
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD wip int4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-319
--comment: Renaming sizes column to sizes_mat
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN sizes to sizes_mat;


--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP CONSTRAINT asn_to_allocate_alert_un ;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP CONSTRAINT asn_to_allocate_alert_ph_code_fk ;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN ph_code ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN choice TO article ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN choice_description TO l6_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN brand TO l0_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN category TO l2_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN merchandise_category TO l3_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN subclass TO l4_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert RENAME COLUMN "style" TO l5_name ;
ALTER TABLE inventory_smart.asn_to_allocate_alert ADD CONSTRAINT asn_to_allocate_alert_un PRIMARY KEY (article,asn_id);


--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD product_lifecycle varchar NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD ata_is_resolved int4 DEFAULT 0 NULL;

--changeset anujkumar.singh@impactanalytics.co:asn_to_allocate_alert_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding product group
ALTER TABLE inventory_smart.asn_to_allocate_alert ADD if not exists product_group _varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:asn_to_allocate_alert_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-672
--comment: Adding Current Assortment Group 
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD COLUMN IF NOT EXISTS current_assortment_group  varchar NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert  ADD COLUMN IF NOT EXISTS current_floorset varchar NULL;

