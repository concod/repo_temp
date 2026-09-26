--liquibase formatted sql
--changeset liquibase:tb_auto_allocation_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_auto_allocation_status
CREATE TABLE inventory_smart.tb_auto_allocation_status (
	allocation_code varchar(300) NOT NULL,
	status varchar(200) NOT NULL,
	status_time timestamp NULL,
	remarks varchar(300) NULL
);
--changeset raj.mohan:tb_auto_allocation_status stripComments:false splitStatements:false context:Release_1_1 labels:new_seq
--comment: new columns for tb_auto_allocation_status
ALTER TABLE IF EXISTS inventory_smart.tb_auto_allocation_status
    ADD COLUMN number_articles bigint;
ALTER TABLE IF EXISTS inventory_smart.tb_auto_allocation_status
    ADD COLUMN payload text;
--changeset raj.mohan:tb_auto_allocation_status_updated stripComments:false splitStatements:false context:Release_1_1 labels:new_seq
--comment: drop columns for tb_auto_allocation_status
ALTER TABLE IF EXISTS inventory_smart.create_allocation_result_flat_gurobi
	DROP COLUMN IF EXISTS selected_store_codes;