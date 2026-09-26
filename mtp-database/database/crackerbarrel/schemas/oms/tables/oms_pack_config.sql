--liquibase formatted sql
--changeset liquibase:oms_pack_config_cb_test_not_exists_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_not_exists_added
--comment: initial changeset for oms_pack_config for cb test_not_exists_added


CREATE TABLE IF NOT EXISTS inventory_smart.oms_pack_config (
    article	varchar(100) NULL,
    style varchar(100) NULL,
    pack_id	varchar(100) NOT NULL,
    pack_type varchar(100) NULL,
    product_code varchar(100) NOT NULL,
    size varchar(100) NULL,
    units_in_pack int4,
    pack_description varchar(100) NULL,
    color_code varchar(100) NULL,


    id serial4 NOT NULL,
    CONSTRAINT pk_oms_pack_config PRIMARY KEY (pack_id, product_code)
);