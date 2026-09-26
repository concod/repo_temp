--liquibase formatted sql
--changeset liquibase:product_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master
CREATE TABLE source_smart.product_master (
	product_code varchar(255) NOT NULL,
	product_name varchar(255) NULL,
	article varchar(255) NULL,
	l0_name varchar(255) NULL,
	brand varchar(255) NULL,
	l4_name varchar(255) NULL,
	color varchar(255) NULL,
	l2_name varchar(255) NULL,
	l3_name varchar(255) NULL,
	l1_name varchar(255) NULL,
	l0_id varchar(255) NULL,
	l1_id varchar(255) NULL,
	l2_id varchar(255) NULL,
	l3_id varchar(255) NULL,
	l4_id varchar(255) NULL,
	"style" varchar(255) NULL,
	"size" varchar(255) NULL,
	upc varchar(255) NULL,
	sku varchar(255) NULL,
	active bool NULL,
	launch_date date NULL,
	clearance_start_date date NULL,
	product_channel varchar(255) NULL,
	construction_type_id varchar(255) NULL,
	product_description text NULL,
	style_color_id varchar(255) NULL,
	CONSTRAINT product_master_new_pkey PRIMARY KEY (product_code),
	CONSTRAINT product_master_unique UNIQUE (style_color_id),
	CONSTRAINT product_master_construction_type_master_fk FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE ON UPDATE CASCADE
);
--changeset genuine.basil@impactanalytics.co:product_master stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_update
--comment:add new columns to product_master
ALTER TABLE source_smart.product_master ADD COLUMN sourcing_class_id varchar(50) NULL;
ALTER TABLE source_smart.product_master ADD COLUMN product_developed_facility_id varchar(255) NULL;
--changeset genuine.basil@impactanalytics.co:product_master_smv stripComments:false splitStatements:false context:Release_3_0 labels:liquibase_project_update
--comment:add smv to product_master
ALTER TABLE source_smart.product_master ADD COLUMN smv int4 NULL;
