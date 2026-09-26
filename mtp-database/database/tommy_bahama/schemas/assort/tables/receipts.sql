--liquibase formatted sql
--changeset liquibase:receipts_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for receipts
CREATE TABLE if not exists assort.receipts (
    date date NOT NULL,
    store_code character varying NOT NULL,
    product_code character varying NOT NULL,
    quantity bigint NOT NULL,
    price double precision NOT NULL,
    cost double precision NOT NULL
);
