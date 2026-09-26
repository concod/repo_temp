-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_source_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_source

CREATE TABLE  size_smart.tb_source (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	"label" varchar NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_source_id_key UNIQUE (id),
	CONSTRAINT tb_source_pkey PRIMARY KEY (label),
	CONSTRAINT uq_tb_source_label UNIQUE (label)
);