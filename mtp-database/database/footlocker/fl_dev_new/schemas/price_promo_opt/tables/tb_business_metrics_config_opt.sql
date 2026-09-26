--liquibase formatted sql
--changeset liquibase:tb_business_metrics_config_opt_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_business_metrics_config_opt


CREATE TABLE price_promo_opt.tb_business_metrics_config_opt (
	s0_id int4 NULL,
	s1_id int4 NULL,
	gross_shipped_rate numeric NULL,
	return_rate numeric NULL,
	net_gm_buffer_percent numeric NULL,
	variable_sales_percent numeric NULL,
	marketing_cost_percent numeric NULL,
	fulfilment_cost_dollar numeric NULL
);