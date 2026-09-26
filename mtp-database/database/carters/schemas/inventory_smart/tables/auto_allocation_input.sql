-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:auto_allocation_input stripComments:false splitStatements:false context:auto_allocation_input labels:schema
-- comment: initial changeset for auto_allocation_input
CREATE table if not exists inventory_smart.auto_allocation_input (
	type varchar not null,
	country varchar not null,
	channel varchar not null,
	brand varchar not null,
	sbu varchar not null,
	department varchar not null,
	collection_total varchar not null,
	auto_approve_flag bool not null,
	int_div int4 not null ,
	user_code varchar null,
	auto_approve_no int4 null,
	total_style_count int4 null,
	style_count_per_row int4 null,
	style_list _varchar DEFAULT '{}'::character varying[] not null,
	row_num int4 not null,
	allocation_code varchar not null,

	CONSTRAINT auto_allocation_input_key UNIQUE (type, country, channel, brand, sbu, collection_total, auto_approve_flag, int_div, style_list)
	);

--changeset shrinidhi.choragi@impactanalytics.co:auto_allocation_input_data_type_change stripComments:false splitStatements:false context: auto_allocation_input labels:auto_allocation_input_datatype_change
--comment: auto_allocation_input row_num
ALTER TABLE inventory_smart.auto_allocation_input ALTER COLUMN row_num TYPE VARCHAR USING row_num::VARCHAR;

--changeset aman.lakkoju:Update_auto_allocation_input_column_addition stripComments:false splitStatements:false context: auto_allocation_input labels:auto_allocation_input_datatype_change
--comment: Update_auto_allocation_input_column_addition
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS clearance_flag VARCHAR;

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset aman.lakkoju:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: add po_code column in AA input table

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS po_code varchar;

--changeset aman_lakkoju:rename_po_code_to_po_id stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: rename_po_code_to_po_id

ALTER TABLE inventory_smart.auto_allocation_input RENAME COLUMN po_code TO po_id;

--changeset arjun.pp@impactanalytics.co:rename_type_to_allocation_type stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: rename_type_to_allocation_type

ALTER TABLE inventory_smart.auto_allocation_input RENAME COLUMN type TO allocation_type;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
