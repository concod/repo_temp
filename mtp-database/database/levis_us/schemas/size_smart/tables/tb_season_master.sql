-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_season_master_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: initial changeset for tb_season_master

CREATE TABLE  size_smart.tb_season_master (
	id serial4 NOT NULL,
	season_name varchar(255) NOT NULL,
	start_date varchar(255) NOT NULL,
	end_date varchar(255) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	season_code int4 NULL,
	CONSTRAINT tb_season_master_name_key UNIQUE (season_name),
	CONSTRAINT tb_season_name_pkey PRIMARY KEY (id)
);