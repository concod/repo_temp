--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_reporting_style_rollup_06012026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_style_rollup

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_style_rollup;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_style_rollup(_pcd_start_date date, _stg_id integer[], _product_hierarchy jsonb, _store_hierarchy jsonb, _currency_ids integer[], _page_number integer DEFAULT 1, _num_records integer DEFAULT 100, _sort_key text DEFAULT NULL::text, _sort_order text DEFAULT 'asc'::text, _filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE("Territory" text, "Channel" text, "Range name" text, "Product group name" text, "Product sub- group name" text, "Ref ID" text, "Product life cycle" text, "Product Descripton" text, "Age Bucket" text, "FLC" numeric, "Current Price" numeric, "New Price" numeric, "List Price" numeric, "Inv U" numeric, "Inv $ C" numeric, "Inv $ R Curr" numeric, "Inv $ R New" numeric, "Prev MU" numeric, "New MU" numeric, "MD %" numeric, total integer, actual_records_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	pf_base_query text;
	sdf_base_query text;
	base_query text;
	final_query text;
	base_query_2 text;
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
BEGIN
    _start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
    raise notice 'start time : %', _start_time;

    -- Get target currency from input array, default to 1 if null
    -- _target_currency_id := COALESCE(
    --     (select price_markdown.fn_get_target_currency_id(_currency_ids)),1);
    -- raise notice 'target currency id : %', _target_currency_id;

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
	select array_agg(distinct strategy_id) from price_markdown.tb_approval_metrics_global
	join (select distinct strategy_id from price_markdown.tb_strategy_master where status in (1,2,3)) sm using(strategy_id)
	where pcd_start_date = _pcd_start_date into _stg_id;
	_stg_id_filter_clause = format(' strategy_id = any(%L)', _stg_id);
	end if;
	raise notice 'strategy filter clause : %', _stg_id_filter_clause;

	_get_store_clause = format(' price_markdown_opt.fn_reporting_get_stores(%L::jsonb)', _store_hierarchy);
	raise notice 'store filter clause : %', _get_store_clause;

	_get_product_clause = format(' price_markdown_opt.fn_reporting_get_products(%L::jsonb)', _product_hierarchy);
      raise notice 'get product clause : %', _get_product_clause;

     pf_base_query = FORMAT('create unlogged table price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s
	as(
	SELECT
        a.l0_name as territory_p,
        a.range_name as range_name,
        a.l1_name as product_group_name,
        a.l2_name as product_sub_group_name,
        a.l4_name as ref_id,
		a.product_description,
        age_bucket, a.currency_id,
        a.product_id, cost, msrp, current_price, product_lifecycle as product_life_cycle
        FROM %3$s a
        INNER JOIN (
        SELECT product_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE (%2$s)
        GROUP BY 1
        ) b ON a.product_id = b.product_id
	);

	CREATE INDEX idx_reporting_style_rollup_pf_base_%1$s on price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s
    USING BTREE (product_id)', _start_time, _stg_id_filter_clause, _get_product_clause);

	raise notice 'pf base query : %', pf_base_query;
	EXECUTE pf_base_query;
	raise notice 'pf base temp table created for style rollup';

    sdf_base_query = FORMAT('create unlogged table price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s
	as(
	 SELECT
        DISTINCT am.strategy_id, sd.product_level_id, sd.store_level_id, sd.markdown_percentage,
        pcd_start_date
        from price_markdown.tb_approval_metrics_global am
        join price_markdown.tb_strategy_discount_global sd
        using(strategy_id, product_level_id, pcd_id)
        WHERE pcd_start_date = ''%2$s''
        and (%3$s)
	);

	CREATE INDEX idx_reporting_style_rollup_sdf_base_%1$s on price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s
    USING BTREE (strategy_id, product_level_id, store_level_id)', _start_time, _pcd_start_date, _stg_id_filter_clause);

	raise notice 'sdf base query : %', sdf_base_query;
	EXECUTE sdf_base_query;
	raise notice 'sdf base temp table created for style rollup';

	-- currency_query = FORMAT(' create unlogged table price_markdown_opt_temp.currency_conversion_%1$s
	-- as
	-- (select distinct source_currency_id, target_currency_id, planned_conversion_multiplier 
	-- 	from global.planned_forex_rate
	-- 	where target_currency_id = %2$s
	-- 	and date = current_date
	-- );', _start_time, _target_currency_id);

	-- raise notice 'currency conversion query : %', currency_query;
	-- EXECUTE currency_query;
	-- raise notice 'currency conversion temp table created';

    base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_style_rollup_base_%1$s
	as(
    with
	store_filter as (
        SELECT
        s0_name as territory,
        s2_name as channel,
        store_id
        from %3$s
        )
	select territory, channel, ssm.store_id, range_name, product_group_name, product_sub_group_name, ref_id,
	product_description,
	age_bucket,
	product_life_cycle,
	ssm.product_id,
	(pf.msrp*markdown_percentage /* * cc.planned_conversion_multiplier */)::numeric as effective_price_point,
	coalesce(tli.total_inventory::numeric, 0::numeric) as total_inventory,
	(psp.current_price /* no FX */)::numeric as current_price, 
	markdown_percentage::numeric as markdown_percentage, 
	(pf.cost /* * cc.planned_conversion_multiplier */)::numeric as cost, 
	(pf.msrp /* * cc.planned_conversion_multiplier */)::numeric as msrp
	from price_markdown.tb_strategy_sku_store_mapping ssm
	join price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s pf
	on ssm.product_id = pf.product_id
	join price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s sdf
	on sdf.strategy_id = ssm.strategy_id
	and sdf.product_level_id = ssm.product_level_id
	and sdf.store_level_id = ssm.store_level_id
	join store_filter sf
	on ssm.store_id = sf.store_id
	left join global.tb_latest_inventory tli
	on pf.product_id = tli.product_id
	and sf.store_id = tli.store_id
	join price_markdown.tb_product_store_price psp
	on pf.product_id = psp.product_id
	and sf.store_id = psp.store_id
	-- left join price_markdown_opt_temp.currency_conversion_%1$s cc
	-- on pf.currency_id = cc.source_currency_id
	WHERE (ssm.%2$s)
	);', _start_time, _stg_id_filter_clause, _get_store_clause);

	raise notice 'base query : %', base_query;
	EXECUTE base_query;
	raise notice 'base temp table created for style rollup';

	base_query_2 = FORMAT('create unlogged table price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s
	as
	(
	select 
		territory as "Territory",
        channel as "Channel",
        range_name as "Range name",
        product_group_name as "Product group name",
        product_sub_group_name as "Product sub- group name",
        ref_id as "Ref ID",
		product_life_cycle as "Product life cycle",
		product_description as "Product Descripton",
		age_bucket as "Age Bucket",

		coalesce(round(sum(cost*total_inventory)/nullif(sum(total_inventory), 0),2),0) as "FLC",
		coalesce(round(sum(current_price*total_inventory)/nullif(sum(total_inventory),0),2),0) as "Current Price",
		coalesce(round(sum(effective_price_point*total_inventory)/nullif(sum(total_inventory),0),2),0) as "New Price",
		coalesce(round(sum(msrp*total_inventory)/nullif(sum(total_inventory),0),2),0) as "List Price",
		round(sum(total_inventory)) as "Inv U",
		round(sum(total_inventory*cost)) as "Inv $ C",
		round(sum(total_inventory*current_price)) as "Inv $ R Curr",
		round(sum(total_inventory*effective_price_point)) as "Inv $ R New",
		coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "Prev MU",
		coalesce(round((sum(total_inventory*effective_price_point) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "New MU",
		case when sum(total_inventory) > 0 then round(sum(markdown_percentage*total_inventory)/nullif(sum(total_inventory),0),2)
		else avg(markdown_percentage) end as "MD %%",
        0 as total
	from price_markdown_opt_temp.reporting_style_rollup_base_%1$s
	group by 1,2,3,4,5,6,7,8,9
	);', _start_time);

	raise notice 'base query 2 : %', base_query_2;
	execute base_query_2;

	final_query = format('
	with base as
	(select * from price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s
	%2$s
	ORDER BY total %3$s
	LIMIT %4$s OFFSET %5$s ),

	actual_records_cnt as
	(select count(*) as actual_records_count from price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s
	%2$s)

	select * from
	(
	select * from base
	union
	select 
		''TOTAL'' as "Territory", 
		'''' as "Channel", 
		'''' as "Range name", 
		'''' as "Product group name", 
		'''' as "Product sub- group name", 
		'''' as "Ref ID",
		'''' as "Product life cycle",
		'''' as "Product Descripton",
		'''' as "Age Bucket",
		coalesce(round(sum(cost*total_inventory)/nullif(sum(total_inventory), 0),2),0) as "FLC",
		coalesce(round(sum(current_price*total_inventory)/nullif(sum(total_inventory),0),2),0) as "Current Price",
		coalesce(round(sum(effective_price_point*total_inventory)/nullif(sum(total_inventory),0),2),0) as "New Price",
		coalesce(round(sum(msrp*total_inventory)/nullif(sum(total_inventory),0),2),0) as "List Price",
		round(sum(total_inventory)) as "Inv U",
		round(sum(total_inventory*cost)) as "Inv $ C",
		round(sum(total_inventory*current_price)) as "Inv $ R Curr",
		round(sum(total_inventory*effective_price_point)) as "Inv $ R New",
		coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "Prev MU",
		coalesce(round((sum(total_inventory*effective_price_point) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "New MU",
		case when sum(total_inventory) > 0 then round(sum(markdown_percentage*total_inventory)/nullif(sum(total_inventory),0),2)
		else avg(markdown_percentage) end as "MD %%",
		1 as total
	from price_markdown_opt_temp.reporting_style_rollup_base_%1$s b1
	order by total %3$s) final, actual_records_cnt ;', _start_time, _filter_clause, _sort_clause, _num_records, (_page_number - 1) * _num_records);

	raise notice 'final query : %', final_query;

	RETURN QUERY execute final_query;
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s', _start_time);
	-- execute format('Drop table price_markdown_opt_temp.currency_conversion_%1$s', _start_time);
END;
$function$;
