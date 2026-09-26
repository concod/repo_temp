--liquibase formatted sql
--changeset liquibase:product_order_dc_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_order_dc_mapping
CREATE TABLE global.product_order_dc_mapping (
    po_code integer NOT NULL,
    dc character varying NOT NULL,
    quantity real NOT NULL,
    quantity_perc real NOT NULL,
    CONSTRAINT dc_check CHECK ((length((dc)::text) > 0))
);
ALTER TABLE global.product_order_dc_mapping
    ADD CONSTRAINT product_order_dc_mapping_fk FOREIGN KEY (po_code) REFERENCES global.product_order_master(po_code) ON DELETE CASCADE;
