--liquibase formatted sql
--changeset jugal.mehra@impactanalytics.co:brand_carton_factor stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43394
--inventory_smart.brand_carton_factor definition
CREATE TABLE inventory_smart.brand_carton_factor (
	article varchar NOT NULL,
	channel varchar NOT NULL,
	carton_factor int4 NOT NULL
);