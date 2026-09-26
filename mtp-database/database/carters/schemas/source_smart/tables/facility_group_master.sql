--liquibase formatted sql
--changeset liquibase:facility_group_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_group_master
CREATE TABLE source_smart.facility_group_master (
	facility_id varchar(255) NOT NULL,
	facility_group_id varchar(50) NOT NULL,
	facility_group_name varchar(255) NOT NULL,
	CONSTRAINT pk_facility_group_master PRIMARY KEY (facility_id),
	CONSTRAINT fk_facility_group FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id)
);
