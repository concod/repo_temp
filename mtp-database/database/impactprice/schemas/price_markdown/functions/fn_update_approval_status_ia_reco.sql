--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_update_approval_status_ia_reco-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-55539

DROP FUNCTION if exists price_markdown.fn_update_approval_status_ia_reco;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_approval_status_ia_reco(payload jsonb, in_user_id integer)
 RETURNS TABLE(strategy_id integer, strategy_name text, min_strategy_disc_id integer, max_strategy_disc_id integer, user_id integer, insert_discount_time integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	strategy_ids integer[];
	temp_query text := '';
	start_time TIMESTAMP;
	end_time TIMESTAMP;
	total_time_taken integer;
	_query_combine text := '';

begin
	start_time := clock_timestamp();

	-- Step 1: Parse input payload
	temp_query := 'drop table if exists tmp_payload;';
	execute temp_query;

	temp_query := Format(
		'create temp table tmp_payload as (
		select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, store_level_id int, pcd_id int)
		)', payload);
	execute temp_query;

	raise notice 'SQL 1 statement: %',
	temp_query;

	temp_query := 'select array_agg(distinct strategy_id) from tmp_payload';

	execute temp_query
	into strategy_ids;

	-- Step 1b: Join payload with ia_pcd_data from tb_strategy_discount_level to get IA-recommended markdown_percentage
	temp_query := 'drop table if exists input_data_1;';
	execute temp_query;

	temp_query := format('create temp table input_data_1 as (
				select
					tp.strategy_id,
					tp.product_level_id,
					sdl.store_level_id,
					tp.pcd_id,
					(ia_pcd_entry.value->>''ia_markdown_percentage'')::float8 as markdown_percentage
				from tmp_payload tp
				join price_markdown.tb_strategy_discount_level sdl
					on tp.strategy_id = sdl.strategy_id
					and tp.product_level_id = sdl.product_level_id
					and tp.store_level_id = sdl.store_level_id
				cross join lateral jsonb_each(sdl.ia_pcd_data) as ia_pcd_entry(key, value)
				join price_markdown.tb_strategy_pcd_new tsp
					on sdl.strategy_id = tsp.strategy_id
					and tsp.order_number = ia_pcd_entry.key::int
				where tp.strategy_id = any(%1$L)
					and tsp.pcd_id = tp.pcd_id
			);',
	strategy_ids);
	execute temp_query;

	-- Step 2: tb_temp_int - Unnest pcd_data from tb_strategy_discount_level with PCD ranking
	temp_query := 'drop table if exists tb_temp_int;';
	execute temp_query;

	temp_query := Format('
		create temp table tb_temp_int as (
			select
				sdl.strategy_id,
				sdl.product_level_id,
				sdl.store_level_id,
				tsp.pcd_id,
				pcd_entry.key as pcd_order_key,
				(pcd_entry.value->>''markdown_percentage'')::float8 as markdown_percentage,
				(pcd_entry.value->>''previous_markdown_percentage'')::float8 as previous_markdown_percentage,
				(pcd_entry.value->>''is_locked'')::int as is_locked,
				coalesce(pcd_entry.value->>''approval_status'', ''Not Approved'') as approval_status,
				coalesce(pcd_entry.value->>''action_status'', ''No Action'') as action_status,
				(pcd_entry.value->>''average_retail_price'')::float8 as average_retail_price,
				(pcd_entry.value->>''average_retail_price_with_vat'')::float8 as average_retail_price_with_vat,
				coalesce((pcd_entry.value->>''sim_flag'')::int, 0) as sim_flag,
				pcd_entry.value->>''markdown_type'' as markdown_type,
				(pcd_entry.value->>''incremental_discount'')::float8 as incremental_discount,
				sdl.channel_info,
				sdl.currency_id,
				sdl.created_at,
				sdl.created_by,
				row_number() over (
					partition by
					sdl.strategy_id, sdl.product_level_id, sdl.store_level_id
					order by pcd_entry.key::int) as rank_1
			from price_markdown.tb_strategy_discount_level as sdl
			cross join lateral jsonb_each(sdl.pcd_data) as pcd_entry(key, value)
			join price_markdown.tb_strategy_pcd_new as tsp
				on sdl.strategy_id = tsp.strategy_id and tsp.order_number = pcd_entry.key::int
			where sdl.strategy_id = ANY(%1$L)
		);',
		strategy_ids
	);

	execute temp_query;

	raise notice 'SQL 2 statement: %',
	temp_query;

	-- Step 3: temp_1 - Identify IA reco rows from input (with IA-recommended markdown_percentage)
	temp_query := 'drop table if exists temp_1;';
	execute temp_query;

	temp_query := Format('
		create temp table temp_1 as (
			select
				ti.strategy_id,
				ti.product_level_id,
				ti.store_level_id,
				ti.pcd_id,
				ti.pcd_order_key,
				input_data.markdown_percentage as markdown_percentage
			from tb_temp_int as ti
			join input_data_1 as input_data
				on ti.strategy_id = input_data.strategy_id
				and ti.product_level_id = input_data.product_level_id
				and ti.pcd_id = input_data.pcd_id
				and ti.store_level_id = input_data.store_level_id
			where ti.strategy_id = ANY(%1$L) and input_data.markdown_percentage is not null
		);',
		strategy_ids
	);
	execute temp_query;

	raise notice 'SQL 3 statement: %',
	temp_query;

	-- Step 4: tb_temp_2 - Recalculate all affected PCDs from IA reco PCD onward
	temp_query := 'drop table if exists tb_temp_2;';
	execute temp_query;

	temp_query := Format('
	create temp table tb_temp_2 as (
	with cte_1 as (
	select
		ti.strategy_id,
		ti.product_level_id,
		ti.store_level_id,
		ti.pcd_id,
		ti.pcd_order_key,
		ti.pcd_order_key::int as pcd_order_int,
		temp_1.pcd_order_key::int as temp_1_pcd_order_int,
		case when ti.pcd_order_key::int > temp_1.pcd_order_key::int then
			case when coalesce(sm.is_hard_markdown, false) then
				greatest(
					ti.markdown_percentage,
					temp_1.markdown_percentage
				)
			else
				ti.markdown_percentage
			end
		when ti.pcd_order_key::int = temp_1.pcd_order_key::int then temp_1.markdown_percentage
		else ti.markdown_percentage end as markdown_percentage,
		ti.markdown_percentage as original_markdown_percentage,
		ti.is_locked,
		ti.average_retail_price,
		ti.average_retail_price_with_vat,
		ti.approval_status as approval_status_1,
		ti.action_status as action_status_1,
		ti.sim_flag,
		rank() over (
			partition by
			ti.strategy_id, ti.product_level_id, ti.store_level_id
			order by case when ti.pcd_order_key::int > temp_1.pcd_order_key::int then
				case when coalesce(sm.is_hard_markdown, false) then
					greatest(
						ti.markdown_percentage,
						temp_1.markdown_percentage
					)
				else
					ti.markdown_percentage
				end
			when ti.pcd_order_key::int = temp_1.pcd_order_key::int then temp_1.markdown_percentage
			else ti.markdown_percentage end) as rank_md
	from tb_temp_int as ti
	join temp_1
		on ti.strategy_id = temp_1.strategy_id
		and ti.product_level_id = temp_1.product_level_id
		and ti.store_level_id = temp_1.store_level_id
	join price_markdown.tb_strategy_master as sm
		on ti.strategy_id = sm.strategy_id
	where ti.strategy_id = ANY(%1$L)
	)
	select * from (
		select *,
		coalesce(
			lag(markdown_percentage) over (
				partition by strategy_id, product_level_id, store_level_id order by pcd_order_int), 0
		) as previous_markdown_percentage,
		price_markdown.fn_get_incremental_discount(
			markdown_percentage,
			coalesce(
				lag(markdown_percentage) over (
					partition by strategy_id, product_level_id, store_level_id order by pcd_order_int), 0
			)
		) as incremental_discount,
		case
			when rank_md = 1 then ''First Markdown''
			else ''Final Sale Price''
		end as markdown_type,
		case
			when pcd_order_int = temp_1_pcd_order_int then ''Finally Approved''
			when pcd_order_int > temp_1_pcd_order_int and original_markdown_percentage <> markdown_percentage then ''Initially Approved''
			else approval_status_1
		end as approval_status,
		case
			when pcd_order_int = temp_1_pcd_order_int then ''Accepted IA reco''
			else action_status_1
		end as action_status
	from cte_1) temp_1
	where pcd_order_int >= temp_1_pcd_order_int
	);', strategy_ids
	);
	execute temp_query;

	raise notice 'SQL 4 statement: %',
	temp_query;

	-- Step 5a: Build full pcd_data by merging updated PCDs with unchanged PCDs
	temp_query := 'drop table if exists tb_temp_full;';
	execute temp_query;

	temp_query := Format('
		create temp table tb_temp_full as (
			-- Updated PCDs from tb_temp_2 (sim_flag = 1)
			select
				t2.strategy_id,
				t2.product_level_id,
				t2.store_level_id,
				t2.pcd_order_key,
				jsonb_build_object(
					''pcd_id'', t2.pcd_id,
					''sim_flag'', 1,
					''is_locked'', t2.is_locked,
					''markdown_type'', t2.markdown_type,
					''approval_status'', t2.approval_status,
					''action_status'', t2.action_status,
					''markdown_percentage'', t2.markdown_percentage,
					''average_retail_price'', t2.average_retail_price,
					''average_retail_price_with_vat'', t2.average_retail_price_with_vat,
					''incremental_discount'', t2.incremental_discount,
					''previous_markdown_percentage'', t2.previous_markdown_percentage
				) as pcd_value
			from tb_temp_2 t2
			UNION ALL
			-- Unchanged PCDs from tb_temp_int (not in tb_temp_2, but only for affected combos)
			select
				ti.strategy_id,
				ti.product_level_id,
				ti.store_level_id,
				ti.pcd_order_key,
				jsonb_build_object(
					''pcd_id'', ti.pcd_id,
					''sim_flag'', ti.sim_flag,
					''is_locked'', ti.is_locked,
					''markdown_type'', coalesce(ti.markdown_type, ''First Markdown''),
					''approval_status'', ti.approval_status,
					''action_status'', ti.action_status,
					''markdown_percentage'', ti.markdown_percentage,
					''average_retail_price'', ti.average_retail_price,
					''average_retail_price_with_vat'', ti.average_retail_price_with_vat,
					''incremental_discount'', coalesce(ti.incremental_discount, 0),
					''previous_markdown_percentage'', ti.previous_markdown_percentage
				) as pcd_value
			from tb_temp_int ti
			where NOT EXISTS (
				select 1 from tb_temp_2 t2
				where t2.strategy_id = ti.strategy_id
				  and t2.product_level_id = ti.product_level_id
				  and t2.store_level_id = ti.store_level_id
				  and t2.pcd_order_key = ti.pcd_order_key
			)
			and EXISTS (
				select 1 from tb_temp_2 t2
				where t2.strategy_id = ti.strategy_id
				  and t2.product_level_id = ti.product_level_id
				  and t2.store_level_id = ti.store_level_id
			)
		);',
		strategy_ids
	);
	execute temp_query;

	raise notice 'SQL 5a statement: %',
	temp_query;

	-- Step 5b: Aggregate full pcd_data per (strategy, product, store)
	temp_query := 'drop table if exists tb_temp_full_agg;';
	execute temp_query;

	temp_query := '
		create temp table tb_temp_full_agg as (
			select
				tf.strategy_id,
				tf.product_level_id,
				tf.store_level_id,
				jsonb_object_agg(tf.pcd_order_key, tf.pcd_value) as pcd_data,
				-- Preserve row-level columns from tb_temp_int
				min(ti.channel_info) as channel_info,
				min(ti.currency_id) as currency_id,
				min(ti.created_at) as created_at,
				min(ti.created_by) as created_by
			from tb_temp_full tf
			join tb_temp_int ti
				on tf.strategy_id = ti.strategy_id
				and tf.product_level_id = ti.product_level_id
				and tf.store_level_id = ti.store_level_id
				and tf.pcd_order_key = ti.pcd_order_key
			group by tf.strategy_id, tf.product_level_id, tf.store_level_id
		);';
	execute temp_query;

	raise notice 'SQL 5b statement: %',
	temp_query;

	-- Step 5c: DELETE affected rows from tb_strategy_discount_level
	temp_query := '
		DELETE FROM price_markdown.tb_strategy_discount_level sdl
		USING tb_temp_full_agg agg
		WHERE sdl.strategy_id = agg.strategy_id
			AND sdl.product_level_id = agg.product_level_id
			AND sdl.store_level_id = agg.store_level_id;';
	execute temp_query;

	raise notice 'SQL 5c statement: %',
	temp_query;

	-- Step 5d: INSERT new rows with rebuilt pcd_data, RETURNING strategy_id, id
	temp_query := 'drop table if exists tb_temp_3;';
	execute temp_query;

	temp_query := Format('
		create temp table tb_temp_3 as (
		with new_data as (
			INSERT INTO price_markdown.tb_strategy_discount_level
				(strategy_id, product_level_id, store_level_id, pcd_data, channel_info, currency_id, created_at, updated_at, created_by, updated_by)
			SELECT
				agg.strategy_id,
				agg.product_level_id,
				agg.store_level_id,
				agg.pcd_data,
				agg.channel_info,
				agg.currency_id,
				agg.created_at,
				now(),
				agg.created_by,
				%1$L::integer
			FROM tb_temp_full_agg agg
			RETURNING strategy_id, id
		)
		select
			new_data.strategy_id,
			min(sm.strategy_name) as strategy_name,
			min(new_data.id) as min_strategy_disc_id,
			max(new_data.id) as max_strategy_disc_id,
			%1$L::int as user_id
		from new_data
		join price_markdown.tb_strategy_master as sm
			using(strategy_id)
		group by 1
		);', in_user_id);
	execute temp_query;

	raise notice 'SQL 5d statement: %',
	temp_query;

	-- Step 6: Update tb_strategy_master status based on approval_status in pcd_data
	temp_query := Format('
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
			and ts.status not in (3);',
		strategy_ids, in_user_id);

	execute temp_query;

	raise notice 'SQL 6 statement: %',
	temp_query;

	end_time := clock_timestamp();

	total_time_taken := round(extract(second
	from
	(end_time - start_time)));

	raise notice 'Time taken: %',
	total_time_taken;

	_query_combine := format('select
		tb_temp_3.*,
		%1$L::int as insert_discount_time
		from tb_temp_3',
	total_time_taken);

	return query execute _query_combine;

end;

$function$
;
