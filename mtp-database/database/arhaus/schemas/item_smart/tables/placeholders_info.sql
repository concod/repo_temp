--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:placeholders_info stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for placeholders_info

CREATE TABLE item_smart.placeholders_info (
	placeholder_id varchar(10) NOT NULL,
	placeholder_name varchar(20) NULL,
	placeholder_type varchar NULL,
	hierarchy_code int4 NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	"attributes" jsonb NULL,
	entry_date date NULL,
	exit_date date NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	mapped_product_code varchar NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL,
	CONSTRAINT placeholders_info_pkey PRIMARY KEY (placeholder_id)
);


--changeset kalyan.chandu@impactanalytics.co:placeholders_info_seq stripComments:false splitStatements:false context:Release_1_1 labels:placeholders_info_seq
--comment: added_placeholders_info_seq
CREATE SEQUENCE if not exists item_smart.placeholder_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--changeset kalyan.chandu@impactanalytics.co:added column for l4_name stripComments:false splitStatements:false context:Release_1_1 labels:added column for l4_name
--comment: added column for l4_name
ALTER TABLE item_smart.placeholders_info ADD COLUMN l4_name VARCHAR NULL;

--changeset kalyan.chandu@impactanalytics.co:added_column_for_collection_name stripComments:false splitStatements:false context:Release_1_1 labels:added column for collection_name
--comment: added column for collection_name
ALTER TABLE item_smart.placeholders_info ADD COLUMN collection_name VARCHAR NULL;

--changeset kalyan.chandu@impactanalytics.co:modified_column_names stripComments:false splitStatements:false context:Release_1_1 labels:modified_column_names
--comment: modified_column_names
ALTER TABLE item_smart.placeholders_info RENAME COLUMN placeholder_id TO product_code;

ALTER TABLE item_smart.placeholders_info RENAME COLUMN placeholder_name TO product_name;

ALTER TABLE item_smart.placeholders_info RENAME COLUMN placeholder_type TO product_type;

--changeset kalyan.chandu@impactanalytics.co:added_purchase_type_column stripComments:false splitStatements:false context:Release_1_1 labels:added_purchase_type_column
--comment: added_purchase_type_column
ALTER TABLE item_smart.placeholders_info ADD COLUMN purchase_status_type VARCHAR NULL;

--changeset kalyan.chandu@impactanalytics.co:added_mapped_product_code_description stripComments:false splitStatements:false context:Release_1_1 labels:added_mapped_product_code_description_column
--comment: added_mapped_product_code_description_column
ALTER TABLE item_smart.placeholders_info ADD COLUMN mapped_product_code_description VARCHAR NULL;

--changeset kalyan.chandu@impactanalytics.co:added_is_special_order_column stripComments:false splitStatements:false context:Release_1_1 labels:added_is_special_order_column
--comment: added_is_special_order_column
ALTER TABLE item_smart.placeholders_info ADD COLUMN IF NOT EXISTS is_special_order BOOL DEFAULT FALSE;

--changeset kalyan.chandu@impactanalytics.co:changed_varchar_limit stripComments:false splitStatements:false context:Release_1_1 labels:changed_varchar_limit
--comment: changed_varchar_limit
ALTER TABLE item_smart.placeholders_info ALTER COLUMN product_code TYPE varchar(150);
ALTER TABLE item_smart.placeholders_info ALTER COLUMN product_name TYPE varchar(150);