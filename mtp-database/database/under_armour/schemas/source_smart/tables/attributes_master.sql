--liquibase formatted sql
--changeset liquibase:attributes_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for attributes_master
CREATE TABLE source_smart.attributes_master (
    attribute_id uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(50) NOT NULL,
    attribute_type varchar(100) NOT NULL,
    description text NULL,
    metadata jsonb DEFAULT '{}'::jsonb NULL,
    sort_order int4 DEFAULT 0 NULL,
    is_active bool DEFAULT true NULL,
    tenant_id varchar(100) NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    last_modified_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT attributes_master_pkey PRIMARY KEY (attribute_id),
    CONSTRAINT unique_attribute_per_type UNIQUE (name, attribute_type, tenant_id)
);
CREATE INDEX idx_attributes_master_type ON source_smart.attributes_master USING btree (attribute_type, is_active);