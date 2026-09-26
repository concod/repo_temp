--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:auto_allocation_input_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_v1
--comment: initial changeset for auto_allocation_input_v1

CREATE table if not exists inventory_smart.auto_allocation_input (
    department varchar not null,
    subdepartment varchar not null,
    "class" varchar not null,
    subclass varchar not null,
    style varchar not null,
--    style_color_desc varchar not null,
--    color_id_name varchar null,
--    brand varchar null,
--    vendor varchar null,
--    price_status varchar null,
--    "comments" varchar null,
--    silhouette varchar null,
--    article varchar null,
    auto_approve_flag bool not null,
    int_div varchar not null,
    user_code int4 not  null,
    total_style_count int4 null,
    style_count_per_row int4 null,
    article_list _varchar DEFAULT '{}'::character varying[] not null,
    row_num int4 not null,
    allocation_code varchar not null,
    auto_approve_no int4 null,
    --asn_id varchar NULL,
    allocation_type varchar NULL,
    auto_release bool NULL,
    allocation_status varchar,
    updated_at timestamptz not null default now(),
    --mapped_stores jsonb DEFAULT '{}'::jsonb NOT NULL,
    --store_groups jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT auto_allocation_input_key UNIQUE (department, subdepartment, class, subclass, auto_approve_flag, int_div, article_list)
);

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
