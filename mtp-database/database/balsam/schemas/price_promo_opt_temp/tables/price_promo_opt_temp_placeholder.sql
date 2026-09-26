--liquibase formatted sql
--changeset liquibase:price_promo_opt_temp_placeholder stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo_opt_temp_placeholder

CREATE TABLE price_promo_opt_temp.price_promo_opt_temp_placeholder (
	temp_value bool NOT NULL
);