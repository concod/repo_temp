--liquibase formatted sql
--changeset liquibase:pc_insert_stg_metric_v09052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_stg_metric

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_stg_metric(int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_stg_metric(IN _strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare _is_there integer;
   			delete_query text;
   			insert_query text;
begin

	 select ia_value_exists::integer a from price_markdown_opt.fn_check_metric_table_data_exists(_strategy_id) into _is_there;

	 delete_query = 'delete from price_markdown.tb_stg_metric where strategy_id = $1 ;';
	 execute delete_query using _strategy_id;
 	 raise notice 'Deleted the data from stg_metric table';
 	if _is_there = 1 then
        insert_query = '
        insert into price_markdown.tb_stg_metric (strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
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
        from price_markdown.tb_agg_ia
		where strategy_id = $1
        group by 1,2) a
        join
        (select strategy_id, currency_id, sum(sales_units) as sales_units_fin, 
        sum(revenue) as revenue_fin, sum(margin) as margin_fin, sum(spend) as spend_fin,
        sum(revenue_with_vat) as revenue_fin_with_vat, sum(margin_with_vat) as margin_fin_with_vat,
        sum(spend_with_vat) as spend_fin_with_vat
        from price_markdown.tb_agg_fin
		where strategy_id = $1
        group by 1,2) b
        using(strategy_id, currency_id)
        );
		';
    else
        insert_query = '
        insert into price_markdown.tb_stg_metric (strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
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
        from price_markdown.tb_agg_fin
		where strategy_id = $1
        group by 1,2);';

    end if;
    raise notice 'Insert query: %', insert_query;
	execute insert_query using _strategy_id;
	raise notice 'Inserted data into stg metric table';
END;
$procedure$
;
