--liquibase formatted sql
--changeset himansh.bhardwaj:psm_inventory_version stripComments:false splitStatements:false context: AA labels:schema
--comment: initial changeset for psm_inventory_version

CREATE TABLE inventory_smart.psm_inventory_version (
    version_code int4 NOT NULL,
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,
    article varchar NOT NULL,
    total_inv int4 NULL,
    CONSTRAINT psm_inventory_version_pk PRIMARY KEY (version_code, product_code, store_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.psm_inventory_version foreign keys

ALTER TABLE inventory_smart.psm_inventory_version ADD CONSTRAINT psm_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.psm_inventory_version ADD CONSTRAINT psm_inventory_version_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.psm_inventory_version ADD CONSTRAINT psm_inventory_version_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;