-- liquibase formatted sql
-- changeset paras.jain:store_last_saved_version_temp stripComments:false splitStatements:false context: created store_last_saved_version_temp table labels:store_last_saved_version_temp
-- comment: new table for space smart to store scaled sellable sqft data


CREATE TABLE space_smart.store_last_saved_version_temp (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NULL,
	l4_name varchar(100) NULL,
	gender varchar(100) NULL,
	l3_name varchar(100) NULL,
	l5_name varchar(100) NULL,
	sellable_sqft float8 NULL,
	cloud_task_id varchar NULL,
	is_lock bool DEFAULT false NULL,
	CONSTRAINT store_last_saved_version_temp_pkey PRIMARY KEY (id)
);