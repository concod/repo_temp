--liquibase formatted sql
--changeset himansh.bhardwaj:dc_pack_configuration_version_consolidated stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831
--comment: consolidated changeset for dc_pack_configuration_version

CREATE TABLE inventory_smart.dc_pack_configuration_version (
    version_code int4 NOT NULL,
    pack_type_id varchar NULL,
    pack_type varchar NULL,
    product_code varchar NULL,
    "size" varchar NULL,
    units_in_pack float8 NULL,
    pack_description int4 NULL,
    article varchar NULL,
    CONSTRAINT dc_pack_configuration_version_pk PRIMARY KEY (version_code, product_code, pack_type_id)
)
PARTITION BY LIST (version_code);

-- inventory_smart.dc_pack_configuration_version foreign keys
ALTER TABLE inventory_smart.dc_pack_configuration_version ADD CONSTRAINT dc_pack_configuration_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join ON inventory_smart.dc_pack_configuration_version USING btree (pack_type_id, article, pack_type, product_code);
-- changeset pradeep.nayak@impactanalytics.co:pack_desc stripComments:false splitStatements:false context:Optimisation labels:MTP-75831
-- comment: adding index on packtypeid, article , size
CREATE INDEX IF NOT EXISTS idx_dc_pack_configuration_join_on_size ON inventory_smart.dc_pack_configuration_version USING btree (pack_type_id, article, size);