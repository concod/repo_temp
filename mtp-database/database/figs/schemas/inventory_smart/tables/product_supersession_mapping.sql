--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:product_supersession_mapping_figs stripComments:false splitStatements:false context:Release_1_0 labels:figs_product_supersession
--comment: initial changeset for product_supersession_mapping
CREATE TABLE inventory_smart.product_supersession_mapping (
    ps_code bigserial NOT NULL,
    old_article varchar NULL,
    old_product_code varchar NOT NULL,
    article varchar NULL,
    product_code varchar NOT NULL,
    priority int4 NULL,
    start_date date NULL,
    end_date date NULL,
    has_store_exception bool NULL,
    created_at timestamptz DEFAULT now() NULL,
    updated_at timestamptz DEFAULT now() NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    CONSTRAINT product_supersession_mapping_pkey PRIMARY KEY (ps_code)
);


--changeset abhishek.sagar@impactanalytics.co:product_supersession_mapping_figs_v1 stripComments:false splitStatements:false context:Release_1_0 labels:figs_product_supersession
--comment: alter changeset for product_supersession_mapping
ALTER TABLE inventory_smart.product_supersession_mapping  ADD supersession_id varchar NULL;