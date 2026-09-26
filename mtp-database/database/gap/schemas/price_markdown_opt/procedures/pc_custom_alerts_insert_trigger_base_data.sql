--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_custom_alerts_insert_trigger_base_data_31122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_custom_alerts_insert_trigger_base_data_2

DROP PROCEDURE if exists price_markdown_opt.pc_custom_alerts_insert_trigger_base_data;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_custom_alerts_insert_trigger_base_data(IN _strategy_id integer, IN _trigger_base_data_table_name text, IN _pcd_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_previous_pcd_id integer;
	_insert_trigger_base_data_query text;
	_partition_exists boolean;
	_table_schema text;
	_table_name text;
BEGIN
	-- Extract schema and table name from _trigger_base_data_table_name
	_table_schema := split_part(_trigger_base_data_table_name, '.', 1);
	_table_name := split_part(_trigger_base_data_table_name, '.', 2);

	-- Check if partition exists
	select exists (
		select 1
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = _table_schema
		and c.relname = _table_name || '_' || _strategy_id
	) into _partition_exists;

	-- Create partition if it doesn't exist
	if not _partition_exists then
		call price_markdown_opt.pc_create_strategy_partition(_strategy_id, _table_schema, _table_name);
	end if;

	select pcd_id from price_markdown.tb_strategy_pcd
	where strategy_id = _strategy_id
	and pcd_start_date = (select max(pcd_start_date) from price_markdown.tb_strategy_pcd
						where strategy_id = _strategy_id and pcd_start_date < (select pcd_start_date from price_markdown.tb_strategy_pcd
																				where strategy_id = _strategy_id and pcd_id = _pcd_id)
						) into _previous_pcd_id;

    _insert_trigger_base_data_query := format('
	DELETE FROM %1$s
	WHERE strategy_id = %2$s
	AND pcd_id = %3$s;

    INSERT INTO %1$s
	with inv as
	(
	select product_id, store_id, rem_inv
	from price_markdown.tb_ssd_actual_%2$s
	where recommendation_date = (select max(recommendation_date)
									from price_markdown.tb_ssd_actual_%2$s
									where pcd_id = %3$s)
	)
	select strategy_id, pcd_id, a.product_id, product_level_id, a.store_id, store_level_id, 
	coalesce(max(a.currency_id), 0) as currency_id,
	coalesce(sum(sales_units), 0) as sales_units, 
	coalesce(avg(a.rem_inv), 0) + coalesce(sum(sales_units), 0) as inv,
	coalesce(sum(revenue), 0) as revenue, 
	coalesce(sum(margin), 0) as margin,
	coalesce(sum(revenue_with_vat), 0) as revenue_with_vat, 
	coalesce(sum(margin_with_vat), 0) as margin_with_vat
	from price_markdown.tb_ssd_actual_%2$s a
	join inv b
	on a.product_id = b.product_id
	and a.store_id = b.store_id
	where a.pcd_id = %3$s
	group by 1,2,3,4,5,6; ',
    _trigger_base_data_table_name, _strategy_id, _previous_pcd_id
    );
  raise notice '_insert_trigger_base_data_query : %', _insert_trigger_base_data_query;
  execute _insert_trigger_base_data_query;
END;
$procedure$
;
