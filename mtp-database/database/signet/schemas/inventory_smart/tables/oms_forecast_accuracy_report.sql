--liquibase formatted sql
--changeset vishal.kumar:oms_forecast_accuracy_report stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for oms_forecast_accuracy_report

CREATE TABLE IF NOT EXISTS inventory_smart.oms_forecast_accuracy_report (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	ia_fcst float4 NOT NULL,
	adj_fcst float4 NOT NULL,
	sales int4 NOT NULL,
	ia_vs_act float4 NOT NULL,
	adj_vs_act float4 NOT NULL,
	ia_vs_act_abs float4 NOT NULL,
	adj_vs_act_abs float4 NOT NULL,
	net_perc_ia_vs_act float4 NULL,
	net_perc_adj_vs_act float4 NULL,
	abs_perc_ia_vs_act float4 NULL,
	abs_perc_adj_vs_act float4 NULL,
	start_week_date date NOT NULL,
	CONSTRAINT pk_oms_forecast_accuracy_report PRIMARY KEY (id)
);
