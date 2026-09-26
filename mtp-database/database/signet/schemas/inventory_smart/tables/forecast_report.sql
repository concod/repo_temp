--liquibase formatted sql
--changeset liquibase:forecast_report stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_report
CREATE TABLE inventory_smart.forecast_report (
	product_code varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	actual_discount_percentage float4 NULL,
	planned_discount_percentage float4 NULL,
	actual_sales int4 NULL,
	ia_forecast float4 NULL,
	adjusted_forecast float4 NULL,
	multiplier float4 NULL,
	adjusted_forecast_error float4 NULL,
	ia_forecast_error float4 NULL,
	count_store int4 NULL,
	CONSTRAINT forecast_report_pk PRIMARY KEY (fiscal_year_week, product_code)
)
PARTITION BY RANGE (fiscal_year_week);
ALTER TABLE inventory_smart.forecast_report ADD CONSTRAINT forecast_report_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

/*
do $$
declare 
	partition_stmt varchar;
begin
	for partition_stmt in 
select
	'create table inventory_smart.forecast_report_' || from_fiscal_year_week || ' partition of inventory_smart.forecast_report for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
from
	(
	select
		distinct fiscal_year_week from_fiscal_year_week,
		fiscal_year_week + 1 to_fiscal_year_week
	from
		global.fiscal_date_mapping fdm
	where
		fdm."date" > '31-Jan-2018'
	order by
		1
	limit 520) x
loop 
	execute partition_stmt;
end loop;
end $$;
*/


--changeset saumya.agnihotri@impactanalytics.co:forecast_report stripComments:false splitStatements:false context:MTP-18041 labels:original_ia_forecast_coll_add
--comment: column addition original_ia_forecast, original_ia_forecast_error

ALTER TABLE inventory_smart.forecast_report ADD COLUMN original_ia_forecast float4 ;
ALTER TABLE inventory_smart.forecast_report ADD COLUMN original_ia_forecast_error float4 ;