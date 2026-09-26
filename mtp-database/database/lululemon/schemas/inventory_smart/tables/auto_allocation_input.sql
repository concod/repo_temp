--liquibase formatted sql
--changeset liquibase:auto_allocation_input stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for auto_allocation_input

CREATE TABLE inventory_smart.auto_allocation_input (
	"type" varchar NOT NULL,
	channel varchar NOT NULL,
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
	article_dc_mapping jsonb NULL,
	allocation_status varchar NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	mapped_stores jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT auto_allocation_input_key UNIQUE (type, l0_name, l1_name, l2_name, auto_approve_flag, int_div, article_list, allocation_code)
);


--changeset liquibase:auto_allocation_input_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for auto_allocation_input_1


ALTER TABLE inventory_smart.auto_allocation_input
    ADD COLUMN IF NOT EXISTS total_style_count int4,
    ADD COLUMN IF NOT EXISTS style_count_per_row int4;

ALTER TABLE inventory_smart.auto_allocation_input
    DROP COLUMN IF EXISTS type,
    DROP COLUMN IF EXISTS article_dc_mapping,
    DROP COLUMN IF EXISTS mapped_stores,
    DROP COLUMN IF EXISTS total_article_count,
    DROP COLUMN IF EXISTS article_count_per_row;


--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
