--liquibase formatted sql
--changeset liquibase:instock_report stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for instock_report
CREATE TABLE inventory_smart.instock_report (
	fiscal_year_week int4 NOT NULL,
	store_code varchar NOT NULL,
	product_code varchar NOT NULL,
	dc_to_store_replenishment int4 NULL,
	instock_exclusion_list int4 NULL,
	combined_inclusion int4 NULL,
	min float8 NULL,
	max float8 NULL,
	model_stock float8 NULL,
	oh int4 NULL,
	it float8 NULL,
	adjusted_forecast_qty float8 NULL,
	sales_units int4 NULL,
	adjusted_error float8 NULL,
	instock_oh_count int4 NULL,
	instock_oh_percentage int4 NULL,
	instock_oh_count_ly int4 NULL,
	instock_oh_percentage_ly int4 NULL,
	instock_oh_it_count int4 NULL,
	instock_oh_it_percentage int4 NULL,
	instock_oh_it_count_ly int4 NULL,
	instock_oh_it_percentage_ly int4 NULL,
	CONSTRAINT instock_report_pk PRIMARY KEY (fiscal_year_week, product_code, store_code)
)
PARTITION BY RANGE (fiscal_year_week);
ALTER TABLE inventory_smart.instock_report ADD CONSTRAINT instock_report_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.instock_report ADD CONSTRAINT instock_report_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
/*
do $$
declare 
partition_stmt varchar;
begin
	for partition_stmt in 
select
	'create table inventory_smart.instock_report_' || from_fiscal_year_week || ' partition of inventory_smart.instock_report for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
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
