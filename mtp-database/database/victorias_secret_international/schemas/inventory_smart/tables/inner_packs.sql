--liquibase formatted sql
--changeset harshitha.sv@impactanalytics.co:inner_packs_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:inner_packs_v1
--comment: initial changeset for inner_packs VS intl
CREATE TABLE IF NOT EXISTS inventory_smart.inner_packs (
    product_code varchar NULL,
	"location" varchar NULL,
	inner_pack_units int4 NULL
);