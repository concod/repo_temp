--liquibase formatted sql
--changeset liquibase:deviated_pricing_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for deviated_pricing_v1
CREATE TABLE price_promo.deviated_pricing (
    c0_name     VARCHAR(200) not null,
    c0_id       INT8 not null,
    c2_id       INT8 NULL,
    c2_name     VARCHAR(200) NULL,
    product_id  INT8 not null,
    channel     VARCHAR(100) not null,
    zone_nm     VARCHAR(100) null,
    price       FLOAT8 not null
);
CREATE INDEX deviated_pricing_id_idx ON price_promo.deviated_pricing USING btree (product_id, c2_id);
CREATE INDEX deviated_pricing_chnl_id_idx ON price_promo.deviated_pricing USING btree (product_id, c2_id, channel, zone_nm);


--changeset kumaran.k@impactanalytics.co:deviated_pricing_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version_1
--comment: deviated_pricing_v3

ALTER TABLE price_promo.deviated_pricing
    DROP COLUMN channel,
    DROP COLUMN zone_nm,
    ADD COLUMN s0_name VARCHAR(200),
    ADD COLUMN s0_id INT8,
    ADD COLUMN s3_name VARCHAR(200),
    ADD COLUMN s3_id INT8;