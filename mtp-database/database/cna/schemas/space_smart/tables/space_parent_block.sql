-- liquibase formatted sql
-- changeset sadhana.jaiswal:space_parent_block stripComments:false splitStatements:false context: space_parent_block labels:space_parent_block
-- comment: new table for space smart tables

CREATE TABLE space_smart.space_parent_block (
	id serial4 NOT NULL,
	l0_name varchar NULL,
	l4_name varchar(100) NULL,
	parent_block varchar(50) NULL,
	ml_per_pb varchar(50) NULL,
	min_sqft int4 NULL,
	max_sqft int4 NULL,
	min_cc int4 NULL,
	max_cc int4 NULL,
	CONSTRAINT space_parent_block_pkey PRIMARY KEY (id)
);