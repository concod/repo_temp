--liquibase formatted sql
--changeset swapnil.bhange:psm_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for psm_inventory_version addition

CREATE TABLE IF NOT EXISTS inventory_smart.psm_inventory_version (
    version_code INT4 NOT NULL,
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,	
    article varchar NOT NULL,	
    total_inv int4 NOT NULL,
    display_article varchar NOT NULL,	
    CONSTRAINT psm_inventory_version_pk PRIMARY KEY (version_code, article, store_code)
)
PARTITION BY LIST (version_code);

