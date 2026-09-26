--liquibase formatted sql
--changeset liquibase:fn_reporting_style_rollup_v141024 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_style_rollup

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_style_rollup(_pcd_start_date date, _stg_id integer[], _l0_cid integer[], _l1_cid integer[], _l2_cid integer[], _l3_cid integer[], _l4_cid integer[], _s0_id integer[], _s1_id integer[], _mkd_type text[], _page_number integer, _num_records integer, _sort_key text, _sort_order text, _filters jsonb);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_style_rollup(_pcd_start_date date, _stg_id integer[], _l0_cid integer[], _l1_cid integer[], _l2_cid integer[], _l3_cid integer[], _l4_cid integer[], _s0_id integer[], _s1_id integer[], _mkd_type text[], _page_number integer DEFAULT 1, _num_records integer DEFAULT 100, _sort_key text DEFAULT NULL::text, _sort_order text DEFAULT 'asc'::text, _filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE("Channel" character varying, "Division" text, "FOB" text, "DMM" text, "Dept" text, "MFG" text, "Class" text, "SVS" text, "Fashion Style" text, "MD Price Type" text, "Age Bucket" text, "WAC" numeric, "Current WAR" numeric, "New WAR" numeric, "MSRP" numeric, "Inv U" numeric, "Inv $ C" numeric, "Inv $ R Curr" numeric, "Inv $ R New" numeric, "Prev MU" numeric, "New MU" numeric, "MD %" numeric, "# Locations OH" bigint, "# Locations MD" bigint, total integer, actual_records_count bigint)
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
  _mkd_type_filter_clause text := 'True';
 	_store_filter_clause text;
 	_get_product_clause text;
   _start_time text;
  _filter_key TEXT;
    _filter_value TEXT;
    _first BOOLEAN := TRUE;
BEGIN
    _start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
   raise notice 'start time : %', _start_time;

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
	join (select distinct strategy_id from price_markdown.tb_strategy_master where status in (1,2,3)) sm using(strategy_id)
	where pcd_start_date = _pcd_start_date into _stg_id;
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

     pf_base_query = FORMAT('create unlogged table price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s
	as(
	SELECT
        concat(l0_id, ''-'', l0_name) as division,
        fob,
        concat(l1_id, ''-'', l1_name) as dmm,
        concat(l2_id, ''-'', l2_name) as dept,
		concat(mfg_no, ''-'', mfg_name) as mfg,
        concat(l3_id, ''-'', l3_name) as class,
        l5_id as svs,
        concat(style_id, ''-'', l3_id, ''-'', l2_id) as fashion_style,
        age_bucket,
        a.product_id, cost, msrp, lifecycle_indicator
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
        sd.markdown_type, pcd_start_date
        from price_markdown.tb_approval_metrics am
        join price_markdown.tb_strategy_discount sd
        using(strategy_id, product_level_id, pcd_id)
        WHERE pcd_start_date = ''%2$s''
        and (%3$s)
        and (%4$s)
	);

	CREATE INDEX idx_reporting_style_rollup_sdf_base_%1$s on price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s
    USING BTREE (strategy_id, product_level_id, store_level_id)', _start_time, _pcd_start_date, _stg_id_filter_clause,_mkd_type_filter_clause);

	raise notice 'sdf base query : %', sdf_base_query;
	EXECUTE sdf_base_query;
	raise notice 'sdf base temp table created for style rollup';

    base_query = FORMAT(' create unlogged table price_markdown_opt_temp.reporting_style_rollup_base_%1$s
	as(
    with
	store_filter as (
        SELECT
        s0_name as country,
        s1_name as channel,
        concat(s3_id, ''-'', s3_name) as district,
        store_id
        from global.tb_store_master
        where %5$s
        )
	select channel, ssm.store_id, division,
	fob,
	dmm, dept, mfg, class, svs, fashion_style, sdf.markdown_type,
	age_bucket,
	ssm.product_id,
	(ssm.price*markdown_percentage)::numeric as effective_price_point,
	coalesce(tli.total_inventory::numeric, 0::numeric) as total_inventory,
	psp.current_price::numeric as current_price, markdown_percentage::numeric, pf.cost::numeric, msrp::numeric
	from price_markdown.tb_strategy_sku_store_mapping ssm
	join price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s pf
	on ssm.product_id = pf.product_id
	join store_filter sf
	on ssm.store_id = sf.store_id
	join price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s sdf
	on sdf.strategy_id = ssm.strategy_id
	and sdf.product_level_id = ssm.product_level_id
	and sdf.store_level_id = ssm.store_level_id
	left join global.tb_latest_inventory tli
	on pf.product_id = tli.product_id
	and sf.store_id = tli.store_id
	join price_markdown.tb_product_store_price psp
	on pf.product_id = psp.product_id
	and sf.store_id = psp.store_id
	WHERE (ssm.%3$s)
	 );', _start_time, _pcd_start_date, _stg_id_filter_clause,
  _mkd_type_filter_clause, _store_filter_clause, _get_product_clause);

	raise notice 'base query : %', base_query;
	EXECUTE base_query;
	raise notice 'base temp table created for style rollup';

	base_query_2 = FORMAT('create unlogged table price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s
	as
	(
	select channel as "Channel", division as "Division", fob as "FOB", dmm as "DMM", dept as "Dept",
	mfg as "MFG", class as "Class", svs as "SVS", fashion_style as "Fashion Style",
	markdown_type as "MD Price Type",
	age_bucket as "Age Bucket",
	coalesce(round(sum(cost*total_inventory)/nullif(sum(total_inventory), 0),2),0) as "WAC",
	coalesce(round(sum(current_price*total_inventory)/nullif(sum(total_inventory),0),2),0) as "Current WAR",
	coalesce(round(sum(effective_price_point*total_inventory)/nullif(sum(total_inventory),0),2),0) as "New WAR",
	coalesce(round(sum(msrp*total_inventory)/nullif(sum(total_inventory),0),2),0) as "MSRP",
	round(sum(total_inventory)) as "Inv U",
	round(sum(total_inventory*cost)) as "Inv $ C",
	round(sum(total_inventory*current_price)) as "Inv $ R Curr",
	round(sum(total_inventory*effective_price_point)) as "Inv $ R New",
	coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "Prev MU",
	coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "New MU",
	case when sum(total_inventory) > 0 then round(sum(markdown_percentage*total_inventory)/nullif(sum(total_inventory),0),2)
	else avg(markdown_percentage) end as "MD %%",
	sum(case when total_inventory > 0 then 1 else 0 end) as "# Locations OH",
	sum(case when total_inventory > 0 then 1 else 0 end) as "# Locations MD",
	0 as total
	from price_markdown_opt_temp.reporting_style_rollup_base_%1$s
	group by 1,2,3,4,5,6,7,8,9,10,11
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
	select ''TOTAL'' as "Channel", '''' as "Division", '''' as "FOB", '''' as "DMM", '''' as "Dept",
	'''' as "MFG", '''' as "Class", null as "SVS", '''' as "Fashion Style",
	null as "Markdown Type", '''' as "Age Bucket",
	coalesce(round(sum(cost*total_inventory)/nullif(sum(total_inventory), 0),2),0) as "WAC",
	coalesce(round(sum(current_price*total_inventory)/nullif(sum(total_inventory),0),2),0) as "Current WAR",
	coalesce(round(sum(effective_price_point*total_inventory)/nullif(sum(total_inventory),0),2),0) as "New WAR",
	coalesce(round(sum(msrp*total_inventory)/nullif(sum(total_inventory),0),2),0) as "MSRP",
	round(sum(total_inventory)) as "Inv U",
	round(sum(total_inventory*cost)) as "Inv $ C",
	round(sum(total_inventory*current_price)) as "Inv $ R Curr",
	round(sum(total_inventory*effective_price_point)) as "Inv $ R New",
	coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "Prev MU",
	coalesce(round((sum(total_inventory*current_price) - sum(total_inventory*cost))/nullif(sum(total_inventory*cost),0)),0) as "New MU",
	case when sum(total_inventory) > 0 then round(sum(markdown_percentage*total_inventory)/nullif(sum(total_inventory),0),2)
	else avg(markdown_percentage) end as "MD %%",
	sum(case when total_inventory > 0 then 1 else 0 end) as "# Locations OH",
	sum(case when total_inventory > 0 then 1 else 0 end) as "# Locations MD",
	1 as total
	from price_markdown_opt_temp.reporting_style_rollup_base_%1$s b1
	order by total %3$s) final, actual_records_cnt ;', _start_time, _filter_clause, _sort_clause, _num_records, (_page_number - 1) * _num_records);

	raise notice 'final query : %', final_query;

	RETURN QUERY execute final_query;
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_pf_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_sdf_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_base_%1$s', _start_time);
	execute format('Drop table price_markdown_opt_temp.reporting_style_rollup_base_2_%1$s', _start_time);
END;
$function$
;