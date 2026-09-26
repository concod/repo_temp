--liquibase formatted sql
--changeset swapnil.bhange:auto_allocation_input_v1 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input_v1

CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_input (
    l0_name  varchar NOT NULL,
    l1_name  varchar NOT NULL,
    l2_name  varchar NOT NULL,
    l3_name  varchar NOT NULL,
    l4_name  varchar NULL,
    article  varchar NULL,
    auto_approve_flag bool NOT NULL,
    int_div   varchar NOT NULL,
    user_code int4 NOT NULL,
    total_article_count int4 NULL,
    article_count_per_row int4 NULL,
    article_list _varchar NOT NULL DEFAULT '{}'::varchar[],
    row_num int4 NOT NULL,
    allocation_code varchar NOT NULL,
    auto_approve_no int4 NULL,
    allocation_type varchar NULL,
    auto_release bool NULL,
    allocation_status varchar NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    mapped_stores jsonb NOT NULL DEFAULT '{}'::jsonb,
    store_groups  jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT aa_input_temp_key UNIQUE
    (l0_name, l1_name, l2_name, l3_name, article, auto_approve_flag, int_div, article_list)
);

--changeset swapnil.bhange:auto_allocation_input_v2 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input_v2
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS range_name varchar NULL;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS article;
ALTER TABLE inventory_smart.auto_allocation_input DROP CONSTRAINT IF EXISTS aa_input_temp_key;

ALTER TABLE inventory_smart.auto_allocation_input ADD CONSTRAINT aa_input_temp_key UNIQUE
    (l0_name, l1_name, l2_name, l3_name, range_name, auto_approve_flag, int_div, article_list);

--changeset swapnil.bhange:auto_allocation_input_v3 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input_v3
ALTER TABLE inventory_smart.auto_allocation_input DROP CONSTRAINT IF EXISTS aa_input_temp_key;

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS range_name varchar NULL;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS l0_name_article_list_map jsonb NULL;

ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS l0_name;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS l1_name;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS l2_name;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS l3_name;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS l4_name;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS total_article_count;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS article_count_per_row;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS allocation_type;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS auto_release;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS mapped_stores;
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS store_groups;

ALTER TABLE inventory_smart.auto_allocation_input ADD CONSTRAINT aa_input_temp_key UNIQUE
    (range_name, auto_approve_flag, article_list);

--changeset swapnil.bhange:auto_allocation_input_v4 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input_v4
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS store_groups  jsonb NOT NULL DEFAULT '{}'::jsonb;

--changeset swapnil.bhange:auto_allocation_input_v5 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input
--comment: initial changeset for auto_allocation_input_v5
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS batch_number int4 NULL;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
