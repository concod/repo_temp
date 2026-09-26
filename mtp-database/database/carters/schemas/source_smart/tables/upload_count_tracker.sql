--liquibase formatted sql
--changeset zainab.firdous@impactanalytics.co:upload_count_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for upload_count_tracker
CREATE TABLE source_smart.upload_count_tracker (
	allocation_id varchar(100) NULL,
	operation_id varchar(100) NULL,
	file_type varchar(50) NULL,
	file_path varchar(255) NULL
);