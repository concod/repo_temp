-- liquibase formatted sql
-- changeset sadhana.jaiswal:space_constraints stripComments:false splitStatements:false context: space_constraints labels:space_constraints
-- comment: new table for space smart tables

CREATE TABLE space_smart.space_constraints (
	id serial4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar(100) NULL,
	l4_name varchar(100) NULL,
	l5_name varchar(100) NULL,
	parent_block_min varchar(50) NULL,
	parent_block_max varchar(50) NULL,
	ml_min varchar(50) NULL,
	ml_max varchar(50) NULL,
	sellable_sqft_min float4 NULL,
	sellable_sqft_max float4 NULL,
	sq_ft_control varchar(100) NULL,
	sq_ft_fixed varchar(100) NULL,
	store_code varchar NULL,
	season_code int4 NULL,
	gender varchar NULL,
	CONSTRAINT space_constraints_pkey PRIMARY KEY (id),
	CONSTRAINT space_constraints_unique UNIQUE (l0_name, l3_name, l4_name, l5_name, gender, season_code, store_code)
);