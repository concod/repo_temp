--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_approve_withdraw_bulk_edit-2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Updated to use p_hierarchy_filters JSONB parameter and fn_build_hierarchy_filters function

DROP FUNCTION if exists price_markdown.fn_approve_withdraw_bulk_edit;

CREATE OR REPLACE FUNCTION price_markdown.fn_approve_withdraw_bulk_edit(
    _strategy_id integer[],
    currency_ids integer[],
    _start_date date,
    _end_date date,
    in_user_id integer,
    cta_action text,
    is_dd_filters boolean DEFAULT false,
    in_approval_filter character varying DEFAULT NULL::character varying,
    status_condition text DEFAULT NULL::text,
    action_status_condition text DEFAULT NULL::text,
    pcds integer[] DEFAULT NULL::integer[],
    exclusion_combinations jsonb DEFAULT NULL::jsonb,
    p_hierarchy_filters jsonb DEFAULT NULL::jsonb
)
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text :=  '';
	filtered_strategy_ids integer[];
	strategy_where_arr text[];
	where_condition text := '';
	strategy_fetching_array integer[];
	curr_timezone text := '';
	
	-- Hierarchy filter conditions
	hierarchy_where_conditions text[];
begin
	vl_test_query := 'drop table if exists exclusion_combination_1;';
	execute vl_test_query;

	IF exclusion_combinations IS NOT NULL THEN
		vl_test_query := Format(
			'create temp table exclusion_combination_1 as (
			select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, store_level_id int, pcd_id int)
			)', exclusion_combinations);
		RAISE NOTICE 'exclusion query 1: %', vl_test_query;
		execute vl_test_query;
	ELSE
		vl_test_query := 'create temp table exclusion_combination_1 as (
			select null::int as strategy_id, null::int as product_level_id, null::int as store_level_id, null::int as pcd_id
			where false
		);';
		execute vl_test_query;
	    RAISE NOTICE 'exclusion query 2: %', vl_test_query;
	END IF;

	vl_test_query := 'select remarks from metaschema.tb_app_sub_master where name = ''client_timezone''';
	execute vl_test_query into curr_timezone;

	if is_dd_filters is true then
		vl_test_query := format('select array(select distinct am.strategy_id from
									price_markdown.tb_approval_metrics am
								where
									pcd_id = any(%1$L) %2$s %3$s)',
									pcds, status_condition, action_status_condition);
	    RAISE NOTICE 'query 1: %', vl_test_query;
		execute vl_test_query into strategy_fetching_array;
		where_condition := format('am.pcd_id = any(array[%1$s]) %2$s %3$s',array_to_string(pcds, ',') , status_condition, action_status_condition);
	else
		if array_length(_strategy_id, 1) > 0 then
			filtered_strategy_ids := _strategy_id;
		else
			-- Build dynamic hierarchy conditions using the new function
			SELECT strategy_where_conditions
			INTO hierarchy_where_conditions
			FROM price_markdown.fn_build_hierarchy_filters(p_hierarchy_filters);

			-- Add hierarchy conditions to strategy_where_arr if any exist
			IF array_length(hierarchy_where_conditions, 1) > 0 THEN
				strategy_where_arr := strategy_where_arr || hierarchy_where_conditions;
			END IF;

			vl_test_query := format('select
									array_agg(sm.strategy_id)
								from
									price_markdown.tb_strategy_master sm
								where
									sm.status in (1,2,3)
									and sm.start_date <= ''%2$s''::date
									and sm.end_date >= ''%1$s''::date
									%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' ')
								);
			execute vl_test_query into filtered_strategy_ids;
		end if;
		where_condition := format('am.strategy_id = any(array[%1$s]) and pcd_start_date > date(timezone(''%2$s'', now())) %3$s %4$s', array_to_string(filtered_strategy_ids, ','), curr_timezone, status_condition, action_status_condition);
		strategy_fetching_array := filtered_strategy_ids;
	end if;
	RAISE NOTICE 'where clause: %', where_condition;

	vl_test_query :=  'drop table if exists tb_tmp_metrics;';
	  execute vl_test_query;

	  vl_test_query:= format('create temp table tb_tmp_metrics as
			(
			select
			am.strategy_id,
			sm.strategy_name,
			am.pcd_id,
			pcd_start_date,
			pcd_end_date,
			level_mapping.product_level_value,
			am.product_level_id,
			am.channel_info,
			level_mapping.store_level_value,
			level_mapping.store_level_id,
			stores_with_inventory,
			am.status,
			am.action_status,
			am.pcd_number,
			am.dept,
			am.class,
			am.brand,
			am.mfg,
			am.base_price,
			am.age,
			am.updated_at,
			-- fin
			round(fin_units) as fin_sales_units,
			round(fin_revenue::numeric,2) as fin_revenue_$,
			round(fin_margin::numeric,2) as fin_gm_$,
			round(fin_gm_percent::numeric,2) as fin_gm_percent,
			round(fin_aum::numeric,2) as fin_aum_$,
			round(fin_sellthrough::numeric,2) as fin_st_percent,
			round(fin_markdown_spend) as fin_markdown_$,
			round(fin_inventory) as fin_inventory,
			fin_discount,
			fin_incremental_discount,
			fin_previous_discount,
			fin_pcd_price,
			fin_previous_pcd_price,
			fin_markdown_type,
			fin_previous_markdown_type,
			fin_inventory_cost,
			-- IA
			round(ia_units) as ia_sales_units,
			round(ia_revenue::numeric,2) as ia_revenue_$,
			round(ia_margin::numeric,2) as ia_gm_$,
			round(ia_gm_percent::numeric,2) as ia_gm_percent,
			round(ia_aum::numeric,2) as ia_aum_$,
			round(ia_sellthrough::numeric,2) as ia_st_percent,
			round(ia_markdown_spend) as ia_markdown_$,
			round(ia_inventory) as ia_inventory,
			ia_discount,
			ia_incremental_discount,
			ia_previous_discount,
			ia_pcd_price,
			ia_previous_pcd_price,
			ia_markdown_type,
			ia_previous_markdown_type,
			ia_inventory_cost
			from price_markdown.tb_approval_metrics am
			inner join
			price_markdown.tb_strategy_master sm
			using (strategy_id)
			inner join (
					select product_level_id,store_level_id, min(product_level_value) as product_level_value, min(store_level_value) as store_level_value
					from price_markdown.tb_strategy_sku_store_mapping
					where strategy_id = any (%2$L)
					group by 1,2
					) level_mapping
			using(product_level_id, store_level_id)
			inner join (
			select
				sdl.strategy_id, tsp.pcd_id, sdl.product_level_id, sdl.store_level_id
			from
				price_markdown.tb_strategy_discount_level sdl
			cross join lateral jsonb_each(sdl.pcd_data) as pcd_entry(key, value)
			join price_markdown.tb_strategy_pcd_new tsp
				on sdl.strategy_id = tsp.strategy_id and tsp.order_number = pcd_entry.key::int
			where
				sdl.strategy_id = any (%2$L)
				group by 1,2,3,4
			) tsd
			on tsd.strategy_id  = am.strategy_id
			and tsd.pcd_id = am.pcd_id
			and tsd.store_level_id = am.store_level_id
			and tsd.product_level_id = am.product_level_id
			where %1$s and am.strategy_id = any(%2$L)
			AND NOT EXISTS (
				SELECT 1
				FROM exclusion_combination_1 as excl
				WHERE excl.strategy_id = am.strategy_id
					AND excl.pcd_id = am.pcd_id
					AND excl.store_level_id = am.store_level_id
					AND excl.product_level_id = am.product_level_id
			    )
			);',where_condition, strategy_fetching_array);

		RAISE NOTICE 'SQL 2 statement: %', vl_test_query;
		execute vl_test_query;

	vl_test_query :=  'drop table if exists tb_temp_final_metrics;';
	  execute vl_test_query;

	  vl_test_query:= format('create temp table tb_temp_final_metrics as
			(
			select
				*
			from
				tb_tmp_metrics tm
			%1$s
			);',in_approval_filter);

		RAISE NOTICE 'SQL tb_temp_final_metrics statement: %', vl_test_query;
		execute vl_test_query;

	-- Update tb_strategy_discount_level: JSONB merge for matching PCDs
	vl_test_query := format('
		with matched_pcds as (
			select
				sdl.strategy_id,
				sdl.product_level_id,
				sdl.store_level_id,
				pcd_entry.key as pcd_order_key,
				pcd_entry.value as pcd_value
			from price_markdown.tb_strategy_discount_level sdl
			cross join lateral jsonb_each(sdl.pcd_data) as pcd_entry(key, value)
			join price_markdown.tb_strategy_pcd_new tsp
				on sdl.strategy_id = tsp.strategy_id and tsp.order_number = pcd_entry.key::int
			join tb_temp_final_metrics tm
				on sdl.strategy_id = tm.strategy_id
				and sdl.product_level_id = tm.product_level_id
				and sdl.store_level_id = tm.store_level_id
				and tsp.pcd_id = tm.pcd_id
			where (pcd_entry.value->>''approval_status'') = case when ''%3$s'' = ''approve'' then ''Initially Approved''
				when ''%3$s'' = ''withdraw'' then ''Finally Approved'' end
				and sdl.strategy_id = ANY(%2$L)
		),
		aggregated as (
			select
				strategy_id,
				product_level_id,
				store_level_id,
				jsonb_object_agg(
					pcd_order_key,
					pcd_value || jsonb_build_object(
						''approval_status'', case when ''%3$s'' = ''approve'' then ''Finally Approved''
							when ''%3$s'' = ''withdraw'' then ''Initially Approved'' end,
						''action_status'', case when ''%3$s'' = ''approve'' then ''Approved''
							when ''%3$s'' = ''withdraw'' then ''Withdrawn'' end,
						''sim_flag'', 1
					)
				) as pcd_data_update
			from matched_pcds
			group by strategy_id, product_level_id, store_level_id
		)
		update price_markdown.tb_strategy_discount_level sdl
		set
			pcd_data = sdl.pcd_data || agg.pcd_data_update,
			updated_at = now(),
			updated_by = %1$L::integer
		from aggregated agg
		where sdl.strategy_id = agg.strategy_id
			and sdl.product_level_id = agg.product_level_id
			and sdl.store_level_id = agg.store_level_id;', in_user_id, strategy_fetching_array, cta_action);

	raise notice 'SQL tb_strategy_discount_level update: %',
	vl_test_query;
	execute vl_test_query;

	-- tb_temp_2: Update tb_approval_metrics (existing logic preserved)
	vl_test_query :=  'drop table if exists tb_temp_2;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_2 as (
	select
		am.strategy_id,
		am.product_level_id,
		am.pcd_id,
		am.pcd_start_date,
		am.pcd_end_date,
		am.channel_info,
		am.store_level_id,
		am.ia_markdown_type,
		am.fin_markdown_type,
		am.stores_with_inventory,
		case when ''%3$s'' = ''approve'' then
			''Finally Approved''::price_markdown.strategy_approval_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Initially Approved''::price_markdown.strategy_approval_status_enum
		end as status,
		am.ia_discount,
		am.fin_discount,
		am.ia_previous_discount,
		am.fin_previous_discount,
		am.ia_pcd_price,
		am.fin_pcd_price,
		am.ia_incremental_discount,
		am.fin_incremental_discount,
		am.ia_previous_pcd_price,
		am.fin_previous_pcd_price,
		am.ia_units,
		am.fin_units,
		am.ia_revenue,
		am.fin_revenue,
		am.ia_margin,
		am.fin_margin,
		am.ia_gm_percent,
		am.fin_gm_percent,
		am.ia_sellthrough,
		am.fin_sellthrough,
		am.ia_aum,
		am.fin_aum,
		am.ia_markdown_spend,
		am.fin_markdown_spend,
		am.ia_inventory,
		am.fin_inventory,
		case when ''%3$s'' = ''approve'' then
			''Approved''::price_markdown.action_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Withdrawn''::price_markdown.action_status_enum
		end as action_status,
		am.ia_previous_markdown_type,
		am.fin_previous_markdown_type,
		am.pcd_number,
		am.dept,
		am."class",
		am.brand,
		am.mfg,
		am.base_price,
		am.ia_inventory_cost,
		am.fin_inventory_cost,
		am.age,
		am.updated_at,
		am.currency_id,
		am.ia_pcd_price_with_vat,
		am.fin_pcd_price_with_vat,
		am.ia_previous_pcd_price_with_vat,
		am.fin_previous_pcd_price_with_vat,
		am.ia_revenue_with_vat,
		am.fin_revenue_with_vat,
		am.ia_margin_with_vat,
		am.fin_margin_with_vat,
		am.ia_aum_with_vat,
		am.fin_aum_with_vat,
		am.ia_markdown_spend_with_vat,
		am.fin_markdown_spend_with_vat,
		am.base_price_with_vat,
		am.sub_dept
	from price_markdown.tb_approval_metrics as am
	join tb_temp_final_metrics tm
	on tm.strategy_id = am.strategy_id
		and tm.pcd_id = am.pcd_id
		and tm.product_level_id = am.product_level_id
		and tm.store_level_id = am.store_level_id
	where am.strategy_id = any (%1$L)
		and am.status = case when ''%3$s'' = ''approve'' then
			''Initially Approved''::price_markdown.strategy_approval_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Finally Approved''::price_markdown.strategy_approval_status_enum
		end
	);', strategy_fetching_array, in_user_id, cta_action
	);
	raise notice 'SQL 6 statement: %',
	vl_test_query;
	execute vl_test_query;

	vl_test_query := 'delete from price_markdown.tb_approval_metrics
						using tb_temp_2
						where price_markdown.tb_approval_metrics.strategy_id = tb_temp_2.strategy_id
						  and price_markdown.tb_approval_metrics.pcd_id = tb_temp_2.pcd_id
						  and price_markdown.tb_approval_metrics.store_level_id = tb_temp_2.store_level_id
						  and price_markdown.tb_approval_metrics.product_level_id = tb_temp_2.product_level_id;
					';

	raise notice 'SQL approval_metrics delete: %',
	vl_test_query;

	execute vl_test_query;

	vl_test_query := '
			INSERT INTO price_markdown.tb_approval_metrics (strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, store_level_id, ia_markdown_type, fin_markdown_type, stores_with_inventory, status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount, ia_pcd_price, fin_pcd_price, ia_incremental_discount, fin_incremental_discount, ia_previous_pcd_price, fin_previous_pcd_price, ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin, ia_gm_percent, fin_gm_percent, ia_sellthrough, fin_sellthrough, ia_aum, fin_aum, ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type, fin_previous_markdown_type, pcd_number, dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, age, updated_at, currency_id, ia_pcd_price_with_vat, fin_pcd_price_with_vat, ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat, ia_revenue_with_vat, fin_revenue_with_vat, ia_margin_with_vat, fin_margin_with_vat, ia_aum_with_vat, fin_aum_with_vat, ia_markdown_spend_with_vat, fin_markdown_spend_with_vat, base_price_with_vat, sub_dept)
			select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, store_level_id, ia_markdown_type, fin_markdown_type, stores_with_inventory, status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount, ia_pcd_price, fin_pcd_price, ia_incremental_discount, fin_incremental_discount, ia_previous_pcd_price, fin_previous_pcd_price, ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin, ia_gm_percent, fin_gm_percent, ia_sellthrough, fin_sellthrough, ia_aum, fin_aum, ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type, fin_previous_markdown_type, pcd_number, dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, age, updated_at, currency_id, ia_pcd_price_with_vat, fin_pcd_price_with_vat, ia_previous_pcd_price_with_vat, fin_previous_pcd_price_with_vat, ia_revenue_with_vat, fin_revenue_with_vat, ia_margin_with_vat, fin_margin_with_vat, ia_aum_with_vat, fin_aum_with_vat, ia_markdown_spend_with_vat, fin_markdown_spend_with_vat, base_price_with_vat, sub_dept
			from tb_temp_2;';
	raise notice 'SQL approval_metrics insert: %',
	vl_test_query;

	execute vl_test_query;

if cta_action = 'approve' then

	vl_test_query := format('update
						price_markdown.tb_strategy_master
					set
						status = 2,
						updated_at = now(),
						updated_by = %2$L::integer
					where
						strategy_id = any(%1$L) and status not in (3) ;', strategy_fetching_array, in_user_id);

	execute vl_test_query;

elsif cta_action = 'withdraw' then

	-- Update tb_strategy_master status based on remaining approval_status in pcd_data
	vl_test_query := format('
		with strategy_approval_status as (
			select
				sdl.strategy_id,
				max((pcd_entry.value->>''approval_status'')::text) as has_final_approval
			from
				price_markdown.tb_strategy_discount_level sdl
			cross join lateral jsonb_each(sdl.pcd_data) as pcd_entry(key, value)
			where
				sdl.strategy_id = ANY(%1$L)
			group by
				1
		)
		update
			price_markdown.tb_strategy_master ts
		set
			status = case
				when sas.has_final_approval = ''Finally Approved'' then 2
				else 1
			end,
			updated_at = now(),
			updated_by = %2$L::integer
		from
			strategy_approval_status sas
		where
			ts.strategy_id = sas.strategy_id
			and ts.status not in (3);', strategy_fetching_array, in_user_id);
	execute vl_test_query;

end if;

return strategy_fetching_array;

END;
$function$
;
