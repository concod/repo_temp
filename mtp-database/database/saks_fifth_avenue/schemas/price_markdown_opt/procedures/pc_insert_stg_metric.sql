--liquibase formatted sql
--changeset liquibase:pc_insert_stg_metric_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
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
        margin_ia, margin_fin, spend_ia, spend_fin)
        (
        select strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin, margin_ia, margin_fin, spend_ia,
        spend_fin
        from
        (select strategy_id, sum(sales_units) as sales_units_ia, sum(revenue) as revenue_ia, sum(margin) as margin_ia,
        sum(spend) as spend_ia
        from price_markdown.tb_agg_ia
		where strategy_id = $1
        group by 1) a
        join
        (select strategy_id, sum(sales_units) as sales_units_fin, sum(revenue) as revenue_fin,
        sum(margin) as margin_fin, sum(spend) as spend_fin
        from price_markdown.tb_agg_fin
		where strategy_id = $1
        group by 1) b
        using(strategy_id)
        );
		';
    else
        insert_query = '
        insert into price_markdown.tb_stg_metric (strategy_id, sales_units_ia, sales_units_fin, revenue_ia, revenue_fin,
        margin_ia, margin_fin, spend_ia, spend_fin)
        (
        select strategy_id, 0 as sales_units_ia, sum(sales_units) as sales_units_fin, 0 as revenue_ia,
        sum(revenue) as revenue_fin, 0 as margin_ia, sum(margin) as margin_fin,
        0 as spend_ia, sum(spend) as spend_fin
        from price_markdown.tb_agg_fin
		where strategy_id = $1
        group by 1);';

    end if;
    raise notice 'Insert query: %', insert_query;
	execute insert_query using _strategy_id;
	raise notice 'Inserted data into stg metric table';
END;
$procedure$
;
