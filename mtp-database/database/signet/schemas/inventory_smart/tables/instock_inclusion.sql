--liquibase formatted sql
--changeset sri.harsha:instock_inclusion stripComments:false splitStatements:false context:Release_1_0 labels:MTP-20351
--comment: initial changeset for instock_inclusion
--rollback: SELECT 1
CREATE TABLE inventory_smart.instock_inclusion (
	product_code varchar NULL,
	instock_inclusion bool NULL
);