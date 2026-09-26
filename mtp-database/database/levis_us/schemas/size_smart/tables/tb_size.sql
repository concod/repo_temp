-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_size_01

CREATE TABLE size_smart.tb_size (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_size_id_key UNIQUE (id),
	CONSTRAINT unique_name UNIQUE (name)
);