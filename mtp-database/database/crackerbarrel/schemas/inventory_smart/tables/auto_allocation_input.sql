--liquibase formatted sql
--changeset liquibase:auto_allocation_input stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for auto_allocation_input

CREATE TABLE inventory_smart.auto_allocation_input (
	"type" varchar NOT NULL,
	buyer varchar NOT NULL,
	primary_trait varchar NOT NULL,
	department varchar NOT NULL,
	"class" varchar NOT NULL,
	sub_class varchar NOT NULL,
	auto_approve_flag bool NOT NULL,
	int_div int4 NOT NULL,
	user_code varchar NULL,
	auto_approve_no int4 NULL,
	total_style_count int4 NULL,
	style_count_per_row int4 NULL,
	style_list _varchar DEFAULT '{}'::character varying[] NOT NULL,
	row_num varchar NOT NULL,
	allocation_code varchar NOT NULL
);

--changeset aman_lakkoju:removed_dept,class,subclass stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_2
--comment: removed dept,class,subclass
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS department;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS class;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS sub_class;

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:Release_1_0 labels:add_allocation_status_and_updated_at_columns
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
