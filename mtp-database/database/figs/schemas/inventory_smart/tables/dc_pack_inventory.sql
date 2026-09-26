--liquibase formatted sql
-- changeset anish.a@impactanalytics.co:dc_pack_inventory stripComments:false splitStatements:false context:labels:figs_dc_pack_inventory
-- comment: initial changeset for dc_pack_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.dc_pack_inventory (
    product_code varchar NOT NULL,
    article varchar NOT NULL,
    dc_code int4 NOT NULL,
    pack_type_id varchar NOT NULL,
    pack_type varchar NOT NULL,
    oh_pack_qty int4 NULL,
    oo_pack_qty int4 NULL,
    it_pack_qty int4 NULL,
    channel varchar NULL,
    "size" varchar NOT NULL,
    CONSTRAINT dc_pack_inventory_un UNIQUE (product_code, dc_code, pack_type_id),
    CONSTRAINT dc_pack_inventory_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
    CONSTRAINT dc_pack_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);