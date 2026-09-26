-- liquibase formatted sql
-- changeset kumar.shubham:store_optimized_report_temp stripComments:false splitStatements:false context: created store_optimized_report_temp table labels:store_optimized_report_temp
-- comment: new table for space smart to store scaled sellable sqft data

CREATE TABLE space_smart.store_optimized_report_temp (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NULL,
	l4_name varchar(100) NULL,
	gender varchar(100) NULL,
	l3_name varchar(100) NULL,
	l5_name varchar(100) NULL,
	sellable_sqft float8 NULL,
	cloud_task_id varchar NULL,
	CONSTRAINT store_optimized_report_temp_pkey PRIMARY KEY (id)
);


--changeset kumar.shubham@impactanalytics.co:store_optmized_temp_table_changes stripComments:false splitStatements:false context:new_column labels:liquibase_project_start
--comment: new is_lock column added

ALTER TABLE space_smart.store_optimized_report_temp ADD COLUMN is_lock BOOLEAN;
ALTER TABLE space_smart.store_optimized_report_temp ALTER COLUMN is_lock SET DEFAULT FALSE;