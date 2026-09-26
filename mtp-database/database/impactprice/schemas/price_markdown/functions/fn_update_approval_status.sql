--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_update_approval_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated fn_update_approval_status

DROP FUNCTION if exists price_markdown.fn_update_approval_status;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_approval_status(cta_action text, payload jsonb, in_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	vl_test_query text := '';
	strategy_ids integer[];

begin
	vl_test_query := 'drop table if exists tmp_payload;';

	execute vl_test_query;

	vl_test_query := Format(
		'create temp table tmp_payload as (
		select * from json_to_recordset(%L) as d(strategy_id int, product_level_id int, store_level_id int, pcd_id int)
		)', payload);

	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	vl_test_query := 'select array_agg(distinct strategy_id) from tmp_payload';

	execute vl_test_query
	into strategy_ids;

	-- Shared Step: tb_temp_int - Unnest pcd_data from tb_strategy_discount_level with all fields
	vl_test_query := 'drop table if exists tb_temp_int;';
	execute vl_test_query;

	vl_test_query := Format('
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
	execute vl_test_query;
	RAISE NOTICE 'tb_temp_int query: %', vl_test_query;

if cta_action = 'approve' then

	vl_test_query := 'update
						price_markdown.tb_approval_metrics
					set
						status = ''Finally Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Approved''::price_markdown.action_status_enum
					where
						status = ''Initially Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
					        );';
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	-- Step A1: Build full pcd_data - update matching Initially Approved PCDs to Finally Approved/Approved
	vl_test_query := 'drop table if exists tb_temp_full;';
	execute vl_test_query;

	vl_test_query := format('
		create temp table tb_temp_full as (
			-- Updated PCDs: matching Initially Approved -> Finally Approved, Approved, sim_flag=1
			select
				ti.strategy_id,
				ti.product_level_id,
				ti.store_level_id,
				ti.pcd_order_key,
				jsonb_build_object(
					''pcd_id'', ti.pcd_id,
					''sim_flag'', 1,
					''is_locked'', ti.is_locked,
					''markdown_type'', coalesce(ti.markdown_type, ''First Markdown''),
					''approval_status'', ''Finally Approved'',
					''action_status'', ''Approved'',
					''markdown_percentage'', ti.markdown_percentage,
					''average_retail_price'', ti.average_retail_price,
					''average_retail_price_with_vat'', ti.average_retail_price_with_vat,
					''incremental_discount'', coalesce(ti.incremental_discount, 0),
					''previous_markdown_percentage'', ti.previous_markdown_percentage
				) as pcd_value
			from tb_temp_int ti
			join tmp_payload tp
				on ti.strategy_id = tp.strategy_id
				and ti.product_level_id = tp.product_level_id
				and ti.store_level_id = tp.store_level_id
				and ti.pcd_id = tp.pcd_id
			where ti.approval_status = ''Initially Approved''
				and ti.strategy_id = ANY(%1$L)
			UNION ALL
			-- Unchanged PCDs (not matched, but only for affected combos)
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
				select 1 from tmp_payload tp
				where tp.strategy_id = ti.strategy_id
				  and tp.product_level_id = ti.product_level_id
				  and tp.store_level_id = ti.store_level_id
				  and tp.pcd_id = ti.pcd_id
				  and ti.approval_status = ''Initially Approved''
			)
			and EXISTS (
				select 1 from tmp_payload tp
				where tp.strategy_id = ti.strategy_id
				  and tp.product_level_id = ti.product_level_id
				  and tp.store_level_id = ti.store_level_id
			)
		);',
		strategy_ids
	);
	execute vl_test_query;
	RAISE NOTICE 'approve tb_temp_full query: %', vl_test_query;

	-- Step A2: Aggregate full pcd_data per (strategy, product, store)
	vl_test_query := 'drop table if exists tb_temp_full_agg;';
	execute vl_test_query;

	vl_test_query := '
		create temp table tb_temp_full_agg as (
			select
				tf.strategy_id,
				tf.product_level_id,
				tf.store_level_id,
				jsonb_object_agg(tf.pcd_order_key, tf.pcd_value) as pcd_data,
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
	execute vl_test_query;
	RAISE NOTICE 'approve tb_temp_full_agg query: %', vl_test_query;

	-- Step A3: DELETE affected rows from tb_strategy_discount_level
	vl_test_query := '
		DELETE FROM price_markdown.tb_strategy_discount_level sdl
		USING tb_temp_full_agg agg
		WHERE sdl.strategy_id = agg.strategy_id
			AND sdl.product_level_id = agg.product_level_id
			AND sdl.store_level_id = agg.store_level_id;';
	execute vl_test_query;
	RAISE NOTICE 'approve DELETE query: %', vl_test_query;

	-- Step A4: INSERT new rows with rebuilt pcd_data, RETURNING strategy_id, id
	vl_test_query := 'drop table if exists tb_temp_3;';
	execute vl_test_query;

	vl_test_query := Format('
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
	execute vl_test_query;
	RAISE NOTICE 'approve INSERT query: %', vl_test_query;

	-- Step A5: Update tb_strategy_master status
	vl_test_query := format('update
						price_markdown.tb_strategy_master
					set
						status = 2,
						updated_at = now(),
						updated_by = %1$L::integer
					where
						strategy_id = ANY(%2$L)
						and status not in (3);', in_user_id, strategy_ids);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

elsif cta_action = 'withdraw' then

	vl_test_query := 'update
						price_markdown.tb_approval_metrics
					set
						status = ''Initially Approved''::price_markdown.strategy_approval_status_enum,
						action_status = ''Withdrawn''::price_markdown.action_status_enum
					where
						status = ''Finally Approved'' and
						(strategy_id,
						pcd_id,
						store_level_id,
						product_level_id) in (
							select
								strategy_id,
								pcd_id,
								store_level_id,
								product_level_id
							from
								tmp_payload
						    );';

	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

	-- Step W1: Build full pcd_data - update matching Finally Approved PCDs to Initially Approved/Withdrawn
	vl_test_query := 'drop table if exists tb_temp_full;';
	execute vl_test_query;

	vl_test_query := format('
		create temp table tb_temp_full as (
			-- Updated PCDs: matching Finally Approved -> Initially Approved, Withdrawn, sim_flag=1
			select
				ti.strategy_id,
				ti.product_level_id,
				ti.store_level_id,
				ti.pcd_order_key,
				jsonb_build_object(
					''pcd_id'', ti.pcd_id,
					''sim_flag'', 1,
					''is_locked'', ti.is_locked,
					''markdown_type'', coalesce(ti.markdown_type, ''First Markdown''),
					''approval_status'', ''Initially Approved'',
					''action_status'', ''Withdrawn'',
					''markdown_percentage'', ti.markdown_percentage,
					''average_retail_price'', ti.average_retail_price,
					''average_retail_price_with_vat'', ti.average_retail_price_with_vat,
					''incremental_discount'', coalesce(ti.incremental_discount, 0),
					''previous_markdown_percentage'', ti.previous_markdown_percentage
				) as pcd_value
			from tb_temp_int ti
			join tmp_payload tp
				on ti.strategy_id = tp.strategy_id
				and ti.product_level_id = tp.product_level_id
				and ti.store_level_id = tp.store_level_id
				and ti.pcd_id = tp.pcd_id
			where ti.approval_status = ''Finally Approved''
				and ti.strategy_id = ANY(%1$L)
			UNION ALL
			-- Unchanged PCDs (not matched, but only for affected combos)
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
				select 1 from tmp_payload tp
				where tp.strategy_id = ti.strategy_id
				  and tp.product_level_id = ti.product_level_id
				  and tp.store_level_id = ti.store_level_id
				  and tp.pcd_id = ti.pcd_id
				  and ti.approval_status = ''Finally Approved''
			)
			and EXISTS (
				select 1 from tmp_payload tp
				where tp.strategy_id = ti.strategy_id
				  and tp.product_level_id = ti.product_level_id
				  and tp.store_level_id = ti.store_level_id
			)
		);',
		strategy_ids
	);
	execute vl_test_query;
	RAISE NOTICE 'withdraw tb_temp_full query: %', vl_test_query;

	-- Step W2: Aggregate full pcd_data per (strategy, product, store)
	vl_test_query := 'drop table if exists tb_temp_full_agg;';
	execute vl_test_query;

	vl_test_query := '
		create temp table tb_temp_full_agg as (
			select
				tf.strategy_id,
				tf.product_level_id,
				tf.store_level_id,
				jsonb_object_agg(tf.pcd_order_key, tf.pcd_value) as pcd_data,
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
	execute vl_test_query;
	RAISE NOTICE 'withdraw tb_temp_full_agg query: %', vl_test_query;

	-- Step W3: DELETE affected rows from tb_strategy_discount_level
	vl_test_query := '
		DELETE FROM price_markdown.tb_strategy_discount_level sdl
		USING tb_temp_full_agg agg
		WHERE sdl.strategy_id = agg.strategy_id
			AND sdl.product_level_id = agg.product_level_id
			AND sdl.store_level_id = agg.store_level_id;';
	execute vl_test_query;
	RAISE NOTICE 'withdraw DELETE query: %', vl_test_query;

	-- Step W4: INSERT new rows with rebuilt pcd_data, RETURNING strategy_id, id
	vl_test_query := 'drop table if exists tb_temp_3;';
	execute vl_test_query;

	vl_test_query := Format('
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
	execute vl_test_query;
	RAISE NOTICE 'withdraw INSERT query: %', vl_test_query;

	-- Step W5: Update tb_strategy_master status based on remaining approval_status in pcd_data
	vl_test_query := format('
		with strategy_approval_status as (
			select
				sdl.strategy_id,
				max((pcd_entry.value->>''approval_status'')::text) as has_final_approval
			from
				price_markdown.tb_strategy_discount_level sdl
			cross join lateral jsonb_each(sdl.pcd_data) as pcd_entry(key, value)
			where
				sdl.strategy_id = ANY(%2$L)
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
			updated_by = %1$L::integer
		from
			strategy_approval_status sas
		where
			ts.strategy_id = sas.strategy_id
			and ts.status not in (3);', in_user_id, strategy_ids);
	execute vl_test_query;
	RAISE NOTICE 'query: %', vl_test_query;

end if;
return 1;
end;
$function$
;
