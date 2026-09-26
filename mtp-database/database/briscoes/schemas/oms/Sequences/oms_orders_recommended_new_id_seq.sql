---liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_orders_recommended_new_id_seq stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_orders_recommended_new_id_seq
--comment: initial changeset for oms_orders_recommended_new_id_seq
CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_orders_recommended_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;