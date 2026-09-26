--liquibase formatted sql
--changeset liquibase:tb_allocation_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_allocation_status
CREATE TABLE inventory_smart.tb_allocation_status (
	allocation_code varchar(300) NOT NULL,
	allocation_type varchar(300) NOT NULL,
	status varchar(200) NOT NULL,
	created_at timestamp NOT NULL,
	remarks varchar(300) NULL,
	retry_count bigint NULL
);
