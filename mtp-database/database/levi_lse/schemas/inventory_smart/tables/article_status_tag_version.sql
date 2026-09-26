--liquibase formatted sql
--changeset himansh.bhardwaj:article_status_tag_version_ddl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_status_tag_version with partitioning

CREATE TABLE inventory_smart.article_status_tag_version (
    version_code int4 NOT NULL,
    product_code varchar NOT NULL,
    channel varchar NOT NULL,
    article_status_tag varchar NOT NULL,
    "size" varchar NOT NULL,
    new_size varchar NOT NULL,
    "order" int2 NULL,
    CONSTRAINT article_status_tag_version_un UNIQUE (version_code, product_code, channel)
)
PARTITION BY LIST (version_code);

-- Foreign Keys
ALTER TABLE inventory_smart.article_status_tag_version ADD CONSTRAINT article_status_tag_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

-- Indexes
-- Including version_code in the index to align with the partition key and query patterns
CREATE INDEX article_status_tag_version_combine_idx ON inventory_smart.article_status_tag_version USING btree (version_code, product_code, channel, article_status_tag);

--changeset himansh.bhardwaj:article_status_tag_version_aligned_with_bq_schema stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: article_status_tag_version_aligned_with_bq_schema
ALTER TABLE inventory_smart.article_status_tag_version 
    ADD COLUMN IF NOT EXISTS article varchar NULL,
    ADD COLUMN IF NOT EXISTS l0_name varchar NULL,
    ADD COLUMN IF NOT EXISTS due_in_date_n4w date NULL,
    ADD COLUMN IF NOT EXISTS dc_inv_latest int4 NULL,
    ADD COLUMN IF NOT EXISTS first_txn_date_l2y date NULL,
    ADD COLUMN IF NOT EXISTS markdown_date date NULL,
    ADD COLUMN IF NOT EXISTS initial_allocation_flag int4 NULL,
    ADD COLUMN IF NOT EXISTS article_status_reason varchar NULL,
    ADD COLUMN IF NOT EXISTS size_order int4 NULL;