--liquibase formatted sql
--changeset liquibase:product_store_count stripComments:false splitStatements:false context:MTP-28215 labels:MTP-28215
--comment: MTP-28215:initial changeset for product_store_count
CREATE TABLE inventory_smart.product_store_count
(
product_code varchar not null,
store_count int not null
);