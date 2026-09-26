-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_product_hierarchy_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_product_hierarchy

CREATE TABLE  size_smart.tb_product_hierarchy (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	display_name varchar NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	"values" jsonb NULL,
	product_master_mapping varchar NULL,
	CONSTRAINT tb_product_hierarchy_id_key UNIQUE (id),
	CONSTRAINT tb_product_hierarchy_pkey PRIMARY KEY (name)
);
