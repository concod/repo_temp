--liquibase formatted sql
--changeset liquibase:bxgy_percentage stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for bxgy_percentage

CREATE TABLE price_promo.bxgy_percentage (
	offer_type varchar NULL,
	offer_value varchar NULL,
	percentage float8 NULL,
	discount_filter float8 NULL
);