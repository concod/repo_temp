--liquibase formatted sql
--changeset samridhi.gupta@impactanalytics.co:auto_allocation_input_articles_func_up runOnChange:true stripComments:false splitStatements:false context:MTP-69074 commit labels:MTP-69074
--comment: get_auto_allocation_summary
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary();
DROP FUNCTION IF EXISTS inventory_smart.get_auto_allocation_summary(INTEGER);
CREATE OR REPLACE FUNCTION inventory_smart.get_auto_allocation_summary(p_batch_number integer)
 RETURNS TABLE(level_type character varying, store_name character varying, allocated_qty character varying, last_week_allocated_qty character varying, avg_8_week_allocated_qty character varying, current_week_cumulative_allocation character varying, available_to_allocate character varying, store_on_hand character varying, remaining_dc character varying, wos_forecast character varying, no_of_styles character varying, allocated_qty_per_style character varying, last_week_sales character varying, avg_last_8_week_sales character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
begin
	
    -- =====================================================
    -- EXISTING LOGIC STARTS HERE (UNCHANGED)
    -- =====================================================
    IF NOT EXISTS (
        SELECT 1
        FROM inventory_smart.auto_allocation_input
        WHERE batch_number = p_batch_number
    ) THEN
        RETURN QUERY
        SELECT 
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar,
            NULL::varchar
        WHERE FALSE;

        RETURN;
    END IF;

	drop table if exists curr_date;
	drop table if exists lw_dates;
	drop table if exists carfg_base;
	drop table if exists allocation_history;
	drop table if exists auto_alloc_today;
	drop table if exists dc_level_allocation_summary;
	drop table if exists store_level_allocation_summary;
	drop table if exists sales_org_level_allocation_summary;
	drop table if exists final_allocation_summary;
	
    -- =========================
    --  TABLE: CURRENT_DATE
    -- =========================	
--	drop table  curr_date;  
	CREATE TEMP TABLE curr_date ON COMMIT DROP AS 	
	with date1 as
	(
	select (CURRENT_TIMESTAMP AT TIME ZONE 'Pacific/Auckland')::date as current_date_nzt
	)
	select a.* , fdm.fiscal_year_week
	FROM date1 a
	left join "global".fiscal_date_mapping fdm 
	on a.current_date_nzt = fdm.date;
--	select * from curr_date;
	RAISE NOTICE 'curr_date created successfully';
	
    -- =========================
    --  TABLE: ROLLING 8 WEEKS DAYS
    -- =========================	
--	drop table lw_dates;
	CREATE TEMP TABLE lw_dates ON COMMIT DROP AS   
		WITH date_range AS 
		(
		  SELECT
		    ((select current_date_nzt from curr_date)  - 1) AS start_date,
		    ((select current_date_nzt from curr_date)  - 1) - ((7 * 8) - 1) AS end_date
		)
		, rolling_8_weeks AS 
		(
		  SELECT
		    d::date AS date,
		    (start_date - d::date) AS day_diff,
		    FLOOR((start_date - d::date) / 7) + 1 AS week_nbr
		  FROM
		    date_range,
		    GENERATE_SERIES
		    (
		      end_date,
		      start_date,
		      INTERVAL '1 day'
		    ) AS d
		)
		SELECT a.*, fdm.fiscal_year_week
		FROM rolling_8_weeks a
		left join "global".fiscal_date_mapping fdm 
		on a.date = fdm.date;
--		SELECT * FROM lw_dates;
		RAISE NOTICE 'lw_dates created successfully';
	
	-- =========================
    --  TABLE: CARFG_BASE
    -- =========================
--	drop table carfg_base;
	CREATE TEMP TABLE carfg_base ON COMMIT DROP as
	(
		with plan_data as
		(
		select distinct
		plan_code
		, created_at as created_at1
		, (pm.created_at AT TIME ZONE 'Pacific/Auckland') as created_at
		, (pm.created_at AT TIME ZONE 'Pacific/Auckland')::date as allocation_date
		from 
			inventory_smart.plan_master pm
		where
		 	1=1
--			and pm.status in (3) 
--			and pm.type in (2) --for Auto Allocation
			and pm.type in (
						    case 
						        when p_batch_number = 1 then 2 --for Auto Allocation
						        when p_batch_number = 2 then 7 --for PDQ Allocation
						    end
						)
			AND pm.is_deleted = false
			--AND pm.updated_by is not NULL
			and (pm.created_at AT TIME ZONE 'Pacific/Auckland')::date >= (select min(date) from lw_dates)
		)
		, allocation_data as
		(
		SELECT DISTINCT
		carfg.allocation_code,
		pm.allocation_date,
		carfg.article,
		carfg.store,
		carfg.inventory_source,
		carfg.demand_type,
		jsonb_each.key AS dc_code,
		packs_data.retail_size_cd,
		packs_data.packs_allocated_qty
		FROM 
			inventory_smart.create_allocation_result_flat_gurobi carfg
		JOIN 
			plan_data pm
		ON 
			carfg.allocation_code = pm.plan_code
		,LATERAL jsonb_each(carfg.pack_dc_allocation)
		,LATERAL 
		(
		SELECT
		allocated.value AS retail_size_cd,
		qty.value::INTEGER AS packs_allocated_qty,
		allocated.ordinality AS position
		FROM jsonb_array_elements_text(jsonb_each.value -> 'packs_allocated') WITH ORDINALITY AS allocated(value, ordinality)
		JOIN jsonb_array_elements_text(jsonb_each.value -> 'packs_allocated_qty') WITH ORDINALITY AS qty(value, ordinality)
		ON allocated.ordinality = qty.ordinality
		--WHERE qty.value::INTEGER > 0
		) AS packs_data
		)
		select 
			distinct 
			a.*, 
			b.original_forecast,
			b.lt_forecast
		from 
			allocation_data a
		left join 
			inventory_smart.create_allocation_result_flat_gurobi b
		using
			(allocation_code,article,store,retail_size_cd)
		where 
			1=1
			and b.inventory_source='dc'
	);
--	select * from carfg_base;
	RAISE NOTICE 'carfg_base created successfully';

    -- =========================
    --  TABLE: ALLOCATION_HISTORY
    -- =========================
--	drop  table allocation_history;
    CREATE TEMP TABLE allocation_history ON COMMIT DROP AS (
        SELECT 
            article,
            retail_size_cd,
            store,
            dc_code,
	        SUM(case WHEN week_nbr = 1 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_1_ago,
	        SUM(case WHEN week_nbr = 2 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_2_ago,
	        SUM(case WHEN week_nbr = 3 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_3_ago,
	        SUM(case WHEN week_nbr = 4 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_4_ago,
	        SUM(case WHEN week_nbr = 5 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_5_ago,
	        SUM(case WHEN week_nbr = 6 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_6_ago,
	        SUM(case WHEN week_nbr = 7 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_7_ago,
	        SUM(case WHEN week_nbr = 8 THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS allocation_8_ago,
	        SUM(case WHEN fiscal_year_week = (select fiscal_year_week from curr_date) THEN COALESCE(packs_allocated_qty, 0) ELSE 0 END) AS current_week_cumulative_allocation
        FROM 
        	carfg_base c
        JOIN 
        	lw_dates lwd
        ON 
        	c.allocation_date = lwd.date
        group by
        	1,2,3,4     	
    );
--   select * from allocation_history;
	RAISE NOTICE 'allocation_history created successfully'; 

-- =========================
    --  TABLE: TODAY'S AUTO ALLOCATION BASE DATA
    -- =========================
--  	drop table auto_alloc_today;
	create TEMP table  auto_alloc_today ON COMMIT DROP as
	(
	select *
	FROM 
		carfg_base c
	where 
		allocation_date = (select current_date_nzt from curr_date)
		and allocation_code in (select distinct allocation_code from inventory_smart.auto_allocation_input aai
								WHERE aai.batch_number = p_batch_number
								) 
	);  
--	select * from auto_alloc_today;
	RAISE NOTICE 'auto_alloc_today created successfully';

    -- =========================
    --  TABLE: DC_LEVEL_ALLOCATION_SUMMARY
    -- =========================
--	drop table dc_level_allocation_summary;
	create TEMP table dc_level_allocation_summary as
	(
	    with current_day_auto_alloc as
	    (
		select 
			article,
			retail_size_cd,
			dc_code,
			sum(packs_allocated_qty) as packs_allocated_qty
		from 
			auto_alloc_today
		group by
			1,2,3
	    )
		, dc_oh as
		(
		select
			distinct
			article,
			size as retail_size_cd,
			cast(dc_code as text) as dc_code,
			oh_packs
		from 
			inventory_smart.sku_dc_available_units dpi
			----Extract DC available for those which got eligible for auto allocation
			where article in (select distinct article from auto_alloc_today)
--			where article in (select unnest(article_list) AS article FROM inventory_smart.auto_allocation_input)
		)
		, dc_reserve as
		(
		select
			distinct
				article,
				size as retail_size_cd,
				cast(dc_code as text) as dc_code,
				quantity
			from 
				inventory_smart.sku_dc_reserved_units
		)
		, article_size_dc_level_today as
		(
		select 
			distinct 
			article
			, retail_size_cd
			, dc_code
			, coalesce(oh_packs,0) as oh_packs
			, coalesce(packs_allocated_qty,0) as packs_allocated_qty
			, coalesce(c.quantity,0) as dc_reserve
		from 
			dc_oh b
		left join 
			current_day_auto_alloc a
		using
			(article,retail_size_cd,dc_code)
		left join 
			dc_reserve c
		using
			(article,retail_size_cd,dc_code)
		)
		, dc_level as 
		(
		select 
			dc_code
			, coalesce(sum(packs_allocated_qty),0) as allocated_quantity
			, coalesce(sum(oh_packs),0) as dc_available_to_allocate
			, greatest((coalesce(sum(oh_packs),0) - coalesce(sum(packs_allocated_qty),0)) , 0) as remaining_available_to_allocate
			, count(distinct case when packs_allocated_qty>0 then article end) as no_of_style_color_allocated 
		from
			article_size_dc_level_today
		group by
			1
		)
		, allocation_weeky as
		(
		select 
		*,
		(
		  allocation_1_ago +
		  allocation_2_ago +
		  allocation_3_ago +
		  allocation_4_ago +
		  allocation_5_ago +
		  allocation_6_ago +
		  allocation_7_ago +
		  allocation_8_ago
		) / 8.0 AS avg_8_week_allocation
		from
			(
			select 
				dc_code
				,coalesce(sum(p.allocation_1_ago),0) as allocation_1_ago
				,coalesce(sum(p.allocation_2_ago),0) as allocation_2_ago
				,coalesce(sum(p.allocation_3_ago),0) as allocation_3_ago
				,coalesce(sum(p.allocation_4_ago),0) as allocation_4_ago
				,coalesce(sum(p.allocation_5_ago),0) as allocation_5_ago
				,coalesce(sum(p.allocation_6_ago),0) as allocation_6_ago
				,coalesce(sum(p.allocation_7_ago),0) as allocation_7_ago
				,coalesce(sum(p.allocation_8_ago),0) as allocation_8_ago 
				,coalesce(sum(p.current_week_cumulative_allocation),0) as current_week_cumulative_allocation
			from
				allocation_history p
			group by
				1
			)a
		)
	select 
	  b.dc_code
	, dc.linked_store_code as dc_name
	, a.allocated_quantity
	, a.dc_available_to_allocate
	, a.remaining_available_to_allocate
	, a.no_of_style_color_allocated
	, coalesce(b.allocation_1_ago, 0) as allocation_1_ago
	, coalesce(b.allocation_2_ago, 0) as allocation_2_ago
	, coalesce(b.allocation_3_ago, 0) as allocation_3_ago
	, coalesce(b.allocation_4_ago, 0) as allocation_4_ago
	, coalesce(b.allocation_5_ago, 0) as allocation_5_ago
	, coalesce(b.allocation_6_ago, 0) as allocation_6_ago
	, coalesce(b.allocation_7_ago, 0) as allocation_7_ago
	, coalesce(b.allocation_8_ago, 0) as allocation_8_ago
	, coalesce(b.current_week_cumulative_allocation, 0) as current_week_cumulative_allocation
	, coalesce(round(b.avg_8_week_allocation, 0),0) as avg_8_week_allocation
	, round((allocated_quantity/NULLIF(no_of_style_color_allocated, 0)),0) as allocated_qty_per_style
	from 
		dc_level a
	right join
		allocation_weeky b
	using 
		(dc_code)
	left join
		"global".distribution_centres dc 
	on cast(b.dc_code as text) = cast(dc.dc_code as text)
	);
--	select * from dc_level_allocation_summary;
	RAISE NOTICE 'dc_level_allocation_summary created successfully';


    -- =========================
    --  TABLE: STORE_LEVEL_ALLOCATION_SUMMARY
    -- =========================
--	drop table store_level_allocation_summary;
	create temp table store_level_allocation_summary as
	(
		with store_base as
		(
		select distinct a.store from auto_alloc_today a
		union distinct
		select distinct b.store_code from public.auto_allocation_summary_kpi b
		union distinct
		select distinct c.store from allocation_history c
		)
		, current_day_auto_alloc as
	    (
		select 
			article,
			retail_size_cd,
			store,
			sum(packs_allocated_qty) as packs_allocated_qty,
			max(original_forecast) as original_forecast,
			max(lt_forecast) as lt_forecast
		from 
			auto_alloc_today
		group by
			1,2,3
	    )
		, store_oh as
		(
		select  
		  store_code as store
		, sum(oh) as oh
		, sum(oo) as oo
		, sum(it) as it
		from 
			inventory_smart.latest_inventory li
		join 
			"global".product_attributes_filter paf 
		using
			(product_code)
		join 
			"global".store_attributes_filter saf 
		using
			(store_code)
		where 
			1=1
			and saf.special_classification <>'WHS'
			and article in (select distinct article from auto_alloc_today)
--			and paf.article in (select unnest(article_list) AS article FROM inventory_smart.auto_allocation_input)
		group by
			1
		)
--		select * from store_oh
		, store_level as
		(
		select 
			distinct 
			 store
			, oh
			, oo
			, it
			, packs_allocated_qty as allocated_quantity
			, original_forecast as original_forecast
			, lt_forecast as lt_forecast
			, no_of_style_color_allocated as no_of_style_color_allocated
		from 
			store_oh b
		left join 
			(
			select
				store
				, sum(packs_allocated_qty) as packs_allocated_qty
				, sum(original_forecast) as original_forecast
				, sum(lt_forecast) as lt_forecast
				, count(distinct case when packs_allocated_qty>0 then article end) as  no_of_style_color_allocated
			from	
				current_day_auto_alloc
			group by
				1
			)a
		using
			(store)
		)
		, allocation_weeky as
		(
		select 
		*,
		(
		  allocation_1_ago +
		  allocation_2_ago +
		  allocation_3_ago +
		  allocation_4_ago +
		  allocation_5_ago +
		  allocation_6_ago +
		  allocation_7_ago +
		  allocation_8_ago
		) / (8.0) AS avg_8_week_allocation
		from
			(
			select 
				store
				,coalesce(sum(p.allocation_1_ago),0) as allocation_1_ago
				,coalesce(sum(p.allocation_2_ago),0) as allocation_2_ago
				,coalesce(sum(p.allocation_3_ago),0) as allocation_3_ago
				,coalesce(sum(p.allocation_4_ago),0) as allocation_4_ago
				,coalesce(sum(p.allocation_5_ago),0) as allocation_5_ago
				,coalesce(sum(p.allocation_6_ago),0) as allocation_6_ago
				,coalesce(sum(p.allocation_7_ago),0) as allocation_7_ago
				,coalesce(sum(p.allocation_8_ago),0) as allocation_8_ago 
				,coalesce(sum(p.current_week_cumulative_allocation),0) as current_week_cumulative_allocation
			from
				allocation_history p
			group by
				1
			)a
			)
--			select * from allocation_weeky
		select 
			a.store,
			b.oh,
			b.oo,
			b.it,
			b.allocated_quantity,
			b.original_forecast,
			b.lt_forecast,
			no_of_style_color_allocated,
			coalesce(c.allocation_1_ago,0) as allocation_1_ago,
			coalesce(c.allocation_2_ago,0) as allocation_2_ago,
			coalesce(c.allocation_3_ago,0) as allocation_3_ago,
			coalesce(c.allocation_4_ago,0) as allocation_4_ago,
			coalesce(c.allocation_5_ago,0) as allocation_5_ago,
			coalesce(c.allocation_6_ago,0) as allocation_6_ago,
			coalesce(c.allocation_7_ago,0) as allocation_7_ago,
			coalesce(c.allocation_8_ago,0) as allocation_8_ago,
			coalesce(c.current_week_cumulative_allocation, 0) as current_week_cumulative_allocation,
			coalesce(round(c.avg_8_week_allocation,0),0) as avg_8_week_allocation,
			round((b.allocated_quantity/NULLIF(b.no_of_style_color_allocated, 0)),0) as allocated_qty_per_style,
			coalesce(d.last_week_sale,0) as last_week_sale,
			round(coalesce(d.avg_last_8_week_sales,0)::numeric,0) as avg_last_8_week_sales
		from 
			store_base a
		left join 
			store_level b
		using
			(store)
		left join
			allocation_weeky c
		using
			(store)
		left join 
			(
			select
				store_code as store,
				sum(sales_1_ago) as last_week_sale,
				(
				  sum(sales_1_ago) +
				  sum(sales_2_ago) +
				  sum(sales_3_ago) +
				  sum(sales_4_ago) +
				  sum(sales_5_ago) +
				  sum(sales_6_ago) +
				  sum(sales_7_ago) +
				  sum(sales_8_ago)
				) / 8.0 as avg_last_8_week_sales
				from
					public.auto_allocation_summary_kpi kpi
						where exists (
						    select 1
						    from inventory_smart.dc_pack_configuration dpc
						    where dpc.product_code = kpi.product_code
						      and (
						            (p_batch_number = 1 and dpc.pack_type = 'eaches') OR
						            (p_batch_number = 2 and dpc.pack_type = 'packs')
						          )
						)
				group by
					1
			) d
		using 
			(store)
	);
--	select * from store_level_allocation_summary;
	RAISE NOTICE 'store_level_allocation_summary created successfully';

    -- =========================
    --  TABLE: SALES_ORGANIZATION_LEVEL_ALLOCATION_SUMMARY
    -- =========================
--	drop table sales_org_level_allocation_summary;
	create TEMP table sales_org_level_allocation_summary as
	(
		with dc_level_matrix as
		(
		select 
			saf.sales_org_name
			, sum(a.dc_available_to_allocate) as dc_available_to_allocate
			, sum(a.remaining_available_to_allocate) as remaining_available_to_allocate
		from	 
			dc_level_allocation_summary a
		left join 
			"global".distribution_centres dc 
		on 
			cast(a.dc_code as text) = cast(dc.dc_code as text)
		left join 
			"global".store_attributes_filter saf 
		on  
			dc.linked_store_code = saf.store_code
		group by
			1
		)
		, store_level_matrix as
		(
		select 
			saf.sales_org_name
			, sum(a.allocated_quantity) as allocated_qty_today
			, sum(a.last_week_sale) as last_week_sale
--			, sum(a.last_8_week_sale) as last_8_week_sale
			, sum(a.avg_last_8_week_sales) as avg_last_8_week_sales
			, sum(a.oh) as store_on_hand
			, sum(a.original_forecast) as wos_forecast
			, sum(a.allocation_1_ago) as last_week_allocated_qty
			, sum(a.avg_8_week_allocation) as avg_8_week_allocated_qty
			, sum(a.current_week_cumulative_allocation) as current_week_cumulative_allocation
		from	 
			store_level_allocation_summary a
		left join 
			"global".store_attributes_filter saf 
		on  
			a.store = saf.store_code
		group by 
		 1
		)
		, no_style_color as
		(
		select 
			saf.sales_org_name 
			, count(distinct case when a.packs_allocated_qty>0 then a.article end) as  no_of_styles
		from 
			auto_alloc_today a
		left join 
			"global".store_attributes_filter saf 
		on  
			a.store = saf.store_code
		group by 
			1
		)
		select * 
		    ,case
			  when  ns.no_of_styles isnull then null
		      WHEN coalesce(ns.no_of_styles,0) = 0 THEN 0
		      ELSE round((slm.allocated_qty_today::float4 / NULLIF(ns.no_of_styles,0)::float4)::integer,0)
		    END  AS allocated_qty_per_style
		from 
			store_level_matrix slm
		left join
			dc_level_matrix dlm
		using
			(sales_org_name)
		left join
			no_style_color ns
		using
			(sales_org_name)
	);
--	select * from sales_org_level_allocation_summary;
	RAISE NOTICE 'sales_org_level_allocation_summary created successfully';

	create TEMP table final_allocation_summary as
	(
	select 
	'sales_org_name' as level_type,
	a.sales_org_name::varchar                                   			AS store_name,
	coalesce(a.allocated_qty_today::varchar,'NA')::varchar                  AS allocated_qty,
	coalesce(a.last_week_allocated_qty::varchar,'NA')::varchar              AS last_week_allocated_qty,
	coalesce(a.avg_8_week_allocated_qty::varchar,'NA')::varchar             AS avg_8_week_allocated_qty,
	coalesce(a.current_week_cumulative_allocation::varchar,'NA')::varchar   AS current_week_cumulative_allocation,
	coalesce(a.dc_available_to_allocate::varchar,'NA')::varchar             AS available_to_allocate,
	coalesce(a.store_on_hand::varchar,'NA')::varchar                        AS store_on_hand,
	coalesce(a.remaining_available_to_allocate::varchar,'NA')::varchar      AS remaining_dc,
	coalesce(a.wos_forecast::varchar,'NA')::varchar                         AS wos_forecast,
	coalesce(a.no_of_styles::varchar,'NA')::varchar                         AS no_of_styles,
	coalesce(a.allocated_qty_per_style::varchar,'NA')::varchar              AS allocated_qty_per_style,
	coalesce(a.last_week_sale::varchar,'NA')::varchar                       AS last_week_sales,
	coalesce(a.avg_last_8_week_sales::varchar,'NA')::varchar                AS avg_last_8_week_sales
	from sales_org_level_allocation_summary a
	-----
	union all
	-----
	select 
	'store' as level_type,
	b.store::varchar  AS store_name,
	b.allocated_quantity::varchar  as allocated_qty,
	b.allocation_1_ago::varchar  AS last_week_allocated_qty, 
	b.avg_8_week_allocation::varchar  AS avg_8_week_allocated_qty, 
	b.current_week_cumulative_allocation::varchar AS current_week_cumulative_allocation,
	null::varchar  AS available_to_allocate,
	b.oh::varchar  AS store_on_hand, 
	null::varchar  AS remaining_dc,
	b.original_forecast::varchar  AS wos_forecast,
	b.no_of_style_color_allocated::varchar  AS no_of_styles,
	b.allocated_qty_per_style::varchar  AS allocated_qty_per_style,
	b.last_week_sale::varchar  AS last_week_sales,
	b.avg_last_8_week_sales::varchar  AS avg_last_8_week_sales
	from store_level_allocation_summary b
	-----
	union all
	-----
	select
	'dc' as level_type,
	c.dc_name::varchar  AS store_name,
	c.allocated_quantity::varchar  as allocated_qty,
	c.allocation_1_ago::varchar  AS last_week_allocated_qty,
	c.avg_8_week_allocation::varchar  AS avg_8_week_allocated_qty,
	c.current_week_cumulative_allocation::varchar AS current_week_cumulative_allocation,
	c.dc_available_to_allocate::varchar  AS available_to_allocate,
	null::varchar  AS store_on_hand,
	c.remaining_available_to_allocate::varchar AS remaining_dc, 
	null::varchar  AS wos_forecast,
	c.no_of_style_color_allocated::varchar AS no_of_styles, 
	c.allocated_qty_per_style::varchar AS allocated_qty_per_style,
	null::varchar AS last_week_sales,
	null::varchar AS avg_last_8_week_sales
	from dc_level_allocation_summary c
	);
--	select * from final_allocation_summary;
	RAISE NOTICE 'final_allocation_summary created successfully';
-- =========================
    -- RETURN FINAL RESULT
    -- =========================
   RETURN QUERY
	SELECT 
	   a.level_type::varchar, 
	   a.store_name::varchar, 
	   a.allocated_qty::varchar, 
	   a.last_week_allocated_qty::varchar, 
	   a.avg_8_week_allocated_qty::varchar, 
	   a.current_week_cumulative_allocation::varchar,
	   a.available_to_allocate::varchar, 
	   a.store_on_hand::varchar, 
	   a.remaining_dc::varchar, 
	   a.wos_forecast::varchar, 
	   a.no_of_styles::varchar, 
	   a.allocated_qty_per_style::varchar, 
	   a.last_week_sales::varchar, 
	   a.avg_last_8_week_sales::varchar
	  FROM final_allocation_summary a;
 
  RAISE NOTICE 'final_table created successfully';

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.get_auto_allocation_summary',
        'Before returning function value',
        'Function completed successfully',
        jsonb_build_object('process_date', now() AT TIME ZONE 'America/New_York')
    );

    RETURN;
END;
$function$
;
