--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_v1_edit_strategy_step_1_21 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_v1_edit_strategy_step_1_21

DROP FUNCTION if exists price_markdown.fn_v1_edit_strategy_step_1;
CREATE OR REPLACE FUNCTION price_markdown.fn_v1_edit_strategy_step_1(
    p_strategy_id integer,
    p_strategy_name character varying,
    p_strategy_comment character varying,
    p_start_date date,
    p_end_date date,
    p_product_ids bigint[],
    p_store_ids bigint[],
    p_selected_all_flag boolean,
    p_selected_sku_store_ids jsonb,
    p_unselected_sku_store_ids jsonb,
    p_calendar_config_id integer,
    p_user_id integer,
    p_configured_by_sku_store_mapping boolean DEFAULT false,
    pg_ids integer[] DEFAULT ARRAY[]::integer[],
    sg_ids integer[] DEFAULT ARRAY[]::integer[],
    _allow_only_with_inv boolean DEFAULT true
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
	timeframe_change bool := false;
	sku_store_change bool := false;
    _new_strategy_start_date date;
	is_active_strategy bool := price_markdown.fn_check_is_active_strategy(p_strategy_id);
	metric varchar;
	current_strategy price_markdown.tb_strategy_master%ROWTYPE;
	new_strategy_id integer;
	new_strategy price_markdown.tb_strategy_master%ROWTYPE;
    _only_end_date_change bool := false;
    pg_id_change bool := false;
	sg_id_change bool := false;
    d_product_recommendation_level integer;
	d_store_recommendation_level integer;
    _current_date date;

	begin
		raise notice 'strategy_id : % start', p_strategy_id;
		select * into current_strategy
		from price_markdown.tb_strategy_master as sm
		where sm.strategy_id = p_strategy_id;

        d_product_recommendation_level := current_strategy.product_recommendation_level;
		d_store_recommendation_level := current_strategy.store_recommendation_level;

        _current_date = date(
                    timezone(
                        (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'),
                        now()
                    )
                    );

        if current_strategy.start_date <= _current_date and current_strategy.end_date <= coalesce((
				select min(pcd_end_date) from price_markdown.tb_strategy_pcd
				where strategy_id = p_strategy_id
                and pcd_end_date >= _current_date
                ),
                current_strategy.end_date
		) then
            -- doesn't perform edits when the strategy is in it's last pcd or when it's completed
			return p_strategy_id;
		end if;

		if (
			current_strategy.start_date != p_start_date or current_strategy.end_date != p_end_date
            or current_strategy.calendar_config_id != p_calendar_config_id
		) then
			timeframe_change := true;
		end if;

        drop table if exists tmp_user_sku_store_mapping;
        drop table if exists tmp_new_sku_stores;
        drop table if exists tmp_deleted_sku_stores;
        drop table if exists tmp_pg_id_change;
        drop table if exists tmp_sg_id_change;

        -- creating sku store mapping temp table
        if p_selected_all_flag is true then
            raise notice 'all skus and stores';
            create temp table tmp_user_sku_store_mapping on commit drop as (
                select p_strategy_id as strategy_id,
                product_id,
                store_id
                from unnest(p_product_ids) as product_id,unnest(p_store_ids) as store_id
            );
        else
            if p_selected_sku_store_ids is not null and jsonb_array_length(p_selected_sku_store_ids) > 0 then
                raise notice 'selected sku store ids';
                create temp table tmp_user_sku_store_mapping on commit drop as (
                    select p_strategy_id as strategy_id,
                        product_id,
                        store_id
                    from jsonb_to_recordset(p_selected_sku_store_ids)
                    as sku_stores(product_id integer,store_id integer)
                );
            else
                raise notice 'unselected sku store ids';
                create temp table tmp_user_sku_store_mapping on commit drop as (
                    select p_strategy_id as strategy_id,
                        product_id,
                        store_id
                    from unnest(p_product_ids) as product_id,unnest(p_store_ids) as store_id
                    where (product_id,store_id) not in (
                        select product_id,store_id
                        from jsonb_to_recordset(p_unselected_sku_store_ids)
                        as sku_stores(product_id integer, store_id integer)
                    )
                );
            end if;
        end if;


       	if _allow_only_with_inv then
       		with no_inventory_sku_store_combos as(
				SELECT 
				    tmp.product_id,
				    tmp.store_id
				FROM 
				    tmp_user_sku_store_mapping tmp
				LEFT JOIN 
				    global.tb_latest_inventory inv 
				ON 
				    tmp.product_id = inv.product_id
				    AND tmp.store_id = inv.store_id
				WHERE 
				    inv.product_id IS NULL
				    OR inv.oh <= 0
				    OR inv.oh IS NULL
			)
			delete 
				from tmp_user_sku_store_mapping 
			where 
				(product_id, store_id) in (select product_id, store_id from no_inventory_sku_store_combos);
       	end if;


        -- identifying new sku store mapping
        create temp table tmp_new_sku_stores on commit drop as (
            select
                ussm.strategy_id,
                ussm.product_id,
                ussm.store_id
            from tmp_user_sku_store_mapping ussm
            left join
                price_markdown.tb_strategy_sku_store_mapping tsssm
            on ussm.product_id = tsssm.product_id and ussm.store_id = tsssm.store_id and ussm.strategy_id = tsssm.strategy_id
            where ussm.strategy_id = p_strategy_id and  tsssm.product_id is null
            );

        -- identifying deleted sku store mapping
        create temp table tmp_deleted_sku_stores on commit drop  as (
            select
                tsssm.strategy_id,
                tsssm.product_id,
                tsssm.store_id
            from price_markdown.tb_strategy_sku_store_mapping tsssm
            left join
                tmp_user_sku_store_mapping ussm
            on ussm.product_id = tsssm.product_id and ussm.store_id = tsssm.store_id
            where tsssm.strategy_id = p_strategy_id and ussm.product_id is null
            );

        create temp table tmp_pg_id_change on commit drop as (
            select
                tpli.product_level_id as tpli_product_level_id,
                tspg.product_level_id as tspg_product_level_id
            from (select unnest(pg_ids) as product_level_id) tpli
            full outer join (
                select
                    distinct product_group_id as product_level_id
                from price_markdown.tb_strategy_product_groups tspg
                    where strategy_id = p_strategy_id
                ) tspg on
                tpli.product_level_id = tspg.product_level_id
            where
                tpli.product_level_id is null
                or tspg.product_level_id is null
        );

        create temp table tmp_sg_id_change on commit drop as (
            select
                tsli.store_level_id as tsli_store_level_id,
                tssg.store_level_id as tssg_store_level_id
            from (select unnest(sg_ids) as store_level_id) tsli
            full outer join (
                select
                    distinct store_group_id as store_level_id
                from price_markdown.tb_strategy_store_groups tssg
                    where strategy_id = p_strategy_id) tssg on
                tsli.store_level_id = tssg.store_level_id
            where
                tsli.store_level_id is null
                or tssg.store_level_id is null
        );

        sku_store_change := exists(select 1 from tmp_new_sku_stores) or exists(select 1 from tmp_deleted_sku_stores);

        if exists(select 1 from tmp_pg_id_change) then
            pg_id_change := true;
            sku_store_change := true;
            d_product_recommendation_level := null;
        end if;

         if exists(select 1 from tmp_sg_id_change) then
            sg_id_change := true;
            sku_store_change := true;
            d_store_recommendation_level := null;
        end if;

        raise notice 'sku_store change %',sku_store_change;
        raise notice 'timeframe change %',timeframe_change;

		if is_active_strategy then

			if current_strategy.strategy_name != p_strategy_name or current_strategy.strategy_comment != p_strategy_comment or current_strategy.allow_only_with_inv != _allow_only_with_inv then
				update price_markdown.tb_strategy_master
				set strategy_name = p_strategy_name,
					strategy_comment = p_strategy_comment,
					allow_only_with_inv = _allow_only_with_inv
				where strategy_id  = p_strategy_id;
			end if;

			if not timeframe_change and not sku_store_change then
				return p_strategy_id;
			end if;


            if timeframe_change and not sku_store_change then

                if (
                    p_calendar_config_id = current_strategy.calendar_config_id and
                    p_start_date = current_strategy.start_date and
                    p_end_date < current_strategy.end_date
                ) then
                    raise notice 'just enddate change';
                    _only_end_date_change = true;

                end if;

            end if;

            if _only_end_date_change then

                perform price_markdown.fn_reduce_active_strategy_end_date(p_strategy_id,p_end_date);
                update price_markdown.tb_strategy_master
                set updated_by=p_user_id
                where strategy_id = p_strategy_id;

                return p_strategy_id;

            end if;

			new_strategy_id = price_markdown.fn_copy_strategy(p_strategy_id,p_user_id,null::date,null::date);
			update price_markdown.tb_strategy_master
			set
				step_count = 0,
				status = 0
			where strategy_id = new_strategy_id;

			select * into new_strategy from price_markdown.tb_strategy_master where strategy_id = new_strategy_id;

            if p_start_date != current_strategy.start_date then
                _new_strategy_start_date = p_start_date;
            else
                _new_strategy_start_date = new_strategy.start_date;

            end if;

			return price_markdown.fn_v1_edit_strategy_step_1(
				new_strategy.strategy_id,
				new_strategy.strategy_name,
				p_strategy_comment,
                _new_strategy_start_date,
                p_end_date,
				p_product_ids,
				p_store_ids,
				p_selected_all_flag,
				p_selected_sku_store_ids,
				p_unselected_sku_store_ids,
                p_calendar_config_id,
				p_user_id,
				p_configured_by_sku_store_mapping,
                pg_ids,
                sg_ids,
                _allow_only_with_inv
			);
		else

			if timeframe_change or sku_store_change then
				call price_markdown.pc_clear_strategy_metrics(p_strategy_id);
			else
				raise notice 'no timeframe or sku store change';
				update price_markdown.tb_strategy_master
				set strategy_name = p_strategy_name,
					strategy_comment = p_strategy_comment,
					updated_by = p_user_id,
					allow_only_with_inv = _allow_only_with_inv
				where strategy_id = p_strategy_id;
				return p_strategy_id;
			end if;

			update price_markdown.tb_strategy_master
			set strategy_name = p_strategy_name,
				strategy_comment= p_strategy_comment,
                product_recommendation_level = d_product_recommendation_level,
				store_recommendation_level = d_store_recommendation_level,
				start_date = p_start_date,
				end_date = p_end_date,
				step_count = 0,
				status = 0,
				calendar_config_id = p_calendar_config_id,
				configured_by_sku_store_mapping  = p_configured_by_sku_store_mapping,
				updated_by = p_user_id,
				final_data_prepared = false,
				allow_only_with_inv = _allow_only_with_inv
			where strategy_id = p_strategy_id;

			if timeframe_change  then
				raise notice 'editing pcd';
				call price_markdown.pc_clear_strategy_discounts(p_strategy_id);
				perform price_markdown.fn_edit_strategy_pcd(
							p_strategy_id,
							p_start_date,
							p_end_date,
							p_calendar_config_id,
							p_user_id
						);
			end if;

            if pg_id_change then
            	delete from price_markdown.tb_strategy_product_groups
                where strategy_id = p_strategy_id;
                insert into price_markdown.tb_strategy_product_groups
                            (strategy_id,product_group_id)
                        select
                            p_strategy_id,
                            product_group_id
                        from unnest(pg_ids) as product_group_id;
            end if;

            if sg_id_change then
            	delete from price_markdown.tb_strategy_store_groups
                where strategy_id = p_strategy_id;
                insert into price_markdown.tb_strategy_store_groups
                    (strategy_id,store_group_id)
                    select
                        p_strategy_id,
                        store_group_id
                    from unnest(sg_ids) as store_group_id;
            end if;



			delete from price_markdown.tb_strategy_discount
			where strategy_id = p_strategy_id
			and (pg_id_change or sg_id_change or (product_level_id,store_level_id) in (
				select sslm.product_level_id,sslm.store_level_id from
				tmp_deleted_sku_stores tdss
				inner join
				price_markdown.tb_strategy_sku_store_mapping sslm
				on tdss.product_id = sslm.product_id and tdss.store_id = sslm.store_id and tdss.strategy_id = sslm.strategy_id
				where sslm.strategy_id = p_strategy_id
			));
			delete from price_markdown.tb_strategy_discount_ia
			where strategy_id = p_strategy_id
			and (pg_id_change or sg_id_change or (product_level_id,store_level_id) in (
				select sslm.product_level_id,sslm.store_level_id from
				tmp_deleted_sku_stores tdss
				inner join
				price_markdown.tb_strategy_sku_store_mapping sslm
				on tdss.product_id = sslm.product_id and tdss.store_id = sslm.store_id and tdss.strategy_id = sslm.strategy_id
				where sslm.strategy_id = p_strategy_id
			));

			delete from price_markdown.tb_strategy_sku_store_mapping
			where strategy_id = p_strategy_id
			and (product_id,store_id) in (
				select product_id ,store_id  from tmp_deleted_sku_stores
			);

		    INSERT INTO price_markdown.tb_strategy_sku_store_mapping
		    (
		        "strategy_id", "product_id", "store_id", "product_level_id", "product_level_value",
		        "store_level_id", "store_level_value", "channel_info", "price", "cost"
		    )
		    SELECT p_strategy_id AS strategy_id,
		        tnss.product_id,
		        tnss.store_id,
		        product_level_id,
		        product_level_value,
		        store_level_id,
		        store_level_value,
		        CASE
		            WHEN COALESCE(current_strategy.store_recommendation_level, -200) IN (-100, -200) THEN 'Omni'
		            ELSE store_levels.channel_info
		        END AS channel_info,
		        COALESCE(
		            tpsp.last_reg_price,
		            CASE 
		                WHEN store_levels.channel_info = 'Ecom' THEN product_levels.last_reg_price_ecom
		                ELSE product_levels.last_reg_price_bnm
		            END
		        ) AS current_price,
		        product_levels."cost"
		    FROM tmp_new_sku_stores tnss
		    INNER JOIN price_markdown.fn_get_products_recommendation_level(
		        p_strategy_id,
		        COALESCE(current_strategy.product_recommendation_level, -200),
		        p_product_ids
		    ) product_levels
		    ON product_levels.product_id = tnss.product_id
		    INNER JOIN price_markdown.fn_get_stores_recommendation_level(
		        p_strategy_id,
		        COALESCE(current_strategy.store_recommendation_level, -200),
		        p_store_ids
		    ) store_levels
		    ON store_levels.store_id = tnss.store_id
		    LEFT JOIN price_markdown.tb_product_store_price tpsp
		    ON tpsp.product_id = tnss.product_id AND tpsp.store_id = tnss.store_id;

			-- saving sku store count
			if sku_store_change is true then
				delete from price_markdown.tb_strategy_sku_store_count where strategy_id = p_strategy_id;
				insert into price_markdown.tb_strategy_sku_store_count
				select
					strategy_id,
					count(distinct product_id) as sku_count,
					count(distinct store_id) as store_count
				from
					price_markdown.tb_strategy_sku_store_mapping
				where strategy_id = p_strategy_id
				group by strategy_id;

				-- insert/update sku and store hierarchy in tb_strategy_hierarchy
				call price_markdown.pc_insert_product_store_hierarchy(p_strategy_id::integer);
			end if;

-- 			-- Calling a new procedure to create materialised view for optimisation flow
			if timeframe_change or sku_store_change then
                call price_markdown_opt.pc_opt_create_materialized_views_sim_splits(p_strategy_id);
			end if;

		end if;
		raise notice 'strategy_id : % end',p_strategy_id;

		return p_strategy_id;
	end;
$function$;