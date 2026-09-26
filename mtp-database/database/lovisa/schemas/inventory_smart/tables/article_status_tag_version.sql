--liquibase formatted sql
--changeset kamaleshwaran.k:article_status_tag_version stripComments:false splitStatements:false context:article_status_tag_version
--comment: initial changeset for article_status_tag_version

CREATE TABLE IF NOT EXISTS inventory_smart.article_status_tag_version
(
    version_code int not null,
	product_code character varying COLLATE pg_catalog."default" NOT NULL,
    channel character varying COLLATE pg_catalog."default" NOT NULL,
    article_status_tag character varying COLLATE pg_catalog."default" NOT NULL,
    size character varying COLLATE pg_catalog."default" NOT NULL,
    new_size character varying COLLATE pg_catalog."default" NOT NULL,
    "order" smallint,
    CONSTRAINT article_status_tag_version_un UNIQUE (version_code,product_code, channel),
    CONSTRAINT article_status_tag_version_product_fk FOREIGN KEY (product_code)
        REFERENCES global.product_master (product_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
	 CONSTRAINT article_status_tag_version_version_code_fk FOREIGN KEY (version_code)
        REFERENCES global.versioning (version_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)PARTITION BY LIST (version_code);

CREATE INDEX IF NOT EXISTS article_status_tag_version_combine_idx
ON inventory_smart.article_status_tag_version USING btree
(product_code COLLATE pg_catalog."default" ASC NULLS LAST, channel COLLATE pg_catalog."default" ASC NULLS LAST, 
article_status_tag COLLATE pg_catalog."default" ASC NULLS LAST);

--changeset swapnil.bhange:article_status_tag_version_v2 stripComments:false splitStatements:false context:article_status_tag_version
--comment: initial changeset for article_status_tag_version_v2
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN article varchar NULL;
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN l0_name varchar NULL;
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN l1_name varchar NULL;
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN l2_name varchar NULL;
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN l3_name varchar NULL;
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN l4_name varchar NULL;

--changeset swapnil.bhange-2:article_status_tag_version_v3 stripComments:false splitStatements:false context:article_status_tag_version
--comment: adding display_article column article_status_tag_version_v3
ALTER TABLE inventory_smart.article_status_tag_version ADD COLUMN IF NOT EXISTS display_article varchar NULL;

