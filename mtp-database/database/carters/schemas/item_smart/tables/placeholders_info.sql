--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:placeholders_info_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for placeholders_info

CREATE TABLE IF NOT EXISTS item_smart.placeholders_info (
	"style" varchar(10) NOT NULL,
	style_description varchar(20) NULL,
	hierarchy_code numeric NULL,
	l0_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	"attributes" jsonb NULL,
	entry_date date NULL,
	clr_start_date date NULL,
    exit_date date NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	purchase_status_type varchar NULL,
	mapped_product_code varchar NULL,
	mapped_product_code_description varchar NULL,
	replenishment_flag bool DEFAULT true NULL,
	product_status varchar DEFAULT 'Regular'::character varying NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	collection text NULL,
	CONSTRAINT placeholders_info_pkey PRIMARY KEY (style)
);

--changeset sonika.baheti@impactanalytics.co:placeholders_info_2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add columns
ALTER TABLE item_smart.placeholders_info ADD product_type VARCHAR NULL;


--changeset shreyansh.pathak@impactanalytics.co:placeholders_info_v3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.placeholders_info ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:placeholders_info_v4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for column created_by

ALTER TABLE item_smart.placeholders_info ALTER COLUMN created_by TYPE int8 USING created_by::int8;



--changeset kalyan.chandu@impactanalytics.co:placeholders_info_seq_carters stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_seq
--comment: added_placeholders_info_seq
CREATE SEQUENCE if not exists item_smart.placeholder_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;


--changeset kalyan.chandu@impactanalytics.co:placeholders_info_product_code stripComments:false splitStatements:false context:Release_1_0 labels:placeholders_info_product_code
--comment:  add columns
ALTER TABLE item_smart.placeholders_info ADD product_code VARCHAR NULL;



--changeset kalyan.chandu@impactanalytics.co:placeholders_info_hcode_seq_carters stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_hcode_seq_carters
--comment: added_placeholders_info_hcode_seq_carters
CREATE SEQUENCE IF NOT EXISTS item_smart.placeholder_hcode_seq
	INCREMENT BY 1
	MINVALUE 10000001
	MAXVALUE 20000000
	START 10000001
	CACHE 1
	NO CYCLE;

--changeset shreyansh.pathak@impactanalytics.co:l1_name stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.placeholders_info
ADD COLUMN IF NOT EXISTS l1_name TEXT ;

--changeset hithesh.s@impactanalytics.co:placeholders_info_new_01 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: adding default value
ALTER TABLE item_smart.placeholders_info ALTER COLUMN is_cadence_generated SET DEFAULT false;
ALTER TABLE item_smart.placeholders_info ALTER COLUMN is_mapped SET DEFAULT false;