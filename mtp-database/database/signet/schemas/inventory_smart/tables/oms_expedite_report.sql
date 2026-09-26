--liquibase formatted sql
--changeset aman.lakkoju:oms_expedite_report stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_expedite_report


CREATE TABLE IF NOT EXISTS inventory_smart.oms_expedite_report (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	po_id varchar NOT NULL,
	not_before_date date NOT NULL,
	stockout_date date NOT NULL,
	safety_stock float4 NOT NULL,
	open_quantity float4 NOT NULL,
	open_quantity_cost float4 NOT NULL,
	CONSTRAINT pk_oms_expedite_report PRIMARY KEY (id)
);