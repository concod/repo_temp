-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_style_mapping_config stripComments:false splitStatements:false context:tb_style_mapping_config labels:tb_style_mapping_config 
-- comment: added tb_style_mapping_config table



CREATE TABLE size_smart.tb_style_mapping_config (
	cloumn_name varchar(255) NOT NULL,
	column_values varchar(255) NOT NULL,
	id serial4 NOT NULL,
	CONSTRAINT tb_style_mapping_config_pkey PRIMARY KEY (id)
);