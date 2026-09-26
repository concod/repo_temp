--liquibase formatted sql
--changeset liquibase:tb_refresh_net_implied_values stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_refresh_net_implied_values
CREATE TABLE plan_smart.tb_refresh_net_implied_values (
	dept_no int4 NOT NULL,
	dept_name varchar(300) NULL,
	customer_group_desc varchar(300) NOT NULL,
	key_customer_name varchar(300) NULL,
	chester_net_implied_percent numeric NULL,
	create_datetime timestamp NULL,
	syncstartdatetime timestamp NULL DEFAULT now(),
	imputed_key_customer_name varchar(300) NOT NULL,
	CONSTRAINT tb_refresh_net_implied_values_pkey PRIMARY KEY (dept_no, customer_group_desc, imputed_key_customer_name)
);