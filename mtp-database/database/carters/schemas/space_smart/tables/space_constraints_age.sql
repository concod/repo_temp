-- liquibase formatted sql
-- changeset paras.jain.:space_constraints_age stripComments:false splitStatements:false context: space_constraints_age labels:space_constraints
-- comment: new table for space smart tables


CREATE TABLE space_smart.space_constraints_age (
	id serial4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l4_name varchar(100) NULL,
	parent_block_min varchar(50) NULL,
	parent_block_max varchar(50) NULL,
	store_code varchar NULL,
	season_code int4 NULL,
	create_at date NULL,
	update_at date NULL,
	update_by varchar(50) NULL,
	CONSTRAINT space_constraints_age_pkey PRIMARY KEY (id),
	CONSTRAINT space_constraints_age_unique UNIQUE (l0_name, l4_name, season_code, store_code)
);