--liquibase formatted sql
--changeset rajesh.kumar:new_store_projections_version stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:87585
--comment: initial changeset for new_store_projections_version

CREATE TABLE "global".new_store_projections_version (
    version_code int4 NOT NULL,
    id int4 NOT NULL,
    store_code TEXT NOT NULL,
    l0_name TEXT,
    l1_name TEXT,
    l2_name TEXT,
    l3_name TEXT,
    l4_name TEXT,
    l5_name TEXT,
    l6_name TEXT,
    l7_name TEXT,
    projected_units INTEGER,
    projected_value NUMERIC,
    extra_attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sister_store_code TEXT NOT NULL,
    range_name TEXT NULL,
    CONSTRAINT new_store_projections_version_pk PRIMARY KEY (version_code, id)
)
PARTITION BY LIST (version_code);

-- global.new_store_projections_version foreign keys

ALTER TABLE "global".new_store_projections_version ADD CONSTRAINT new_store_projections_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_new_store_projections_version_store_code ON "global".new_store_projections_version (store_code);