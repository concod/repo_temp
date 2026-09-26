--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:order_reason_master stripComments:false splitStatements:false context:VS_inv_smart labels:VS-174
--comment: initial changeset for order_reason_master
CREATE TABLE inventory_smart.order_reason_master (
	order_reason varchar NULL,
	order_reason_description varchar NULL,
	order_reason_order_reason_description varchar NULL
);

