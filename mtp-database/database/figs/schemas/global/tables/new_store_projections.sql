--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:new_store_data_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections

CREATE TABLE IF NOT EXISTS "global".new_store_projections(
    id serial4 NOT NULL,
    store_code text NOT NULL,
    sister_store_code text NOT NULL,
    store_name text NULL,
    article text NULL,
    s0_name text NULL,
    channel text NULL,
    channel_name text NULL,
    multiplier numeric NULL,
    wos numeric NULL,
    l0_name text NULL,
    l1_name text NULL,
    l2_name text NULL,
    l3_name text NULL,
    l4_name text NULL,
    projected_units int4 NULL,
    projected_value numeric NULL,
    extra_attributes jsonb DEFAULT '{}'::jsonb NULL,
    created_at timestamp DEFAULT now() NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT new_store_projections_pkey PRIMARY KEY (id),
    CONSTRAINT fk_new_store_projections_store_code FOREIGN KEY (store_code) REFERENCES "global".new_store_data(store_code) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_new_store_projections_store_code ON global.new_store_projections USING btree (store_code);

