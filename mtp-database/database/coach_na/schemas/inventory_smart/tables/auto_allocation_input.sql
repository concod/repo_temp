-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:auto_allocation_input stripComments:false splitStatements:false context:auto_allocation_input labels:schema
-- comment: initial changeset for auto_allocation_input
CREATE TABLE if not exists inventory_smart.auto_allocation_input (
	"type" varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	auto_approve_flag bool NOT NULL,
	int_div int4 NOT NULL,
	user_code varchar NULL,
	auto_approve_no int4 NULL,
	total_article_count int4 NULL,
	article_count_per_row int4 NULL,
	article_list _varchar DEFAULT '{}'::character varying[] NOT NULL,
	row_num int4 NOT NULL,
	allocation_code varchar NOT NULL,
	channel varchar NULL,
	CONSTRAINT auto_allocation_input_key UNIQUE (type, l0_name, l1_name, l2_name, auto_approve_flag, int_div, article_list)
);

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset aiyush.prasad@impactanalytics.co:auto_allocation_input_v1 stripComments:false splitStatements:false context:Coach_InventorySmart labels:coach-132
--comment: Added Auto release flag
ALTER TABLE inventory_smart.auto_allocation_input  ADD COLUMN IF NOT EXISTS auto_release bool NULL;

--changeset aiyush.prasad@impactanalytics.co:auto_allocation_input_v2 stripComments:false splitStatements:false context:Coach_InventorySmart labels:coach-132
--comment: Increase Auto Allocation level to Class level
ALTER TABLE inventory_smart.auto_allocation_input  ADD COLUMN IF NOT EXISTS l3_name varchar NULL;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
