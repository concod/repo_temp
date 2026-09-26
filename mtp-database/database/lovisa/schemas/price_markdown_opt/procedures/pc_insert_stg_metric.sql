--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_insert_stg_metric_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_stg_metric

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_stg_metric;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_stg_metric(IN _strategy_id integer, IN _currency_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_is_there integer;
	delete_query text;
	insert_query text;
BEGIN
	select ia_value_exists::integer into _is_there 
	from price_markdown_opt.fn_check_metric_table_data_exists(_strategy_id, _currency_type);

	delete_query := FORMAT('delete from price_markdown.tb_stg_metric_%2$s where strategy_id = %1$s;', _strategy_id, _currency_type);
	execute delete_query;
	raise notice 'Deleted the data from stg_metric table';

 	if _is_there = 1 then
        insert_query =FORMAT('
        insert into price_markdown.tb_stg_metric_%2$s (strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
        margin_ia, margin_fin, spend_ia, spend_fin, currency_id, 
        revenue_ia_with_vat, revenue_fin_with_vat, margin_ia_with_vat, margin_fin_with_vat, 
        spend_ia_with_vat, spend_fin_with_vat)
        (
        select strategy_id, sales_units_ia, sales_units_fin, 
        revenue_ia, revenue_fin, margin_ia, margin_fin, spend_ia, spend_fin, 
        currency_id, revenue_ia_with_vat, revenue_fin_with_vat, margin_ia_with_vat, margin_fin_with_vat, 
        spend_ia_with_vat, spend_fin_with_vat
        from
        (select strategy_id, currency_id, sum(sales_units) as sales_units_ia, 
        sum(revenue) as revenue_ia, sum(margin) as margin_ia, sum(spend) as spend_ia, 
        sum(revenue_with_vat) as revenue_ia_with_vat, sum(margin_with_vat) as margin_ia_with_vat,
        sum(spend_with_vat) as spend_ia_with_vat
        from price_markdown.tb_agg_ia_%2$s
		where strategy_id = %1$s
        group by 1,2) a
        join
        (select strategy_id, currency_id, sum(sales_units) as sales_units_fin, 
        sum(revenue) as revenue_fin, sum(margin) as margin_fin, sum(spend) as spend_fin,
        sum(revenue_with_vat) as revenue_fin_with_vat, sum(margin_with_vat) as margin_fin_with_vat,
        sum(spend_with_vat) as spend_fin_with_vat
        from price_markdown.tb_agg_fin_%2$s
		where strategy_id = %1$s
        group by 1,2) b
        using(strategy_id, currency_id)
        );', _strategy_id, _currency_type);
    else
        insert_query = FORMAT('
        insert into price_markdown.tb_stg_metric_%2$s (strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
        margin_ia, margin_fin, spend_ia, spend_fin, 
        currency_id, revenue_ia_with_vat, revenue_fin_with_vat, margin_ia_with_vat, margin_fin_with_vat, 
        spend_ia_with_vat, spend_fin_with_vat)
        (
        select strategy_id, currency_id, 0 as sales_units_ia, sum(sales_units) as sales_units_fin, 
        0 as revenue_ia, sum(revenue) as revenue_fin, 
        0 as margin_ia, sum(margin) as margin_fin,
        0 as spend_ia, sum(spend) as spend_fin,
        0 as revenue_ia_with_vat, sum(revenue_with_vat) as revenue_fin_with_vat, 
        0 as margin_ia_with_vat, sum(margin_with_vat) as margin_fin_with_vat, 
        0 as spend_ia_with_vat, sum(spend_with_vat) as spend_fin_with_vat
        from price_markdown.tb_agg_fin_%2$s
		where strategy_id = %1$s
        group by 1,2);', _strategy_id, _currency_type);

    end if;
    raise notice 'Insert query: %', insert_query;
	execute insert_query;
	raise notice 'Inserted data into stg metric table';
END;
$procedure$
;
