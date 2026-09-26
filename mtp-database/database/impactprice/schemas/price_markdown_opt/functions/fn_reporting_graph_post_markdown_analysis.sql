--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_reporting_graph_post_markdown_analysis_01092025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_graph_post_markdown_analysis

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_graph_post_markdown_analysis;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_graph_post_markdown_analysis(_start_date date, _end_date date, _stg_id integer[], _product_hierarchy jsonb, _store_hierarchy jsonb, _currency_ids integer[], _view_by text)
 RETURNS TABLE("Timeline" text, "Forecasted Sales $" numeric, "Actual Sales $" numeric, "Forecasted Sales U" numeric, "Actual Sales U" numeric, "Forecasted GM $" numeric, "Actual GM $" numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	base_query text;
	final_query text;
	base_query_2 text;
    _stg_id_filter_clause text;
 	_get_store_clause text;
 	_get_product_clause text;
    _start_time text;
    _target_currency_id integer;
	currency_query text;
	currency_query_actual text;
BEGIN
    _start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
   raise notice 'start time : %', _start_time;

    -- Get target currency from input array, default to 1 if null
    _target_currency_id := COALESCE(
        (select price_markdown.fn_get_target_currency_id(_currency_ids)),1);
    raise notice 'target currency id : %', _target_currency_id;

	if _stg_id is not null then
	_stg_id_filter_clause = format(' strategy_id = any(%L)', _stg_id);
	else
	select array_agg(distinct strategy_id) from price_markdown.tb_approval_metrics
	join (select distinct strategy_id from price_markdown.tb_strategy_master where status in (3,4,6)) sm using(strategy_id)
	where pcd_start_date <= _end_date and pcd_end_date >= _start_date into _stg_id;
	_stg_id_filter_clause = format(' strategy_id = any(%L)', _stg_id);
	end if;
	raise notice 'strategy filter clause : %', _stg_id_filter_clause;

	_get_store_clause = format(' price_markdown_opt.fn_reporting_get_stores(%L::jsonb)', 
	_store_hierarchy);
	raise notice 'store filter clause : %', _get_store_clause;

	_get_product_clause = format(' price_markdown_opt.fn_reporting_get_products(%L::jsonb)', 
	_product_hierarchy);
    raise notice 'get product clause : %', _get_product_clause;

	currency_query = FORMAT(' create unlogged table price_markdown_opt_temp.currency_conversion_%1$s
	as
	(select distinct date, source_currency_id, target_currency_id, planned_conversion_multiplier 
		from pricesmart.planned_forex_rate
		where target_currency_id = %2$s
	);', _start_time, _target_currency_id);

	raise notice 'currency conversion query : %', currency_query;
	EXECUTE currency_query;
	raise notice 'currency conversion temp table created';

	
	currency_query_actual = FORMAT(' create unlogged table price_markdown_opt_temp.currency_conversion_actual_%1$s
	as
	(select distinct pf.date, pf.source_currency_id, pf.target_currency_id, 
	coalesce(af.planned_conversion_multiplier, pf.planned_conversion_multiplier) as planned_conversion_multiplier 
		from pricesmart.actual_forex_rate af
		right join (select distinct * from pricesmart.planned_forex_rate) pf
		on pf.date = af.date
		and pf.source_currency_id = af.source_currency_id
		and pf.target_currency_id = af.target_currency_id
		where pf.target_currency_id = %2$s
	);', _start_time, _target_currency_id);

	raise notice 'currency conversion query actual : %', currency_query_actual;
	EXECUTE currency_query_actual;
	raise notice 'currency conversion temp table created actual';

    base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_graph_pma_ia_base_%1$s
	as(
    with product_filter as (
        SELECT
        l0_name as brand,
        l1_name as department,
        l2_name as sub_department,
        age_bucket,
        a.product_id, cost,
		a.currency_id
        FROM %6$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6,7),
	store_filter as (
        SELECT
        store_id
        from %5$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
        ),
	fiscal_cte as
	(
	select case when %7$L = ''week'' then concat(''FW'', fiscal_week, '' '', fiscal_year)
	else concat(''FM'', fiscal_month, '' '', fiscal_year) end as timeline, date, fiscal_week, fiscal_month, fiscal_year
	from pricesmart.tb_fiscal_date_mapping
	where date between ''%2$s'' and ''%3$s''
	)

	select timeline,
	sum(sales_units) sales_units, sum(revenue*cc.planned_conversion_multiplier) as revenue, 
	sum(margin*cc.planned_conversion_multiplier) as margin
	from (select strategy_id, product_id,store_id, product_level_id,store_level_id, recommendation_date, pcd_id,
	sales_units, revenue, margin from price_markdown.tb_ssd_fin
	where (%4$s)
	and recommendation_date between ''%2$s'' and ''%3$s'') ssd
	join product_filter pf
	on ssd.product_id = pf.product_id
	join store_filter sf
	on ssd.store_id = sf.store_id
	join strategy_date_filter sdf
	on sdf.strategy_id = ssd.strategy_id
	and sdf.product_level_id = ssd.product_level_id
	and sdf.store_level_id = ssd.store_level_id
	and sdf.pcd_id = ssd.pcd_id
	join fiscal_cte fdm
	on ssd.recommendation_date = fdm.date
	left join price_markdown_opt_temp.currency_conversion_%1$s cc
	on pf.currency_id = cc.source_currency_id
	and ssd.recommendation_date = cc.date
	group by 1 );', _start_time, _start_date, _end_date, _stg_id_filter_clause,
	  _get_store_clause, _get_product_clause, _view_by);

	raise notice 'base query : %', base_query;
	EXECUTE base_query;
	raise notice 'ia base temp table created for post markdown graph';

	base_query_2 = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_graph_pma_act_base_%1$s
	as(
    with product_filter as (
        SELECT
        l0_name as brand,
        l1_name as department,
        l2_name as sub_department,
        age_bucket,
        a.product_id, cost,
		a.currency_id
        FROM %6$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6,7),
	store_filter as (
        SELECT
        store_id
        from %5$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
        ),
	fiscal_cte as
	(
	select case when %7$L = ''week'' then concat(''FW'', fiscal_week, '' '', fiscal_year)
	else concat(''FM'', fiscal_month, '' '', fiscal_year) end as timeline, date, fiscal_week, fiscal_month, fiscal_year
	from pricesmart.tb_fiscal_date_mapping
	where date between ''%2$s'' and ''%3$s''
	)

	select timeline,
	sum(sales_units) sales_units, 
	sum(revenue*cc.planned_conversion_multiplier) as revenue, 
	sum(margin*cc.planned_conversion_multiplier) as margin
	from (select strategy_id, product_id,store_id, product_level_id, store_level_id, recommendation_date, pcd_id,
	sales_units, revenue, margin from price_markdown.tb_ssd_actual
	where (%4$s)
	and recommendation_date between ''%2$s'' and ''%3$s'') ssd
	join product_filter pf
	on ssd.product_id = pf.product_id
	join store_filter sf
	on ssd.store_id = sf.store_id
	join strategy_date_filter sdf
	on sdf.strategy_id = ssd.strategy_id
	and sdf.product_level_id = ssd.product_level_id
	and sdf.store_level_id = ssd.store_level_id
	and sdf.pcd_id = ssd.pcd_id
	join fiscal_cte fdm
	on ssd.recommendation_date = fdm.date
	left join price_markdown_opt_temp.currency_conversion_actual_%1$s cc
	on pf.currency_id = cc.source_currency_id
	and ssd.recommendation_date = cc.date
	group by 1 );', _start_time, _start_date, _end_date, _stg_id_filter_clause,
	  _get_store_clause, _get_product_clause, _view_by);

	raise notice 'base query 2 : %', base_query_2;
	EXECUTE base_query_2;
	raise notice 'act base temp table created for post markdown graph';

	final_query = format('
	select a.timeline::text as "Timeline", round(a.revenue::numeric) as "Forecasted Sales $", round(ab.revenue::numeric) as "Actual Sales $",
	round(a.sales_units::numeric) as "Forecasted Sales U", round(ab.sales_units::numeric) as "Actual Sales U",
	round(a.margin::numeric) as "Forecasted GM $", round(ab.margin::numeric) as "Actual GM $"
	from price_markdown_opt_temp.reporting_graph_pma_ia_base_%1$s a
	join price_markdown_opt_temp.reporting_graph_pma_act_base_%1$s ab
	on a.timeline = ab.timeline
	order by a.timeline;', _start_time);

	raise notice 'final query : %', final_query;

	RETURN QUERY execute final_query;
	execute format('Drop table price_markdown_opt_temp.reporting_graph_pma_ia_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_graph_pma_act_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.currency_conversion_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.currency_conversion_actual_%1$s', _start_time);
END;
$function$
;
