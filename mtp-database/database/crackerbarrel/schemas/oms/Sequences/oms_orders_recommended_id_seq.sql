--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_orders_recommended_id_seq runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:oms_orders_recommended_id_seq
--comment: initial changeset oms_orders_recommended_id_seq

DROP SEQUENCE IF EXISTS inventory_smart.oms_orders_recommended_id_seq;
CREATE SEQUENCE inventory_smart.oms_orders_recommended_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;