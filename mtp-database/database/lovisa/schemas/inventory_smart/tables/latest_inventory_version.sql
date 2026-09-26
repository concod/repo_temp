--liquibase formatted sql
--changeset Shaik.Azmathulla:latest_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:latest_inventory_version
--comment: initial changeset for latest_inventory_version

CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory_version
(
    version_code int NOT NULL,
	date date NOT NULL,
    channel character varying COLLATE pg_catalog."default" NOT NULL,
    product_code character varying COLLATE pg_catalog."default" NOT NULL,
    store_code character varying COLLATE pg_catalog."default" NOT NULL,
    oh integer,
    it integer,
    oo integer,
    CONSTRAINT latest_inventory_version_un UNIQUE (version_code,date, channel, product_code, store_code),
    CONSTRAINT latest_inventory_version_product_fk FOREIGN KEY (product_code)
        REFERENCES global.product_master (product_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT latest_inventory_version_store_fk FOREIGN KEY (store_code)
        REFERENCES global.store_master (store_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT latest_inventory_version_code_fk FOREIGN KEY (version_code)
        REFERENCES global.versioning (version_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE

) PARTITION BY LIST (version_code);

CREATE INDEX IF NOT EXISTS latest_inventory_version_date_idx ON inventory_smart.latest_inventory_version USING btree(date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS latest_inventory_version_product_code_idx ON inventory_smart.latest_inventory_version USING btree(product_code COLLATE pg_catalog."default" ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS latest_inventory_version_store_code_idx ON inventory_smart.latest_inventory_version USING btree(store_code COLLATE pg_catalog."default" ASC NULLS LAST);

--changeset swapnl.bhange:latest_inventory_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:latest_inventory_version
--comment: initial changeset for latest_inventory_version_v2
ALTER TABLE inventory_smart.latest_inventory_version ADD COLUMN IF NOT EXISTS original_sku varchar NULL;
ALTER TABLE inventory_smart.latest_inventory_version ADD COLUMN IF NOT EXISTS store_type varchar NULL;

--changeset swapnl.bhange-2:latest_inventory_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:latest_inventory_version
--comment: initial changeset for latest_inventory_version_v2
ALTER TABLE inventory_smart.latest_inventory_version ADD COLUMN IF NOT EXISTS display_article varchar NULL;

