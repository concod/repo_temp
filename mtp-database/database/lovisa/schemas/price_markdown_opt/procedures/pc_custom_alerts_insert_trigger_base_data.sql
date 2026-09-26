--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_custom_alerts_insert_trigger_base_data_10122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_custom_alerts_insert_trigger_base_data_2

drop procedure if exists price_markdown_opt.pc_custom_alerts_insert_trigger_base_data;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_custom_alerts_insert_trigger_base_data(IN _strategy_id integer, IN _trigger_base_data_table_name text, IN _pcd_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_previous_pcd_id integer;
	_insert_trigger_base_data_query text;
BEGIN

	select pcd_id from price_markdown.tb_strategy_pcd
	where strategy_id = _strategy_id
	and pcd_start_date = (select max(pcd_start_date) from price_markdown.tb_strategy_pcd
						where strategy_id = _strategy_id and pcd_start_date < (select pcd_start_date from price_markdown.tb_strategy_pcd
																				where strategy_id = _strategy_id and pcd_id = _pcd_id)
						) into _previous_pcd_id;

    _insert_trigger_base_data_query = format(';
	DELETE FROM %1$s
	WHERE strategy_id = %2$s
	AND pcd_id = %3$s;

    INSERT INTO %1$s
	with inv as
	(
	select product_id, store_id, rem_inv
	from price_markdown.tb_ssd_actual_global_%2$s
	where recommendation_date = (select max(recommendation_date)
									from price_markdown.tb_ssd_actual_global_%2$s
									where pcd_id = %3$s)
	)
	select strategy_id, pcd_id, a.product_id, product_level_id, a.store_id, store_level_id, currency_id,
	sum(sales_units) as sales_units, avg(a.rem_inv) + sum(sales_units) as inv,
	sum(revenue) as revenue, sum(margin) as margin, 
	sum(revenue_with_vat) as revenue_with_vat, sum(margin_with_vat) as margin_with_vat
	from price_markdown.tb_ssd_actual_global_%2$s a
	join inv b
	on a.product_id = b.product_id
	and a.store_id = b.store_id
	where a.pcd_id = %3$s
	group by 1,2,3,4,5,6,7; ',
    _trigger_base_data_table_name, _strategy_id, _previous_pcd_id
    );
  raise notice '_insert_trigger_data_query : %', _insert_trigger_base_data_query;
  execute _insert_trigger_base_data_query;
END;
$procedure$
;
