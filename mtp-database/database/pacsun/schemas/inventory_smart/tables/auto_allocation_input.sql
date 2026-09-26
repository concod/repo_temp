--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_auto_allocation_input_table stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
--rollback: SELECT 1

CREATE table if not exists inventory_smart.auto_allocation_input (
    division varchar not null,
    department varchar not null,
    sub_department varchar not null,
    "class" varchar not null,
    style varchar null,
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
	CONSTRAINT auto_allocation_input_key UNIQUE (division, department, sub_department, "class", article, auto_approve_flag, int_div, article_list)
);

--changeset sreevathsa.sp@impactanalytics.co:auto_allocation_input_add_asn_columns stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: Add ASN support columns for auto allocation input
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS asn_id varchar NULL;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_type varchar NULL;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS auto_release_flag bool NULL;

--comment: Update unique constraint to include asn_id(include this file in exceptions.json)
ALTER TABLE inventory_smart.auto_allocation_input DROP CONSTRAINT IF EXISTS auto_allocation_input_key;
ALTER TABLE inventory_smart.auto_allocation_input ADD CONSTRAINT auto_allocation_input_key UNIQUE (division, department, sub_department, "class", article, auto_approve_flag, int_div, article_list, asn_id);

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset sreevathsa.sp@impactanalytics.co:add_store_groups_ stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS mapped_stores jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS store_groups jsonb DEFAULT '{}'::jsonb NOT NULL;

--changeset abijithsarath.menon@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_auto_allocation_input
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input RENAME COLUMN auto_release_flag TO auto_release;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
