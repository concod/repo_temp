--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_approve_withdraw_bulk_edit-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Added active strategy check to update the strategy master table

DROP FUNCTION if exists price_markdown.fn_approve_withdraw_bulk_edit;

CREATE OR REPLACE FUNCTION price_markdown.fn_approve_withdraw_bulk_edit(cta_action text, in_user_id integer, in_approval_filter character varying DEFAULT NULL::character varying, status_condition text DEFAULT NULL::text, action_status_condition text DEFAULT NULL::text, pcds integer[] DEFAULT NULL::integer[])
 RETURNS integer[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text :=  '';
   	
	filtered_strategy_ids integer[];
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	where_condition text := '';
	strategy_fetching_array integer[];
begin

		vl_test_query := format('select array(select distinct am.strategy_id from
									price_markdown.tb_approval_metrics am
								where
									pcd_id = any(%1$L) %2$s %3$s)',
									pcds, status_condition, action_status_condition);
	RAISE NOTICE 'query 1: %', vl_test_query;
		execute vl_test_query into strategy_fetching_array;
		where_condition := format('am.pcd_id = any(array[%1$s]) %2$s %3$s',array_to_string(pcds, ',') , status_condition, action_status_condition);
	
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
					select product_level_id, min(product_level_value) as product_level_value
					from price_markdown.tb_strategy_sku_store_mapping
					where strategy_id = any (%2$L)
					group by 1
					) level_mapping
			using(product_level_id)
			inner join (
			select
				strategy_id , pcd_id, product_level_id, channel_info
			from
				price_markdown.tb_strategy_discount
			where
				strategy_id = any (%2$L)
				group by 1,2,3,4
			) tsd
			on tsd.strategy_id  = am.strategy_id
			and tsd.pcd_id = am.pcd_id
			and tsd.channel_info = am.channel_info
			and tsd.product_level_id = am.product_level_id
			where %1$s and am.strategy_id = any(%2$L)
			);',where_condition, strategy_fetching_array);

		RAISE NOTICE 'SQL 2 statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

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
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

vl_test_query :=  'drop table if exists tb_temp_1;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_1 as (
	select
	    sd.strategy_id,
	    sd.product_level_value,
	    sd.store_level_value,
	    sd.pcd_id,
		sd.markdown_percentage,
	    sd.is_locked,
	    sd.created_at,
	    now() as updated_at,
	    sd.created_by,
	    %2$L as updated_by,
	    sd.product_level_id,
	    sd.store_level_id,
	    sd.id,
		sd.previous_markdown_percentage,
		sd.incremental_discount,
	    case when ''%3$s'' = ''approve'' then
			''Finally Approved''::price_markdown.strategy_approval_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Initially Approved''::price_markdown.strategy_approval_status_enum
		end as approval_status,
		sd.previous_pcd_id,
		sd.channel_info,
	    sd.average_retail_price,
		case when ''%3$s'' = ''approve'' then
			''Approved''::price_markdown.action_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Withdrawn''::price_markdown.action_status_enum
		end as action_status,
		sd.markdown_type
	from price_markdown.tb_strategy_discount as sd
	join tb_temp_final_metrics tm
	on tm.strategy_id = sd.strategy_id
		and tm.pcd_id = sd.pcd_id
		and tm.product_level_id = sd.product_level_id
		and tm.channel_info = sd.channel_info
	where sd.strategy_id = any (%1$L)
		and sd.approval_status = case when ''%3$s'' = ''approve'' then
			''Initially Approved''::price_markdown.strategy_approval_status_enum
		when ''%3$s'' = ''withdraw'' then
			''Finally Approved''::price_markdown.strategy_approval_status_enum
		end
	);', strategy_fetching_array, in_user_id, cta_action
	);
	execute vl_test_query;

	raise notice 'SQL 3 statement: %',
	vl_test_query;

	vl_test_query := 'DELETE FROM price_markdown.tb_strategy_discount where id in (select id from tb_temp_1);';

	raise notice 'SQL 4 statement: %',
	vl_test_query;

	execute vl_test_query;


	vl_test_query := '
			INSERT INTO price_markdown.tb_strategy_discount (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type)
			select strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by::int, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type
			from tb_temp_1;';
	raise notice 'SQL 5 statement: %',
	vl_test_query;

	execute vl_test_query;

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
		am.updated_at
	from price_markdown.tb_approval_metrics as am
	join tb_temp_final_metrics tm
	on tm.strategy_id = am.strategy_id
		and tm.pcd_id = am.pcd_id
		and tm.product_level_id = am.product_level_id
		and tm.channel_info = am.channel_info
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
						  and price_markdown.tb_approval_metrics.channel_info = tb_temp_2.channel_info
						  and price_markdown.tb_approval_metrics.product_level_id = tb_temp_2.product_level_id;
					';

	raise notice 'SQL 4 statement: %',
	vl_test_query;

	execute vl_test_query;

	vl_test_query := '
			INSERT INTO price_markdown.tb_approval_metrics (strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, ia_markdown_type, fin_markdown_type, stores_with_inventory, status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount, ia_pcd_price, fin_pcd_price, ia_incremental_discount, fin_incremental_discount, ia_previous_pcd_price, fin_previous_pcd_price, ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin, ia_gm_percent, fin_gm_percent, ia_sellthrough, fin_sellthrough, ia_aum, fin_aum, ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type, fin_previous_markdown_type, pcd_number, dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, age, updated_at)
			select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, ia_markdown_type, fin_markdown_type, stores_with_inventory, status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount, ia_pcd_price, fin_pcd_price, ia_incremental_discount, fin_incremental_discount, ia_previous_pcd_price, fin_previous_pcd_price, ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin, ia_gm_percent, fin_gm_percent, ia_sellthrough, fin_sellthrough, ia_aum, fin_aum, ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type, fin_previous_markdown_type, pcd_number, dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, age, updated_at
			from tb_temp_2;';
	raise notice 'SQL 5 statement: %',
	vl_test_query;

	execute vl_test_query;


if cta_action = 'approve' then

	vl_test_query := format('update
						price_markdown.tb_strategy_master
					set
						status = 2
					where
						strategy_id = any(%1$L) and status not in (3) ;', strategy_fetching_array);

	execute vl_test_query;

elsif cta_action = 'withdraw' then

	vl_test_query := format('with strategy_approval_status as (
					    select
					        ta.strategy_id,
					        max(case when ta.status = ''Finally Approved''::price_markdown.strategy_approval_status_enum then 1 else 0 end) AS has_final_approval
					    from
					        price_markdown.tb_approval_metrics ta
					    where strategy_id = any(%1$L)
					    group by
					        ta.strategy_id
					)
					update
					    price_markdown.tb_strategy_master ts
					set
					    status = case
					                when sas.has_final_approval = 1 then 2
					                else 1
					             end
					from
					    strategy_approval_status sas
					where
					    ts.strategy_id = sas.strategy_id
						and ts.status not in (3)
					;', strategy_fetching_array);
	execute vl_test_query;

end if;

return strategy_fetching_array;

END;
$function$
;
