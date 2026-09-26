--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_approve_bulk_ia_reco-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: MTP-55539

DROP FUNCTION if exists price_markdown.fn_approve_bulk_ia_reco;

CREATE OR REPLACE FUNCTION price_markdown.fn_approve_bulk_ia_reco(in_user_id integer, in_approval_filter character varying DEFAULT NULL::character varying, status_condition text DEFAULT NULL::text, action_status_condition text DEFAULT NULL::text, pcds integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(strategy_id integer, strategy_name text, min_strategy_disc_id integer, max_strategy_disc_id integer, user_id integer, insert_discount_time integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    vl_test_query text :=  '';

	filtered_strategy_ids integer[];
	start_time TIMESTAMP;
    end_time TIMESTAMP;
    total_time_taken integer;
	where_condition text := '';
	strategy_fetching_array integer[];
	_query_combine text := '';
	is_update_strategy_master integer;
begin
	start_time := clock_timestamp();

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

	vl_test_query :=  'drop table if exists tb_temp_1;';
	execute vl_test_query;
	vl_test_query:= Format('
	create temp table tb_temp_1 as (
	select
	    sd.strategy_id,
	    sd.product_level_id,
	    sd.channel_info,
	    sd.pcd_id
	from price_markdown.tb_strategy_discount as sd
	join tb_temp_final_metrics tm
	on tm.strategy_id = sd.strategy_id
		and tm.pcd_id = sd.pcd_id
		and tm.product_level_id = sd.product_level_id
		and tm.channel_info = sd.channel_info
	where sd.strategy_id = any (%1$L)
	);', strategy_fetching_array
	);
	execute vl_test_query;

	raise notice 'SQL 3 statement: %',
	vl_test_query;

	vl_test_query :=  'drop table if exists ia_approve_items;';
	execute vl_test_query;
	vl_test_query:= '
	create temp table ia_approve_items as (
	with cte_1 as (
	select
	strategy_id, product_level_id, pcd_id, channel_info,
	count(*) over (partition by strategy_id, product_level_id, channel_info) as count_1
	from tb_temp_1
	)
	select strategy_id, product_level_id, pcd_id, channel_info
	from cte_1
	where count_1 = 1
	);';
	execute vl_test_query;

	raise notice 'SQL ia_approve_items statement: %',
	vl_test_query;

	vl_test_query := 'drop table if exists input_data_1;';
	execute vl_test_query;
	vl_test_query := format('create temp table input_data_1 as (
				select tp.strategy_id, tp.product_level_id, ts.store_level_id, tp.pcd_id, ts.markdown_percentage, tp.channel_info
				from ia_approve_items tp left join price_markdown.tb_strategy_discount_ia ts
				on tp.strategy_id = ts.strategy_id and tp.product_level_id = ts.product_level_id and
				tp.channel_info = ts.channel_info and tp.pcd_id = ts.pcd_id
				where tp.strategy_id = any(%1$L)
			);',
	strategy_fetching_array);

	execute vl_test_query;
	raise notice 'SQL input_data_1 statement: %',
	vl_test_query;

	vl_test_query := 'drop table if exists temp_1;';

	execute vl_test_query;

	vl_test_query := Format('
						create temp table temp_1 as (
						select
						    sd.strategy_id,
						    sd.product_level_id,
						    sd.store_level_id,
						    sd.pcd_id,
						    sd.channel_info,
							--''Finally Approved''::price_markdown.strategy_approval_status_enum as approval_status,
							--''Accepted IA reco''::price_markdown.action_status_enum as action_status,
						   	input_data.markdown_percentage as markdown_percentage,
						    spcd.pcd_start_date
						from price_markdown.tb_strategy_discount as sd
						join input_data_1 as input_data
						    on
						    sd.strategy_id = input_data.strategy_id
						    and sd.product_level_id = input_data.product_level_id
						    and sd.pcd_id = input_data.pcd_id
						and sd.store_level_id = input_data.store_level_id
						join price_markdown.tb_strategy_pcd as spcd
						    on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
						where sd.strategy_id = ANY(%L) and input_data.markdown_percentage is not null
						);',
	strategy_fetching_array
					);

	execute vl_test_query;

	raise notice 'SQL 2 statement: %',
	vl_test_query;

	vl_test_query := 'drop table if exists tb_temp_2;';

	execute vl_test_query;

	vl_test_query:= Format('
		create temp table tb_temp_2 as (
		with cte_1 as (
		select
		    sd.strategy_id,
		    sd.product_level_value,
		    sd.store_level_value,
		    sd.pcd_id,
			spcd.pcd_start_date as spcd_pcd_start_date,
		    temp_1.pcd_start_date as temp_1_pcd_start_date,
		    case when spcd.pcd_start_date > temp_1.pcd_start_date then
			greatest (
		        sd.markdown_percentage,
		        temp_1.markdown_percentage
		    )
			when spcd.pcd_start_date = temp_1.pcd_start_date then temp_1.markdown_percentage
			else sd.markdown_percentage end as markdown_percentage,
			sd.markdown_percentage as original_markdown_percentage,
		    sd.is_locked,
		    sd.created_at,
		    now() as updated_at,
		    sd.created_by,
		    %2$L as updated_by,
		    sd.product_level_id,
		    sd.store_level_id,
		    sd.id,
		    sd.approval_status as approval_status_1,
			sd.action_status as action_status_1,
		    lag(sd.pcd_id) over (
		        partition by sd.strategy_id, sd.product_level_id, sd.store_level_id order by spcd.pcd_start_date
		    ) as previous_pcd_id,
		    sd.channel_info,
		    sd.average_retail_price,
			--sd.markdown_type
			rank() over (
				partition by
				sd.strategy_id, sd.product_level_id, sd.store_level_id
				order by case when spcd.pcd_start_date > temp_1.pcd_start_date then
			greatest (
		        sd.markdown_percentage,
		        temp_1.markdown_percentage
		    )
			when spcd.pcd_start_date = temp_1.pcd_start_date then temp_1.markdown_percentage
			else sd.markdown_percentage end) as rank_md
		from price_markdown.tb_strategy_discount as sd
		join temp_1
		on
		    sd.strategy_id = temp_1.strategy_id
		    and sd.product_level_id = temp_1.product_level_id
		    and sd.store_level_id  = temp_1.store_level_id
		join price_markdown.tb_strategy_pcd as spcd
		on sd.strategy_id = spcd.strategy_id and sd.pcd_id = spcd.pcd_id
		where sd.strategy_id = ANY(%1$L)
		)
		select * from (
			select *,
			coalesce(
		        lag(markdown_percentage) over (
		            partition by strategy_id, product_level_id, store_level_id order by spcd_pcd_start_date), 0
		    ) as previous_markdown_percentage,
			price_markdown.fn_get_incremental_discount(
		        markdown_percentage,
		        coalesce(
		            lag(markdown_percentage) over (
		                partition by strategy_id, product_level_id, store_level_id order by spcd_pcd_start_date), 0
		        )
		    ) as incremental_discount,
			case
				when rank_md = 1 then ''First Markdown''
				else ''Final Sale Price''
			end as markdown_type,
		case
				when spcd_pcd_start_date = temp_1_pcd_start_date then ''Finally Approved''::price_markdown.strategy_approval_status_enum
				when spcd_pcd_start_date > temp_1_pcd_start_date and original_markdown_percentage <> markdown_percentage then ''Initially Approved''::price_markdown.strategy_approval_status_enum
				else approval_status_1
			end as approval_status,
			case
				when spcd_pcd_start_date = temp_1_pcd_start_date then ''Accepted IA reco''::price_markdown.action_status_enum
				else action_status_1
			end as action_status
	from cte_1) temp_1
		where spcd_pcd_start_date >= temp_1_pcd_start_date
		--order by 1,2,4, spcd.pcd_start_date
		);', strategy_fetching_array, in_user_id
		);
		execute vl_test_query;

	raise notice 'SQL 3 statement: %',
	vl_test_query;

	vl_test_query := 'DELETE FROM price_markdown.tb_strategy_discount where id in (select id from tb_temp_2);';

	execute vl_test_query;

	vl_test_query :=  'drop table if exists tb_temp_3;';
		execute vl_test_query;
		vl_test_query:= Format('
		create temp table tb_temp_3 as (
		with new_data as (
			INSERT INTO price_markdown.tb_strategy_discount (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type)
			select strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by::int, product_level_id, store_level_id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, action_status, markdown_type
			from tb_temp_2
			RETURNING
			strategy_id, id)
		select
		new_data.strategy_id,
		min(sm.strategy_name) as strategy_name,
		min(new_data.id) as min_strategy_disc_id,
		max(new_data.id) as max_strategy_disc_id,
		%1$L::int as user_id
		from new_data
		join price_markdown.tb_strategy_master as sm
		using(strategy_id)
		group by 1);', in_user_id);
		execute vl_test_query;
		RAISE NOTICE 'SQL 5 statement: %', vl_test_query;

		end_time := clock_timestamp();

		total_time_taken := round(EXTRACT(second FROM (end_time - start_time)));
		RAISE NOTICE 'Time taken SQL 2-B statement: %', total_time_taken;

		SELECT EXISTS (SELECT id FROM tb_temp_2)::int into is_update_strategy_master;

		if is_update_strategy_master = 1 then
			vl_test_query := Format(
			'update
			    price_markdown.tb_strategy_master ts
			set
			    status = 2,
				updated_at = now(),
				updated_by = %2$L::integer
			where
			    ts.strategy_id = ANY(%1$L)
				and ts.status not in (3)',
			strategy_fetching_array, in_user_id
		        );

			execute vl_test_query;
			raise notice 'SQL 6 statement: %',
			vl_test_query;

		end if;

		_query_combine := format('select
		tb_temp_3.*,
		%1$L::int as insert_discount_time
		from tb_temp_3', total_time_taken);
		return query execute _query_combine;

END;
$function$
;
