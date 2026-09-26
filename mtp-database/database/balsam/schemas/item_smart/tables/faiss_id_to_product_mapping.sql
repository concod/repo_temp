--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:faiss_id_to_product_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial_changeset_for_faiss_id_to_product_mapping

CREATE TABLE item_smart.faiss_id_to_product_mapping (
    key                integer,
    l0_name            text,
    l1_name            text,
    modelled_products  text,
    sku                text,
    price              float,
    cost               float,
    product_type       text,
    is_modelled        text,
    color              text,
    size               text,
    vendor             text,
    shape              text,
    dropship           text,
    lighttype          text,
    l2_name            text,
    l3_name            text,
    l4_name            text,
    l5_name            text,
    product_name       text,
    product_description text,
    price_percentile   float,
    cost_percentile    float,
    pc                 text,
    cc                 text,
    price_band         text,
    cost_band          text,
    vectorcol          text,
    vectorcol_clean    text,
    CONSTRAINT pk_faiss_mapping PRIMARY KEY (key)
);
CREATE INDEX idx_faiss_mapping_sku ON item_smart.faiss_id_to_product_mapping(sku);

--changeset abhimanyu.j@impactanalytics.co:faiss_id_changes stripComments:false splitStatements:false context:Release_index labels:faiss_id_changes_1
--comment: added alter stmt for faiss_id_changes_1

ALTER TABLE item_smart.faiss_id_to_product_mapping
ADD COLUMN level_realism text,
ADD COLUMN season text,
ADD COLUMN lifecycle text,
ADD COLUMN light_design text,
ADD COLUMN light_type text,
ADD COLUMN light_count text,
ADD COLUMN tree_shape text,
ADD COLUMN f_familydescription text;