--liquibase formatted sql
--changeset liquibase:tb_future_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_future_inventory_po

CREATE TABLE "global".tb_future_inventory_po (
    product_id int4 NULL,
    po_date date NULL,
    initial_eta date NULL,
    ordered_quantity int4 NULL
);

--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:tb_future_inventory_po_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add primary key to tb_future_inventory_po

ALTER TABLE "global".tb_future_inventory_po
ADD CONSTRAINT pk_tb_future_inventory_po
PRIMARY KEY (product_id, po_date);