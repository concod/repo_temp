-- liquibase formatted sql
-- changeset sri.harsh@impactanalytics.co:auto_allocation_input stripComments:false splitStatements:false context:auto_allocation_input labels:schema
-- comment: initial changeset for auto_allocation_input
CREATE table if not exists inventory_smart.auto_allocation_input (
	type varchar not null,
	channel varchar not null,
    l0_name varchar not null,
    l1_name varchar not null,
    l2_name varchar not null,
	auto_approve_flag bool not null,
	int_div int4 not null ,
	user_code varchar null,
	auto_approve_no int4 null,
	total_article_count int4 null,
	article_count_per_row int4 null,
	article_list _varchar DEFAULT '{}'::character varying[] not null,
	row_num int4 not null,
	allocation_code varchar not null,
	CONSTRAINT auto_allocation_input_key UNIQUE (type, channel, l0_name, l1_name, l2_name, auto_approve_flag, int_div, article_list)
	);

-- changeset sri.harsh@impactanalytics.co:auto_allocation_input_2 stripComments:false splitStatements:false context:auto_allocation_input labels:schema
-- comment: initial changeset for auto_allocation_input_2

ALTER TABLE inventory_smart.auto_allocation_input
ADD COLUMN article_dc_mapping jsonb NULL;

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset sri.harsha@impactanalytics.co:mapped_stores stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: mapped stores
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS mapped_stores jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset sri.harsha@impactanalytics.co:constraint change stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_status
--comment: constraint change

ALTER TABLE inventory_smart.auto_allocation_input DROP CONSTRAINT auto_allocation_input_key;
ALTER TABLE inventory_smart.auto_allocation_input ADD CONSTRAINT auto_allocation_input_key UNIQUE (type, l0_name, l1_name, l2_name, auto_approve_flag, int_div, article_list, allocation_code);

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
