--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_reporting_post_markdown_analysis_31122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_post_markdown_analysis

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_post_markdown_analysis;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_post_markdown_analysis(_start_date date, _end_date date, _stg_id integer[], _product_hierarchy jsonb, _store_hierarchy jsonb, _currency_ids integer[], _page_number integer DEFAULT 1, _num_records integer DEFAULT 100, _sort_key text DEFAULT NULL::text, _sort_order text DEFAULT 'asc'::text, _filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE("Enterprise Channel" text, "Brand" text, "Division" text, "Department" text, "Class" text, "Subclass" text, "Style" text, "Color" text, "Size" text, "Customer Choice" text, "Forecasted Revenue" numeric, "Actual Revenue" numeric, "Forecasted Sales U" numeric, "Actual Sales U" numeric, "Forecasted GM $" numeric, "Actual GM $" numeric, "Forecasted GM %" numeric, "Actual GM %" numeric, "Forecasted Cost $" numeric, "Actual Cost $" numeric, "Forecasted U ST%" numeric, "Actual U ST%" numeric, "Forecasted Inventory" numeric, "Actual Inventory" numeric, "% Strategies with IA recommendation" numeric, total integer, actual_records_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	base_query text;
	final_query text;
	base_query_2 text;
	actuals_base_query text;
	acceptance_base_query text;
    _filter_clause TEXT := '';
    _sort_clause TEXT := '';
    _stg_id_filter_clause text;
 	_get_store_clause text;
    _get_product_clause text;
    _start_time text;
    _filter_key TEXT;
    _filter_value TEXT;
    _first BOOLEAN := TRUE;
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

    IF _filters IS NOT NULL then
    	FOR _filter_key, _filter_value IN
        SELECT key, value::TEXT
        FROM jsonb_each_text(_filters)
    LOOP
        -- Append AND between multiple conditions
        IF NOT _first THEN
            _filter_clause := _filter_clause || ' AND ';
        END IF;

        -- Construct the WHERE clause with ILIKE
        _filter_clause := _filter_clause || format('%I::text ILIKE %L', _filter_key, '%' || _filter_value || '%');
        _first := FALSE;
    END LOOP;
    END IF;

    IF length(_filter_clause) > 0 then
   		_filter_clause := 'WHERE ' || _filter_clause;
   	end if;
    raise notice 'filter_clause : %', _filter_clause;

    IF _sort_key IS NOT NULL THEN
        _sort_clause = format(' , %I %s', _sort_key, _sort_order);
    END IF;
    raise notice 'sort_clause : %', _sort_clause;

    if _page_number is null then
  		_page_number = 1;
	end if;

	if _num_records is null then
  		_num_records = 100;
	end if;

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
		from global.planned_forex_rate
		where target_currency_id = %2$s
	);', _start_time, _target_currency_id);

	raise notice 'currency conversion query : %', currency_query;
	EXECUTE currency_query;
	raise notice 'currency conversion temp table created';

	
	currency_query_actual = FORMAT(' create unlogged table price_markdown_opt_temp.currency_conversion_actual_%1$s
	as
	(select distinct pf.date, pf.source_currency_id, pf.target_currency_id, 
	coalesce(af.planned_conversion_multiplier, pf.planned_conversion_multiplier) as planned_conversion_multiplier 
		from global.actual_forex_rate af
		right join (select distinct * from global.planned_forex_rate) pf
		on pf.date = af.date
		and pf.source_currency_id = af.source_currency_id
		and pf.target_currency_id = af.target_currency_id
		where pf.target_currency_id = %2$s
	);', _start_time, _target_currency_id);

	raise notice 'currency conversion query actual : %', currency_query_actual;
	EXECUTE currency_query_actual;
	raise notice 'currency conversion temp table created actual';

    base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_pma_ia_base_%1$s
	as(
    with product_filter as (
        SELECT
        l0_name as brand,
        l1_name as division,
        l2_name as department,
        l3_name as class,
        l4_name as subclass,
        l5_name as style,
        l6_name as color,
        l7_name as size,
        a.product_id, cost,
		a.currency_id
        FROM %5$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
	store_filter as (
        SELECT
        s0_name as country,
		s1_name as enterprise_channel,
        s2_name as region,
        s3_name as district,
        s4_name as state,
        s5_name as city,
        s6_name as store_name,
        store_id
        from %6$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
		and approval_status in (''Initially Approved'', ''Finally Approved'')
        )

	select enterprise_channel, ssd.store_id, brand, division, department, class, subclass, style, color, size, ssd.product_id, ssd.product_id as sku, 
	avg(cost*cc.planned_conversion_multiplier) as cost, 
	avg(total_inventory) as total_inventory, 
	sum(sales_units) sales_units, 
	sum(revenue*cc.planned_conversion_multiplier) as revenue, 
	sum(margin*cc.planned_conversion_multiplier) as margin, min(inv) inv
	from (select strategy_id, product_level_id, product_id, store_id, store_level_id, pcd_id, recommendation_date,
	sum(sales_units) sales_units, sum(revenue) revenue, sum(margin) margin, min(rem_inv) inv
	from price_markdown.tb_ssd_ia
	where (%4$s)
	and recommendation_date between ''%2$s'' and ''%3$s''
	group by 1,2,3,4,5,6,7) ssd
	join product_filter pf
	on ssd.product_id = pf.product_id
	join store_filter sf
	on ssd.store_id = sf.store_id
	join strategy_date_filter sdf
	on sdf.strategy_id = ssd.strategy_id
	and sdf.product_level_id = ssd.product_level_id
	and sdf.store_level_id = ssd.store_level_id
	and sdf.pcd_id = ssd.pcd_id
	left join global.tb_latest_inventory tli
	on ssd.product_id = tli.product_id
	and ssd.store_id = tli.store_id
	left join price_markdown_opt_temp.currency_conversion_%1$s cc
	on pf.currency_id = cc.source_currency_id
	and ssd.recommendation_date = cc.date
	group by 1,2,3,4,5,6,7,8,9,10,11,12
	);', _start_time, _start_date, _end_date, _stg_id_filter_clause,
    _get_product_clause, _get_store_clause);

	raise notice 'base query : %', base_query;
	EXECUTE base_query;
	raise notice 'base temp table created for post markdown analysis';

	actuals_base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_pma_act_base_%1$s
	as(
    with product_filter as (
        SELECT
        l0_name as brand,
        l1_name as division,
        l2_name as department,
        l3_name as class,
        l4_name as subclass,
        l5_name as style,
        l6_name as color,
        l7_name as size,
        a.product_id, cost,
		a.currency_id
        FROM %5$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%4$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
	store_filter as (
        SELECT
        s0_name as country,
        s1_name as enterprise_channel,
        s2_name as region,
        s3_name as district,
        s4_name as state,
        s5_name as city,
        s6_name as store_name,
        store_id
        from %6$s
        ),
	strategy_date_filter as (
        SELECT
        DISTINCT strategy_id, product_level_id, store_level_id, pcd_id
        from price_markdown.tb_strategy_discount sd
        where (%4$s)
		and approval_status in (''Initially Approved'', ''Finally Approved'')
        )

	select enterprise_channel, ssd.store_id, brand, division, department, class, subclass, style, color, size, ssd.product_id, ssd.product_id as sku, 
	avg(cost*cc.planned_conversion_multiplier) as cost, 
	avg(total_inventory) as total_inventory, 
	sum(sales_units) sales_units, 
	sum(revenue*cc.planned_conversion_multiplier) as revenue, 
	sum(margin*cc.planned_conversion_multiplier) as margin, min(inv) inv
	from (select strategy_id, product_level_id, product_id,store_id,store_level_id, pcd_id, recommendation_date,
	sum(sales_units) sales_units, sum(revenue) revenue, sum(margin) margin, min(rem_inv) inv
	from price_markdown.tb_ssd_actual
	where (%4$s)
	and recommendation_date between ''%2$s'' and ''%3$s''
	group by 1,2,3,4,5,6,7) ssd
	join product_filter pf
	on ssd.product_id = pf.product_id
	join store_filter sf
	on ssd.store_id = sf.store_id
	join strategy_date_filter sdf
	on sdf.strategy_id = ssd.strategy_id
	and sdf.product_level_id = ssd.product_level_id
	and sdf.pcd_id = ssd.pcd_id
	and sdf.store_level_id = ssd.store_level_id
	left join global.tb_latest_inventory tli
	on ssd.product_id = tli.product_id
	and ssd.store_id = tli.store_id
	left join price_markdown_opt_temp.currency_conversion_actual_%1$s cc
	on pf.currency_id = cc.source_currency_id
	and ssd.recommendation_date = cc.date
	group by 1,2,3,4,5,6,7,8,9,10,11,12);', _start_time, _start_date, _end_date, _stg_id_filter_clause,
  _get_product_clause, _get_store_clause, _sort_clause);

	raise notice 'actuals base query : %', actuals_base_query;
	EXECUTE actuals_base_query;
	raise notice 'actuals base temp table created for post markdown analysis';

	acceptance_base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_pma_acceptance_base_%1$s
	as(
    with
	ia_data as (
        SELECT strategy_id, product_id, store_id, pcd_id, recommended_offer_percentage as ia_discount
        from price_markdown.tb_ssd_ia
        where (%4$s)
        and recommendation_date between ''%2$s'' and ''%3$s''
		group by 1,2,3,4,5
        ),
	fin_data as (
        SELECT strategy_id, product_id, store_id, pcd_id, recommended_offer_percentage as fin_discount
        from price_markdown.tb_ssd_fin
        where (%4$s)
        and recommendation_date between ''%2$s'' and ''%3$s''
		group by 1,2,3,4,5
        ),
    base as(
	select strategy_id, sum(case when ia_discount != fin_discount then 1 else 0 end) as no_match
	from ia_data
	join fin_data
	using(strategy_id, product_id, store_id, pcd_id)
	group by 1)

	select strategy_id, product_id, stg_acc,
	sum(case when no_match = 0 then 1 else 0 end) over (partition by product_id) / count(strategy_id) over (partition by product_id) as prod_acc
	from (select strategy_id, no_match, sum(case when no_match = 0 then 1 else 0 end) over ()/ count(strategy_id) over () as stg_acc from base) a
	join (select distinct strategy_id, product_id from ia_data) b
	using(strategy_id)
	 );', _start_time, _start_date, _end_date, _stg_id_filter_clause);

	raise notice 'acceptance base query : %', acceptance_base_query;
	EXECUTE acceptance_base_query;
	raise notice 'acceptance base temp table created for post markdown analysis';

	base_query_2 = FORMAT('create unlogged table price_markdown_opt_temp.reporting_pma_base_%1$s
	as
	(
	select a.enterprise_channel as "Enterprise Channel", a.brand as "Brand", a.division as "Division", a.department as "Department", 
	a.class as "Class", a.subclass as "Subclass", a.style as "Style", a.color as "Color", a.size as "Size", a.sku::text as "Customer Choice",
	round(sum(a.revenue::numeric)) as "Forecasted Revenue",
	round(sum(ab.revenue::numeric)) as "Actual Revenue",
	round(sum(a.sales_units::numeric)) as "Forecasted Sales U",
	round(sum(ab.sales_units::numeric)) as "Actual Sales U",
	round(sum(a.margin::numeric)) as "Forecasted GM $",
	round(sum(ab.margin::numeric)) as "Actual GM $",
	round(coalesce(sum(a.margin::numeric)/nullif(sum(a.revenue::numeric),0),0)*100,2) as "Forecasted GM %%",
	round(coalesce(sum(ab.margin::numeric)/nullif(sum(ab.revenue::numeric),0),0)*100,2) as "Actual GM %%",
	round(sum(a.sales_units::numeric*a.cost::numeric)) as "Forecasted Cost $",
	round(sum(ab.sales_units::numeric*ab.cost::numeric)) as "Actual Cost $",
	round(coalesce(sum(a.sales_units::numeric)/nullif(sum(a.total_inventory::numeric),0), 0)*100,2) as "Forecasted U ST%%",
	round(coalesce(sum(ab.sales_units::numeric)/nullif(sum(ab.total_inventory::numeric),0), 0)*100,2) as "Actual U ST%%",
	round(sum(a.inv::numeric)) as "Forecasted Inventory",
	round(sum(ab.inv::numeric)) as "Actual Inventory",
	round(ac.num_accepted_stg*100::numeric,2) as "%% Strategies with IA recommendation",
	0 as total
	from price_markdown_opt_temp.reporting_pma_ia_base_%1$s a
	join price_markdown_opt_temp.reporting_pma_act_base_%1$s ab
	using(product_id, store_id)
	join (select product_id, sum(case when prod_acc = 1 then 1 else 0 end)/count(distinct strategy_id) as num_accepted_stg
				from price_markdown_opt_temp.reporting_pma_acceptance_base_%1$s group by 1) ac
	using(product_id)
	group by 1,2,3,4,5,6,7,8,9,10,25
	 );', _start_time);

	raise notice 'base query 2 : %', base_query_2;
	execute base_query_2;

	final_query = format('
	with base as
	(select * from price_markdown_opt_temp.reporting_pma_base_%1$s
	%2$s
	ORDER BY total %3$s
	LIMIT %4$s OFFSET %5$s ),

	actual_records_cnt as
	(select count(*) as actual_records_count from price_markdown_opt_temp.reporting_pma_base_%1$s
	%2$s)

	select * from
	(
	select * from base
	union
	select ''TOTAL'' as "Enterprise Channel", '''' as "Brand", '''' as "Division", '''' as "Department", '''' as "Class", 
	'''' as "Subclass", '''' as "Style", '''' as "Color", '''' as "Size", '''' as "Customer Choice",
	round(sum(a.revenue::numeric)) as "Forecasted Revenue",
	round(sum(ab.revenue::numeric)) as "Actual Revenue",
	round(sum(a.sales_units::numeric)) as "Forecasted Sales U",
	round(sum(ab.sales_units::numeric)) as "Actual Sales U",
	round(sum(a.margin::numeric)) as "Forecasted GM $",
	round(sum(ab.margin::numeric)) as "Actual GM $",
	round(coalesce(sum(a.margin::numeric)/nullif(sum(a.revenue::numeric),0),0)*100,2) as "Forecasted GM %%",
	round(coalesce(sum(ab.margin::numeric)/nullif(sum(ab.revenue::numeric),0),0)*100,2) as "Actual GM %%",
	round(sum(a.sales_units::numeric*a.cost::numeric)) as "Forecasted Cost $",
	round(sum(ab.sales_units::numeric*ab.cost::numeric)) as "Actual Cost $",
	round(coalesce(sum(a.sales_units::numeric)/nullif(sum(a.total_inventory::numeric),0), 0)*100,2) as "Forecasted U ST%%",
	round(coalesce(sum(ab.sales_units::numeric)/nullif(sum(ab.total_inventory::numeric),0), 0)*100,2) as "Actual U ST%%",
	round(sum(a.inv::numeric)) as "Forecasted Inventory",
	round(sum(ab.inv::numeric)) as "Actual Inventory",
	round(avg(acc)*100::numeric,2) as "%% Strategies with IA recommendation", 1 as total
	from price_markdown_opt_temp.reporting_pma_ia_base_%1$s a
	join price_markdown_opt_temp.reporting_pma_act_base_%1$s ab
	on a.product_id = ab.product_id
	and a.store_id = ab.store_id
	cross join (select (sum(case when stg_acc = 1 then 1 else 0 end)/count(distinct strategy_id)) acc from (
				select strategy_id, stg_acc from
				price_markdown_opt_temp.reporting_pma_acceptance_base_%1$s group by 1,2) a) ac
	order by total %3$s ) final, actual_records_cnt;', _start_time, _filter_clause, _sort_clause, _num_records, (_page_number - 1) * _num_records);

	raise notice 'final query : %', final_query;

	RETURN QUERY execute final_query;
	execute format('Drop table price_markdown_opt_temp.reporting_pma_ia_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_pma_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_pma_act_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_pma_acceptance_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.currency_conversion_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.currency_conversion_actual_%1$s', _start_time);
END;
$function$
;
