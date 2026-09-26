
--liquibase formatted sql
--changeset Shaik.Azmathulla:latest_inventory1 stripComments:false splitStatements:false context:Release_1_1 labels:DAT-1517 validCheckSum:any
--comment: initial changeset for latest_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory
(
    date date NOT NULL,
    channel character varying  NOT NULL,
    product_code character varying  NOT NULL,
    store_code character varying NOT NULL,
    oh integer,
    it integer,
    oo integer,
    CONSTRAINT latest_inventory_un UNIQUE (date, channel, product_code, store_code),
    CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code)
        REFERENCES global.product_master (product_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code)
        REFERENCES global.store_master (store_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS latest_inventory_date_idx ON inventory_smart.latest_inventory USING btree(date );
CREATE INDEX IF NOT EXISTS latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree(product_code);
CREATE INDEX IF NOT EXISTS latest_inventory_store_code_idx ON inventory_smart.latest_inventory USING btree (store_code);

--changeset himansh.bhardwaj@impactanalytics.co:adding l0_name,l1_name stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding l0_name,l1_name
ALTER TABLE inventory_smart.latest_inventory ADD COLUMN IF NOT EXISTS l0_name varchar NOT NULL;
ALTER TABLE inventory_smart.latest_inventory ADD COLUMN IF NOT EXISTS l1_name varchar NOT NULL;