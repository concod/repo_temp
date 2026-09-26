--liquibase formatted sql
--changeset liquibase:facility_construction_type_capacity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_construction_type_capacity
CREATE TABLE source_smart.facility_construction_type_capacity (
	f_capacity_ct_id varchar(255) NOT NULL,
	facility_id varchar(255) NULL,
	construction_type_id varchar(255) NULL,
	monthly_capacity varchar(255) NULL,
	valid_from_date date NULL,
	valid_to_date date NULL,
	CONSTRAINT fctc_pk PRIMARY KEY (f_capacity_ct_id),
	CONSTRAINT fk_capacity_construction FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE,
	CONSTRAINT fk_facility_construction FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE
);