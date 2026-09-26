--liquibase formatted sql
--changeset liquibase:price_promo_opt_temp stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo_opt_temp

CREATE TABLE price_promo_opt_temp.opt_flag (
	id int8 NULL
);