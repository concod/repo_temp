--liquibase formatted sql
--changeset vaibhav@impactanalytics.co:tb_future_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_future_inventory_po

CREATE TABLE "global".tb_future_inventory_po (
	product_id integer NULL,
	po_date date NULL,
	initial_eta date NULL,
	ordered_quantity int4 NULL
);


--changeset harsh.singh@impactanalytics.co:tb_future_inventory_po_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_future_inventory_po
ALTER TABLE "global"."tb_future_inventory_po"
    ADD CONSTRAINT tb_future_inventory_po_pk PRIMARY KEY (product_id, po_date, initial_eta);