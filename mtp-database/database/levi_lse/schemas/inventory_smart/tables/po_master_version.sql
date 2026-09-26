--liquibase formatted sql
--changeset himansh.bhardwaj:po_master_version stripComments:false splitStatements:false context:MTP-1234 labels:schema
--comment: initial changeset for po_master_version

CREATE TABLE inventory_smart.po_master_version (
    version_code int4 NOT NULL,
    po_code varchar NOT NULL,
    pack_type_id varchar NOT NULL,
    requirement_date date NOT NULL,
    channel varchar NOT NULL,
    allocated_qty int4 NULL,
    available_qty int4 NULL,
    dc_code int4 NOT NULL,
    not_before_date date NULL,
    article varchar NULL,
    number_of_allocations int4 NULL,
    product_code varchar NULL,
    CONSTRAINT po_master_version_pk PRIMARY KEY (version_code, po_code, article, pack_type_id, product_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.po_master_version foreign keys

ALTER TABLE inventory_smart.po_master_version ADD CONSTRAINT po_master_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.po_master_version ADD CONSTRAINT po_master_version_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;

-- changeset himansh.bhardwaj:po_master_version_add_display_article stripComments:false splitStatements:false context:MTP-1234 labels:schema
-- comment: adding missing display_article column to po_master_version
ALTER TABLE inventory_smart.po_master_version 
ADD COLUMN IF NOT EXISTS display_article varchar;