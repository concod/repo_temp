--liquibase formatted sql
--changeset sivaprasath.vadivel:geo_mapping_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for geo_mapping

CREATE TABLE monday_smart.geo_mapping (
	geo text NOT NULL,
	store_code_name text NOT NULL,
	s0_id_name text NULL,
	s1_id_name text NULL,
	s2_id_name text NULL,
	s3_id_name text NULL,
	CONSTRAINT geo_mapping_pk PRIMARY KEY (geo, store_code_name)
);