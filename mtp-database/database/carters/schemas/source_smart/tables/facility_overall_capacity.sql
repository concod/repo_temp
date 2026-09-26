--liquibase formatted sql
--changeset liquibase:facility_overall_capacity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_overall_capacity
CREATE TABLE source_smart.facility_overall_capacity (
	f_capacity_id varchar(255) NOT NULL,
	facility_id varchar(255) NOT NULL,
	monthly_capacity int4 NOT NULL,
	valid_from_date date NOT NULL,
	valid_to_date date NULL,
	CONSTRAINT fc_pk PRIMARY KEY (f_capacity_id),
	CONSTRAINT fc_facility_master_fk FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE
);