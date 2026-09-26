
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:placeholders_info1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for placeholders_info

-- Drop table

-- DROP TABLE item_smart.placeholders_info;

CREATE TABLE IF NOT EXISTS item_smart.placeholders_info (
	product_code varchar NOT NULL,
	product_name varchar NULL,
	product_type varchar NULL,
	hierarchy_code int4 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	"attributes" jsonb NULL,
	entry_date date NULL,
	exit_date date NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	mapped_product_code varchar NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	mapped_product_code_description varchar NULL,
	product_lifecycle varchar NULL,
	article varchar NOT NULL,
	item_description varchar NULL,
	product_description varchar NULL,
	CONSTRAINT placeholders_info_pkey PRIMARY KEY (article)
);

--changeset shrey.jaiswal@impactanalytics.co:placeholders_info_seq stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_seq
--comment: added_placeholders_info_seq
CREATE SEQUENCE if not exists item_smart.placeholder_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--changeset hemant.kumar@impactanalytics.co:vendor_name stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_seq
--comment: added_vendor_name
ALTER TABLE item_smart.placeholders_info ADD COLUMN vendor_name VARCHAR NULL;

--changeset shrey.jaiswal@impactanalytics.co:info_lifecycle_description stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_seq
--comment: added_info_lifecyle_description
ALTER TABLE item_smart.placeholders_info ADD COLUMN info_lifecycle_description VARCHAR NULL;

--changeset ayush.rajput@impactanalytics.co:placeholders_info_adding_collection_column stripComments:false splitStatements:false context:Release_1_0 labels:placeholders_info_adding_collection_column
--comment: placeholders_info_adding_default_value
ALTER TABLE item_smart.placeholders_info ALTER COLUMN is_mapped SET DEFAULT false;
ALTER TABLE item_smart.placeholders_info ALTER COLUMN is_cadence_generated SET DEFAULT false;