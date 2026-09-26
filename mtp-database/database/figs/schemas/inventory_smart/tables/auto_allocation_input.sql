--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_auto_allocation_input_table stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
--rollback: SELECT 1

CREATE table if not exists inventory_smart.auto_allocation_input (
    division varchar not null,
    gender varchar not null,
    category varchar not null,
    "class" varchar not null,
    article varchar null,
    auto_approve_flag bool not null,
    int_div varchar not null,
    user_code int4 not  null,
    total_style_count int4 null,
    style_count_per_row int4 null,
    article_list _varchar DEFAULT '{}'::character varying[] not null,
    row_num int4 not null,
    allocation_code varchar not null,
    auto_approve_no int4 null,
    asn_id varchar NULL,
    allocation_type varchar NULL,
    auto_release bool NULL,
    allocation_status varchar,
    updated_at timestamptz not null default now(),
    mapped_stores jsonb DEFAULT '{}'::jsonb NOT NULL,
    store_groups jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT auto_allocation_input_key UNIQUE (division, gender, category, "class", article, auto_approve_flag, int_div, article_list)
);



--changeset abhishek.sagar@impactanalytics.co:sync_auto_allocation_input_table_remove_cols stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input_remove
ALTER TABLE inventory_smart.auto_allocation_input
DROP COLUMN IF EXISTS article,
DROP COLUMN IF EXISTS asn_id,
DROP COLUMN IF EXISTS mapped_stores,
DROP COLUMN IF EXISTS store_groups
;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
