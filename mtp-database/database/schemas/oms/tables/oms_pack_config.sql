--liquibase formatted sql
--changeset liquibase:oms_pack_config_cb_uat stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_pack_config for cb uat


CREATE TABLE IF NOT EXISTS oms.oms_pack_config (
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

--changeset raja.duraisamy@impactanalytics.co:oms_pack_config_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_pack_config based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_pack_config_article ON oms.oms_pack_config(article) WHERE pack_id IS NOT NULL AND pack_id <> 'WP';
CREATE INDEX IF NOT EXISTS idx_oms_pack_config_article_pack ON oms.oms_pack_config(article, pack_id);
CREATE INDEX IF NOT EXISTS idx_oms_pack_config_product_code ON oms.oms_pack_config(product_code);


--changeset raja.duraisamy@impactanalytics.co:index_oms_pack_config_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_pack_config
DROP INDEX IF EXISTS oms.idx_oms_pack_config_product_code;