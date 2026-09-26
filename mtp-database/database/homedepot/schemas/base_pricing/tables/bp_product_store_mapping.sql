--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_product_store_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_mapping_v2

CREATE TABLE base_pricing.bp_product_store_mapping (
    product_id int8 NOT NULL,
    store_id int4 NOT NULL,
    segment_id int4 NOT NULL,
    channel_id int4 NULL,
    base_cost float8 NULL,
    additional_cost float8 NULL,
    total_cost float8 NULL,
    price float8 NULL,
    price_lock bool NULL,
    status bool DEFAULT true,
    eligibility text NULL,
    CONSTRAINT bp_product_store_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id),
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id),
    CONSTRAINT fk_segment FOREIGN KEY (segment_id) REFERENCES base_pricing.bp_customer_segment_master(segment_id)
);