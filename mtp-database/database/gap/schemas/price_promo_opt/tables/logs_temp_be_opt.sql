--liquibase formatted sql
--changeset liquibase:store_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for logs_temp_be_opt


CREATE TABLE price_promo_opt.logs_temp_be_opt (
	log_time timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	"data" varchar NULL,
	log_type varchar DEFAULT 'log' NULL
);