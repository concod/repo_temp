--liquibase formatted sql
--changeset liquibase:article_store_count stripComments:false splitStatements:false context:MTP-28215 labels:MTP-28215
--comment: MTP-28215:initial changeset for article_store_count
CREATE TABLE inventory_smart.article_store_count
(
article varchar not null,
product_code varchar not null,
store_count int not null
);