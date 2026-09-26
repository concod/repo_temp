-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_product_attribute_column_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_product_attribute_column

CREATE TABLE  size_smart.tb_product_attribute_column (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	is_selected bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	display_name text NULL,
	CONSTRAINT tb_product_attribute_column_name_key UNIQUE (name),
	CONSTRAINT tb_product_attribute_column_pkey PRIMARY KEY (id)
);