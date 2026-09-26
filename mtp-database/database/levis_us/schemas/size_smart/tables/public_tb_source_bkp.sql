--liquibase formatted sql
--changeset aaqib@impactanalytics.co:table_set_up_in_test_03 stripComments:false splitStatements:false context:Release_1_0_03 labels:levis_test_03
--comment: added active_season_maopping table in UAT 01

CREATE TABLE size_smart.public_tb_source_bkp (
	id serial4 NOT NULL,
	planning_group_name varchar NULL,
	size_name varchar NULL,
	order_number int4 NULL,
	profile_name varchar NULL,
	profile_label varchar NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT public_tb_source_bkp_pkey PRIMARY KEY (id),
	CONSTRAINT public_tb_source_bkp_unique_all UNIQUE (planning_group_name, size_name, order_number, profile_name, profile_label)
);