--liquibase formatted sql
--changeset himansh.bhardwaj:store_current_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_current_inventory_version

CREATE TABLE inventory_smart.store_current_inventory_version (
    version_code int4 NOT NULL,
    store_code varchar NOT NULL,
    total_inv float4 NULL,
    oh float4 NULL,
    it float4 NULL,
    CONSTRAINT store_current_inventory_version_pk PRIMARY KEY (version_code, store_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.store_current_inventory_version foreign keys

ALTER TABLE inventory_smart.store_current_inventory_version ADD CONSTRAINT store_current_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;