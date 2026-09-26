--liquibase formatted sql
--changeset liquibase:auto_allocation_input stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input
CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_input (
	allocation_code varchar NOT NULL,
	allocation_status varchar NOT NULL
);

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
