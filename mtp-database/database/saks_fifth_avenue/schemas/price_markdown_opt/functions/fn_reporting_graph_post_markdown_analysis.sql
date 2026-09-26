--liquibase formatted sql
--changeset liquibase:fn_reporting_graph_post_markdown_analysis_v231024 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_graph_post_markdown_analysis

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_graph_post_markdown_analysis;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_graph_post_markdown_analysis(_start_date date, _end_date date, _stg_id integer[], _l0_cid integer[], _l1_cid integer[], _l2_cid integer[], _l3_cid integer[], _l4_cid integer[], _s0_id integer[], _s1_id integer[], _mkd_type text[], _view_by text)
 RETURNS TABLE("Timeline" text, "Forecasted Sales $" numeric, "Actual Sales $" numeric, "Forecasted Sales U" numeric, "Actual Sales U" numeric, "Forecasted GM $" numeric, "Actual GM $" numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	base_query text;
	final_query text;
	base_query_2 text;
   _stg_id_filter_clause text;
  _mkd_type_filter_clause text := 'True';
 	_store_filter_clause text;
 	_get_product_clause text;
   _start_time text;
BEGIN
    _start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
   raise notice 'start time : %', _start_time;

	if _stg_id is not null then
	_stg_id_filter_clause = format(' strategy_id = any(%L)', _stg_id);
	else
	select array_agg(distinct strategy_id) from price_markdown.tb_approval_metrics
	join (select distinct strategy_id from price_markdown.tb_strategy_master where status in (3,4,6)) sm using(strategy_id)
	where pcd_start_date <= _end_date and pcd_end_date >= _start_date into _stg_id;
	_stg_id_filter_clause = format(' strategy_id = any(%L)', _stg_id);
	end if;
	raise notice 'strategy filter clause : %', _stg_id_filter_clause;

	 if _mkd_type is not null then
	 _mkd_type_filter_clause = format(' sd.markdown_type = any(%L)', _mkd_type);
	 end if;
	 raise notice 'markdown type filter clause : %', _mkd_type_filter_clause;

	_store_filter_clause = format(' s0_id = any(%L) and s1_id = any(%L)', _s0_id, _s1_id);
	raise notice 'store filter clause : %', _store_filter_clause;

	_get_product_clause = format(' price_markdown_opt.fn_reporting_get_products(
        %L, %L, %L, %L, %L
        )', _l0_cid, _l1_cid, _l2_cid, _l3_cid, _l4_cid);
      raise notice 'get product clause : %', _get_product_clause;

    base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_graph_pma_ia_base_%1$s
	as(
    with product_filter as (
        SELECT
        concat(l0_id, ''-'', l0_name) as division,
        fob,
        concat(l1_id, ''-'', l1_name) as dmm,
        concat(l2_id, ''-'', l2_name) as dept,
        age_bucket,
        a.product_id, cost
        FROM %7$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6, 7),
	store_filter as (
        SELECT
        store_id
        from global.tb_store_master
        where %6$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id, markdown_type
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
        and (%5$s)
        ),
	fiscal_cte as
	(
	select case when %8$L = ''week'' then concat(''FW'', fiscal_week, '' '', fiscal_year)
	else concat(''FM'', fiscal_month, '' '', fiscal_year) end as timeline, date, fiscal_week, fiscal_month, fiscal_year
	from global.tb_fiscal_date_mapping
	where date between ''%2$s'' and ''%3$s''
	)

	select timeline,
	sum(sales_units) sales_units, sum(revenue) revenue, sum(margin) margin
	from (select strategy_id, product_id, store_id, product_level_id, store_level_id, recommendation_date, pcd_id,
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
	group by 1 );', _start_time, _start_date, _end_date, _stg_id_filter_clause,
	  _mkd_type_filter_clause, _store_filter_clause, _get_product_clause, _view_by);

	raise notice 'base query : %', base_query;
	EXECUTE base_query;
	raise notice 'ia base temp table created for post markdown graph';

	base_query_2 = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_graph_pma_act_base_%1$s
	as(
    with product_filter as (
        SELECT
        concat(l0_id, ''-'', l0_name) as division,
        fob,
        concat(l1_id, ''-'', l1_name) as dmm,
        concat(l2_id, ''-'', l2_name) as dept,
        age_bucket,
        a.product_id, cost
        FROM %7$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6, 7),
	store_filter as (
        SELECT
        store_id
        from global.tb_store_master
        where %6$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id, markdown_type
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
        and (%5$s)
        ),
	fiscal_cte as
	(
	select case when %8$L = ''week'' then concat(''FW'', fiscal_week, '' '', fiscal_year)
	else concat(''FM'', fiscal_month, '' '', fiscal_year) end as timeline, date, fiscal_week, fiscal_month, fiscal_year
	from global.tb_fiscal_date_mapping
	where date between ''%2$s'' and ''%3$s''
	)

	select timeline,
	sum(sales_units) sales_units, sum(revenue) revenue, sum(margin) margin
	from (select strategy_id, product_id, store_id, product_level_id, store_level_id, recommendation_date, pcd_id,
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
	group by 1 );', _start_time, _start_date, _end_date, _stg_id_filter_clause,
	  _mkd_type_filter_clause, _store_filter_clause, _get_product_clause, _view_by);

	raise notice 'base query 2 : %', base_query_2;
	EXECUTE base_query_2;
	raise notice 'act base temp table created for post markdown graph';

	final_query = format('
	select a.timeline, round(a.revenue::numeric) as "Forecasted Sales $", round(ab.revenue::numeric) as "Actual Sales $",
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
END;
$function$
;
