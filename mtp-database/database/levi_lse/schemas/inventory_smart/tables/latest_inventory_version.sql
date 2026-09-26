--liquibase formatted sql
--changeset himansh.bhardwaj:latest_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: initial changeset for latest_inventory_version

CREATE TABLE inventory_smart.latest_inventory_version
(
    version_code int4 NOT NULL,
    date date NOT NULL,
    channel character varying  NOT NULL,
    product_code character varying  NOT NULL,
    store_code character varying NOT NULL,
    oh integer,
    it integer,
    oo integer,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    CONSTRAINT latest_inventory_version_pk PRIMARY KEY (version_code, date, channel, product_code, store_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.latest_inventory_version foreign keys

ALTER TABLE inventory_smart.latest_inventory_version ADD CONSTRAINT latest_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

-- Indexes replicated from original DDL
CREATE INDEX IF NOT EXISTS latest_inventory_version_date_idx ON inventory_smart.latest_inventory_version USING btree(date);
CREATE INDEX IF NOT EXISTS latest_inventory_version_product_code_idx ON inventory_smart.latest_inventory_version USING btree(product_code);
CREATE INDEX IF NOT EXISTS latest_inventory_version_store_code_idx ON inventory_smart.latest_inventory_version USING btree (store_code);