--liquibase formatted sql
--changeset liquibase:tb_clearance_trigger_eligible_sku_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_eligible_sku_stores

CREATE TABLE price_markdown.tb_clearance_trigger_eligible_sku_stores (
    trigger_id int4 NOT NULL,
    product_id int8 NULL,
    store_id int8 NULL,
    created_by int4 NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    max_product_hierarchy_level int4 NULL,
    CONSTRAINT tb_clearance_trigger_sku_mapping_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
)
PARTITION BY LIST (trigger_id);
