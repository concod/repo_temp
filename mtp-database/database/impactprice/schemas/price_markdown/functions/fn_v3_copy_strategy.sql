--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_copy_strategy_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_strategy_pcd_new migration, copy reco details tables

DROP FUNCTION if exists price_markdown.fn_v3_copy_strategy;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_copy_strategy(p_strategy_id integer, p_user_id integer, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
		new_strategy price_markdown.tb_strategy_master%ROWTYPE;
		query text;
	begin
		raise notice ' p_start_date % ',p_start_date;
		insert into price_markdown.tb_strategy_master
		(
			strategy_name,
            version_number,
			strategy_comment,
			start_date,
			end_date,
			status,
			product_recommendation_level,
			store_recommendation_level,
			markdown_type_id,
			optimisation_type,
			created_by,
			step_count,
			finalised_ia_recc,
			is_optimisation_running,
			parent_strategy,
            root_strategy,
			calendar_config_id,
			configured_by_sku_store_mapping,
			allow_only_with_inv,
			currency_id
		)
		select
            strategy_name,
            price_markdown.fn_get_new_strategy_version_number(p_strategy_id) as version_number,
			strategy_comment,
			case
			when p_start_date is not null then p_start_date
			else (
				select min(pcd_start_date)
				from  price_markdown.tb_strategy_pcd_new
				where strategy_id = p_strategy_id and pcd_start_date > date(timezone('US/Eastern', now()))
			)
			end as start_date,
			case
				when p_end_date is not null then p_end_date
				else end_date
			end as end_date,
			0 as status,
			product_recommendation_level,
			store_recommendation_level,
			markdown_type_id,
			optimisation_type,
			p_user_id as created_by,
			step_count,
			0 as finalised_ia_recc,
			false as is_optimisation_running,
			p_strategy_id as parent_strategy,
            coalesce(root_strategy,p_strategy_id) as root_strategy,
			calendar_config_id,
			configured_by_sku_store_mapping,
			allow_only_with_inv,
			currency_id
		from price_markdown.tb_strategy_master
		where strategy_id  = p_strategy_id
		returning * into new_strategy;



		-- partition creation
		query := format('CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_sku_store_mapping_%1$s PARTITION OF price_markdown.tb_strategy_sku_store_mapping FOR VALUES IN (%1$L)', new_strategy.strategy_id);
		raise notice 'partition query ----   %', query;
		execute query;

		query := format('CREATE INDEX IF NOT EXISTS strategy_sku_store_mapping_%1$s_idx ON price_markdown.tb_strategy_sku_store_mapping_%1$s USING btree
			(strategy_id ASC NULLS LAST, product_id ASC NULLS LAST, store_id ASC NULLS LAST)', new_strategy.strategy_id);
		raise notice 'index query ----   %', query;
		execute query;


		-- copy product reco details FIRST (new IDs auto-generated)
		drop table if exists tmp_product_reco_id_map;
		create temp table tmp_product_reco_id_map as
		with old_product_reco as (
			select product_level_id as old_product_level_id, product_level_value
			from price_markdown.tb_strategy_product_reco_details
			where strategy_id = p_strategy_id
		),
		inserted as (
			insert into price_markdown.tb_strategy_product_reco_details (product_level_value, strategy_id)
			select product_level_value, new_strategy.strategy_id
			from old_product_reco
			returning product_level_id, product_level_value
		)
		select
			opr.old_product_level_id,
			i.product_level_id as new_product_level_id
		from inserted i
		inner join old_product_reco opr on opr.product_level_value = i.product_level_value;

		-- copy store reco details FIRST (new IDs auto-generated)
		drop table if exists tmp_store_reco_id_map;
		create temp table tmp_store_reco_id_map as
		with old_store_reco as (
			select store_level_id as old_store_level_id, store_level_value
			from price_markdown.tb_strategy_store_reco_details
			where strategy_id = p_strategy_id
		),
		inserted as (
			insert into price_markdown.tb_strategy_store_reco_details (store_level_value, strategy_id)
			select store_level_value, new_strategy.strategy_id
			from old_store_reco
			returning store_level_id, store_level_value
		)
		select
			osr.old_store_level_id,
			i.store_level_id as new_store_level_id
		from inserted i
		inner join old_store_reco osr on osr.store_level_value = i.store_level_value;

		-- copy sku_store_mapping with remapped product_level_id and store_level_id
		insert into price_markdown.tb_strategy_sku_store_mapping
		(
			strategy_id,
			product_id,
			store_id,
			include_from_date,
			created_by,
			product_level_id,
			store_level_id,
			product_level_value,
			store_level_value,
            channel_info,
            price, 
			"cost", 
			currency_id, 
			price_with_vat
		)
		select
			new_strategy.strategy_id as strategy_id,
			ssm.product_id,
			ssm.store_id,
			date(timezone('US/Eastern', now())) as include_from_date,
			p_user_id as created_by,
			coalesce(pmap.new_product_level_id, ssm.product_level_id) as product_level_id,
			coalesce(smap.new_store_level_id, ssm.store_level_id) as store_level_id,
			null as product_level_value,
			null as store_level_value,
            ssm.channel_info,
            ssm.price, 
			ssm."cost", 
			ssm.currency_id, 
			ssm.price_with_vat
		from price_markdown.tb_strategy_sku_store_mapping ssm
		left join tmp_product_reco_id_map pmap on pmap.old_product_level_id = ssm.product_level_id
		left join tmp_store_reco_id_map smap on smap.old_store_level_id = ssm.store_level_id
		where ssm.strategy_id = p_strategy_id;

		insert into price_markdown.tb_strategy_sku_store_count
		select
			new_strategy.strategy_id as strategy_id,
			count(distinct product_id) as sku_count,
			count(distinct store_id) as store_count
		from price_markdown.tb_strategy_sku_store_mapping
		where strategy_id = new_strategy.strategy_id;


		-- insert/update sku and store hierarchy in tb_strategy_hierarchy
		call price_markdown.pc_insert_product_store_hierarchy(new_strategy.strategy_id::integer);

        insert into price_markdown.tb_strategy_product_groups
        (strategy_id,product_group_id)
        select  
            new_strategy.strategy_id as strategy_id,
            product_group_id
        from 
            price_markdown.tb_strategy_product_groups
        where strategy_id = p_strategy_id;

        insert into price_markdown.tb_strategy_store_groups
        (strategy_id,store_group_id)
        select
            new_strategy.strategy_id as strategy_id,
            store_group_id
        from 
            price_markdown.tb_strategy_store_groups
        where strategy_id = p_strategy_id;


		insert into price_markdown.tb_strategy_objective
		(
			strategy_id,
			objective_type_id,
			objective_value,
			created_by
		)
		select
			new_strategy.strategy_id as strategy_id,
			objective_type_id,
			objective_value,
			p_user_id as created_by
		from price_markdown.tb_strategy_objective tso
		where strategy_id = p_strategy_id;

		insert into price_markdown.tb_strategy_rule
		(
			strategy_id,
			constraint_type,
			constraint_id,
			min_value,
			max_value,
			applicable_value,
			rule_flexibility_type_id,
			priority,
			status,
			created_by
		)
		select
			new_strategy.strategy_id as strategy_id,
			constraint_type,
			case when constraint_type = 1 then objective_mapping.new_objective_id
			else constraint_id end as constraint_id,
			min_value,
			max_value,
			applicable_value,
			rule_flexibility_type_id,
			priority,
			status,
			p_user_id as created_by
		from price_markdown.tb_strategy_rule
		left join (
			select old_strategy_alias.strategy_objective_id as old_objective_id,
					new_strategy_alias.strategy_objective_id as new_objective_id
			from
			(
			select * from price_markdown.tb_strategy_objective  tsp
			where strategy_id = new_strategy.strategy_id
			) new_strategy_alias
			left join
			(
			select  * from price_markdown.tb_strategy_objective tsp
			where strategy_id = p_strategy_id
			) old_strategy_alias
			on new_strategy_alias.objective_type_id = old_strategy_alias.objective_type_id
		) objective_mapping
		on objective_mapping.old_objective_id = constraint_id
		where strategy_id = p_strategy_id;

		perform price_markdown.fn_v3_edit_strategy_pcd(
			new_strategy.strategy_id,
			new_strategy.start_date,
			new_strategy.end_date,
			new_strategy.calendar_config_id,
			p_user_id
		);
--		insert into price_markdown.tb_strategy_pcd
--		(
--			strategy_id,
--			pcd_start_date,
--			pcd_end_date,
--			created_by
--		)
--        select
--			new_strategy.strategy_id as strategy_id,
--			pcd_start_date,
--			pcd_end_date,
--			p_user_id as created_by
--		from
--			(
--			select
--				distinct
--				greatest(new_strategy.start_date,start_date)::date as pcd_start_date,
--				least(new_strategy.end_date,end_date)::date as pcd_end_date
--			from
--				(
--				select
--					fiscal_week,
--					min(dates) as start_date,
--					max(dates) as end_date
--				from
--					price_markdown.fiscal_date_mapping tfdm
--				where
--					tfdm.dates between new_strategy.start_date and new_strategy.end_date
--				group by
--					fiscal_week
--		         ) s
--             ) s;


		-- creating strategy discount partitions
        call price_markdown_opt.pc_create_pcd_partitions(new_strategy.strategy_id,'price_markdown','tb_ssd_fin');
        call price_markdown_opt.pc_create_pcd_partitions(new_strategy.strategy_id,'price_markdown','tb_ssd_ia');
        call price_markdown_opt.pc_create_pcd_partitions(new_strategy.strategy_id,'price_markdown','tb_agg_fin');
        call price_markdown_opt.pc_create_pcd_partitions(new_strategy.strategy_id,'price_markdown','tb_agg_ia');

		-- NEW: create tb_strategy_discount_level partition and copy data with remapped IDs
		execute format(
			'CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_discount_level_%1$s PARTITION OF price_markdown.tb_strategy_discount_level FOR VALUES IN (%1$s)',
			new_strategy.strategy_id
		);
		execute format(
			'CREATE UNIQUE INDEX IF NOT EXISTS tb_strategy_discount_level_%1$s_strategy_id_product_level_id__key ON price_markdown.tb_strategy_discount_level_%1$s USING btree(strategy_id, product_level_id, store_level_id)',
			new_strategy.strategy_id
		);
		-- Only copy data if source partition exists
		IF EXISTS (
			SELECT 1 FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'price_markdown'
			AND c.relname = format('tb_strategy_discount_level_%s', p_strategy_id)
		) THEN
			execute format(
				'INSERT INTO price_markdown.tb_strategy_discount_level_%1$s
				 (strategy_id, product_level_id, store_level_id, pcd_data, ia_pcd_data, currency_id, channel_info, created_by)
				 SELECT
				     %1$s,
				     coalesce(pmap.new_product_level_id, dl.product_level_id),
				     coalesce(smap.new_store_level_id, dl.store_level_id),
				     dl.pcd_data,
				     dl.ia_pcd_data,
				     dl.currency_id,
				     dl.channel_info,
				     dl.created_by
				 FROM price_markdown.tb_strategy_discount_level_%2$s dl
				 LEFT JOIN tmp_product_reco_id_map pmap ON pmap.old_product_level_id = dl.product_level_id
				 LEFT JOIN tmp_store_reco_id_map smap ON smap.old_store_level_id = dl.store_level_id
				 WHERE dl.strategy_id = %2$s',
				new_strategy.strategy_id, p_strategy_id
			);
		END IF;

		-- Clean up temp mapping tables
		drop table if exists tmp_product_reco_id_map;
		drop table if exists tmp_store_reco_id_map;


--		insert into price_markdown.tb_strategy_discount
--		(
--			strategy_id,
--			product_level_id,
--			product_level_value,
--			store_level_id,
--			store_level_value,
--			pcd_id,
--			markdown_percentage,
--			is_locked,
--			updated_by
--		)
--		select
--			new_strategy.strategy_id as strategy_id,
--			product_level_id,
--			product_level_value,
--			store_level_id,
--			store_level_value,
--			pcd_mapping.new_pcd_id as pcd_id,
--			markdown_percentage,
--			0 as is_locked,
--			p_user_id as updated_by
--		from price_markdown.tb_strategy_discount tsd
--		inner join (
--			select old_strategy_alias.pcd_id as old_pcd_id, new_strategy_alias.pcd_id as new_pcd_id
--			from
--			(
--			select * from price_markdown.tb_strategy_pcd tsp
--			where strategy_id = new_strategy.strategy_id
--			) new_strategy_alias
--			left join
--			(
--			select  * from price_markdown.tb_strategy_pcd tsp
--			where strategy_id = p_strategy_id
--			) old_strategy_alias
--			on new_strategy_alias.pcd_end_date = old_strategy_alias.pcd_end_date
--		) pcd_mapping
--		on pcd_mapping.old_pcd_id = tsd.pcd_id
--		where tsd.strategy_id = p_strategy_id;


		return new_strategy.strategy_id;
	end;
$function$
;
