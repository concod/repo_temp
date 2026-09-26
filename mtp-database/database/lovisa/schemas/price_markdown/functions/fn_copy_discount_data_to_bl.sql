--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_copy_discount_data_to_bl_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_copy_discount_data_to_bl_2
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_copy_discount_data_to_bl;


-- DROP FUNCTION price_markdown.fn_copy_discount_data_to_bl(int4, int4, text, _int4, jsonb, jsonb, jsonb, _text, jsonb, bool, text);

CREATE OR REPLACE FUNCTION price_markdown.fn_copy_discount_data_to_bl(in_strategy_id integer, in_source_pcd integer, in_source_discount_type text, in_dest_pcd integer[], in_row_selection jsonb, in_unselected_rows jsonb, in_pcd_metrics_filter jsonb, in_approval_status_filter text[], in_filters jsonb, in_filter_applied boolean, in_session_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

declare
	_bl_value_exists bool;
	_ending_rule real;
	_query text;
    _product_and_store_level_filter text = '';
    _uuid text;
	start_time TIMESTAMP;
    end_time TIMESTAMP;
    _source_type text;
	_source_discount_table_name text;
begin
    _source_type := CASE
            WHEN in_source_discount_type = 'ia' THEN 'ia'
            ELSE 'fin'
    END;
	_source_discount_table_name := CASE
        WHEN in_source_discount_type = 'ia' THEN 'tb_strategy_discount_ia'
        ELSE 'tb_strategy_discount'
    END;

	select bl_value_exists into _bl_value_exists from price_markdown.fn_check_metric_table_data_exists(in_strategy_id) ;
	raise notice ' bl exists -- %', _bl_value_exists;

	execute format('
		select
			unnest(applicable_value) as end_rule
			from
				price_markdown.tb_strategy_rule t1
			inner join (
				select
					rule_id,
					rule_type
				from
					price_markdown.tb_rule_master trm) t2 on
				t1.constraint_id = t2.rule_id
			where
				strategy_id = %1$s
				and constraint_type = 0
				and status = 0
				and rule_type = 44
			limit 1 ', in_strategy_id) into _ending_rule;
	raise notice ' end rule -- %', _ending_rule;

    _uuid = in_strategy_id::text || '_' || substring(translate(gen_random_uuid()::text, '-', ''),0,5);

    if in_session_id != (select last_copy_ia_session_id from price_markdown.tb_strategy_master where strategy_id = in_strategy_id) then
        execute format('drop table if exists price_markdown_temp.tb_copy_table_data_cte_%1$s',in_strategy_id);
        execute format('drop table if exists price_markdown_temp.tb_copy_overral_overall_metrics_cte_%1$s', in_strategy_id);
    end if;

    if not exists ( select 1 from information_schema.tables where table_schema = 'price_markdown_temp' and table_name = 'tb_copy_table_data_cte_'||in_strategy_id) then
        raise notice 'table does''t exist creating new table';
        _query := format('
            create table price_markdown_temp.tb_copy_table_data_cte_%1$s
            (
                strategy_id int,
                pcd_id int,
                order_ int,
                is_footer_row bool,
                rowId text,
                product_level_id int,
                product_level_value text,
                store_level_id int,
                store_level_value int,
                cw_offer_percentage double precision,
                cw_incremental_discount double precision,
                cw_effective_price_point double precision,
                is_row_locked int,
                recommended_offer_percentage double precision,
                previous_markdown_percentage double precision,
                incremental_discount double precision,
                approval_status price_markdown.strategy_approval_status_enum,
                effective_price_point double precision,
                margin double precision,
                revenue double precision,
                sales_units double precision,
                ia_recommended_offer_percentage double precision,
                ia_previous_markdown_percentage double precision,
                ia_incremental_discount double precision,
                ia_effective_price_point double precision,
                ia_sales_units double precision,
                ia_margin double precision,
                ia_revenue double precision,
                is_locked int,
                enable_lock bool,
                copied_from_ia bool,
                average_retail_price float8,
				inventory float8,
				markdown_dollar float8,
				sell_through float8,
				ia_inventory float8,
				ia_markdown_dollar float8,
				ia_sell_through float8
        )
        ',
        in_strategy_id
       );
      execute _query;

    end if;


	-- execute format('drop table if exists price_markdown_temp.tb_copy_reco_level_values_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_source_recc_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_bl_override_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_dest_bl_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_overral_overall_metrics_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_current_week_metric_cte_%1$s ;',in_strategy_id);
	-- execute format('drop table if exists price_markdown_temp.tb_copy_table_data_cte_%1$s ;',in_strategy_id);

    set enable_nestloop = false;

    if in_filter_applied then
        _product_and_store_level_filter = format(
            '
                select product_level_id,store_level_id
                from price_markdown.fn_get_step4_filtered_product_and_store_level_ids(
                    ''step4'',
                    %1$s,
                    array(
                        select pcd_id from price_markdown.tb_strategy_pcd
                        where strategy_id = %1$s
                    ),
                    ''%2$s''::jsonb,
                    array[%3$s]::text[],
					''%4$s''::jsonb,
                    false
                )
            ',
            in_strategy_id,
            coalesce(in_pcd_metrics_filter,jsonb_build_object())::text,
            array_to_string(
                array(
                    select quote_literal(unnest(in_approval_status_filter))
                ),
                ','
            ),
			coalesce(in_filters,jsonb_build_object())::text
        );

    else
        _product_and_store_level_filter = format('
                select distinct product_level_id,store_level_id
                from price_markdown.tb_strategy_sku_store_mapping_%1$s
            ',
            in_strategy_id
            );
    end if;

    if coalesce(jsonb_array_length(in_row_selection),0) != 0 then
        _product_and_store_level_filter = format(
            '
                select product_level_id,store_level_id
                from jsonb_to_recordset(''%1$s'')
                as selected_product_and_store_levels(
                    product_level_id int,
                    store_level_id int
                )
            ',
            in_row_selection::text
        );
    end if;

    if  coalesce(jsonb_array_length(in_unselected_rows),0) != 0 then
        _product_and_store_level_filter = _product_and_store_level_filter || format(
            '
                where (product_level_id,store_level_id) not in (
                    select product_level_id,store_level_id
                    from jsonb_to_recordset(''%1$s'')
                    as unselected_product_and_store_levels(
                        product_level_id int,
                        store_level_id int
                    )
                )
            ',
            in_unselected_rows::text
        );
    end if;

    raise notice 'product_and_store_filter: %',_product_and_store_level_filter;

	_query := format('
		create unlogged table price_markdown_temp.tb_copy_reco_level_values_cte_%2$s as
		select
			sdia.strategy_id,
			product_level_id,
			store_level_id,
			product_level_value,
			store_level_value,
			spc.pcd_id,
			spc.pcd_start_date,
			spc.pcd_end_date
		from
			price_markdown.%3$s_%1$s sdia
		left join price_markdown.tb_strategy_pcd spc on
			sdia.pcd_id = spc.pcd_id
			and sdia.strategy_id = spc.strategy_id
		group by
			sdia.strategy_id,
			product_level_id,
			store_level_id,
			product_level_value,
			store_level_value,
			spc.pcd_id,
			spc.pcd_start_date,
			spc.pcd_end_date
        ',
        in_strategy_id,
        _uuid,
        _source_discount_table_name
    );
	raise notice 'query 1  ----- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 1 : %', end_time - start_time;

	_query := format('
		create unlogged table price_markdown_temp.tb_copy_source_recc_cte_%3$s as
		select
			ia.strategy_id,
			ia.product_level_id,
			ia.product_level_value,
			ia.store_level_id,
			ia.store_level_value,
			ia.effective_price_point,
			ia.pcd_id,
			ia.ia_selling_price,
			ia.sales_units,
			ia.margin,
			ia.revenue,
			ia.rem_inv,
			ia.spend,
			ia.pcd_start_date,
			ia.pcd_end_date,
			sd.markdown_percentage as recommended_offer_percentage,
            sd.previous_markdown_percentage,
            sd.incremental_discount,
            ''Not Approved'' as approval_status,
            sd.average_retail_price,
			ia.inventory,
			ia.markdown_dollar
		from (
			select
				s.*,
				case
					when %1$L is null then round(cast(ia_selling_price as numeric), 2)
					else ROUND(cast(ia_selling_price -(%1$L / 100) as numeric), 1)+(%1$L / 100)
				end as ia_effective_price_point
			from
				(
				select
					ia1.strategy_id,
					rec.product_level_id,
					rec.product_level_value,
					rec.store_level_id,
					rec.store_level_value,
					round(avg(ia1.recommended_offer_percentage)::decimal, 2) as recommended_offer_percentage,
					round(avg(ia1.effective_price_point)::decimal, 2) as effective_price_point,
					rec.pcd_id,
					case
						when SUM(ia1.sales_units) > 0 then (SUM(ia1.effective_price_point * ia1.sales_units) / SUM(ia1.sales_units))
						else AVG(ia1.effective_price_point)
					end as ia_selling_price,
					round(sum(ia1.sales_units)::decimal, 2) as sales_units,
					round(sum(ia1.margin)::decimal, 2) as margin,
					round(sum(ia1.revenue)::decimal, 2) as revenue,
					sum(ia1.rem_inv) as rem_inv,
					sum(ia1.spend) as spend,
					rec.pcd_start_date,
					rec.pcd_end_date,
					(coalesce(sum(ia1.rem_inv) filter(where ia1.recommendation_date = rec.pcd_end_date), 0)) + round(sum(ia1.sales_units)::decimal, 2) as inventory,
            		round(sum(ia1.spend)::decimal, 2) as markdown_dollar
				from
					price_markdown_temp.tb_copy_reco_level_values_cte_%3$s rec
				left join price_markdown.tb_agg_%4$s_%2$s ia1 on
					rec.product_level_id = ia1.product_level_id
					and rec.store_level_id = ia1.store_level_id
					and rec.pcd_id = ia1.pcd_id
				group by
					ia1.strategy_id,
					rec.product_level_id,
					rec.product_level_value,
					rec.store_level_id,
					rec.store_level_value,
					rec.pcd_id,
					rec.pcd_start_date,
					rec.pcd_end_date
				) s
		) ia
		left join
			price_markdown.%5$s_%2$s sd
        on
            ia.product_level_id = sd.product_level_id
            and ia.store_level_id = sd.store_level_id
            and sd.pcd_id = ia.pcd_id
	', _ending_rule, in_strategy_id,_uuid,_source_type,_source_discount_table_name);
	raise notice ' query 2  ---- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 2 : %', end_time - start_time;


	_query := format('
		create unlogged table price_markdown_temp.tb_copy_bl_override_cte_%4$s as
		select
			bl.*,
			sd.is_locked,
			sd.markdown_percentage as recommended_offer_percentage,
            sd.previous_markdown_percentage,
            sd.incremental_discount,
            sd.approval_status,
            sd.average_retail_price,
            sd.previous_pcd_id
		from (
			select
				s.*,
				case
					when %1$L is null then round(cast(bl_selling_price as numeric), 2)
					else ROUND(cast(bl_selling_price -(%1$L / 100) as numeric), 1)+(%1$L / 100)
				end as bl_effective_price_point
			from (
				select
					rc.strategy_id,
					rc.product_level_id,
					rc.product_level_value,
					rc.store_level_id,
					rc.store_level_value,
					round(avg(bl1.effective_price_point)::decimal, 2) as effective_price_point,
					rc.pcd_id,
					case
						when %3$L::bool and SUM(bl1.sales_units) > 0 then (SUM(bl1.effective_price_point * bl1.sales_units) / SUM(bl1.sales_units))
						when %3$L::bool then AVG(bl1.effective_price_point)
					end as bl_selling_price,
					round(sum(bl1.sales_units)::decimal, 2) as sales_units,
					round(sum(bl1.margin)::decimal, 2) as margin,
					round(sum(bl1.revenue)::decimal, 2) as revenue,
					sum(bl1.rem_inv) as rem_inv,
					sum(bl1.spend) as spend,
					rc.pcd_start_date,
					rc.pcd_end_date,
					(coalesce(sum(bl1.rem_inv) filter(where bl1.recommendation_date = rc.pcd_end_date), 0)) + round(sum(bl1.sales_units)::decimal, 2) as inventory,
            		round(sum(bl1.spend)::decimal, 2) as markdown_dollar
				from
					price_markdown_temp.tb_copy_reco_level_values_cte_%4$s rc
				left join
					price_markdown.tb_agg_fin_%2$s bl1 on
						rc.pcd_id = bl1.pcd_id
						and rc.product_level_id = bl1.product_level_id
						and rc.store_level_id = bl1.store_level_id
				group by
					rc.strategy_id,
					rc.product_level_id,
					rc.product_level_value,
					rc.store_level_id,
					rc.store_level_value,
					rc.pcd_id,
					rc.pcd_start_date,
					rc.pcd_end_date
			) s
		) bl
		left join
			price_markdown.tb_strategy_discount_%2$s sd
        on bl.product_level_id = sd.product_level_id and bl.store_level_id = sd.store_level_id and sd.pcd_id = bl.pcd_id
	',  _ending_rule, in_strategy_id, _bl_value_exists,_uuid);
	raise notice ' query 3 ----- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 3 : %', end_time - start_time;


	_query := format('
		create unlogged table price_markdown_temp.tb_copy_dest_bl_cte_%5$s as
		select
			bl.strategy_id,
			bl.product_level_id,
			bl.product_level_value,
			bl.store_level_id,
			bl.store_level_value,
			bl.pcd_id,
			bl.pcd_start_date,
			bl.pcd_end_date,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.recommended_offer_percentage
				else bl.recommended_offer_percentage
			end as recommended_offer_percentage,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.effective_price_point
				else bl.effective_price_point
			end as effective_price_point,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.sales_units
				else bl.sales_units
			end as sales_units,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.margin
				else bl.margin
			end as margin,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.revenue
				else bl.revenue
			end as revenue,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.rem_inv
				else bl.rem_inv
			end as rem_inv,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then ia.spend
				else bl.spend
			end as spend,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then false
				else true
			end as enable_lock,
			case
				when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then 0
				when bl.is_locked is null then 0
				else bl.is_locked
			end as is_locked,
            case
                when bl.previous_pcd_id in (%3$s) and filtered_rows.product_level_id is not null
                    then ia.previous_markdown_percentage
                else bl.previous_markdown_percentage
            end as previous_markdown_percentage,
            case
                when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null
                    then least(bl.approval_status,''Initially Approved'')
                else bl.approval_status
            end as approval_status,
			case
                when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null
                    then ia.inventory
                else bl.inventory
            end as inventory,
			case
                when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null
                    then ia.markdown_dollar
                else bl.markdown_dollar
            end as markdown_dollar,
			case
                when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null then
					case
					    when ia.inventory = 0 then 0
					    else (ia.sales_units * 100) / ia.inventory
					end
                else
					case
					    when bl.inventory = 0 then 0
					    else (bl.sales_units * 100) / bl.inventory
					end
            end as sell_through,
            bl.previous_pcd_id,
            bl.average_retail_price,
            case when
                bl.pcd_id in (%3$s) and bl.previous_pcd_id in (%3$s) and filtered_rows.product_level_id is not null
                then price_markdown.fn_get_incremental_discount(
                    ia.recommended_offer_percentage,
                    ia.previous_markdown_percentage
                )
                when bl.pcd_id in (%3$s) and bl.previous_pcd_id not in (%3$s) and filtered_rows.product_level_id is not null
                then price_markdown.fn_get_incremental_discount(
                    ia.recommended_offer_percentage,
                    bl.previous_markdown_percentage
                )
                else
                    bl.incremental_discount
            end as incremental_discount,
            case when bl.pcd_id in (%3$s) and filtered_rows.product_level_id is not null
            then true
            else false
            end as copied_from_ia
		from
			price_markdown_temp.tb_copy_bl_override_cte_%5$s bl
		left join
			(select * from price_markdown_temp.tb_copy_source_recc_cte_%5$s where pcd_id = %2$s ) ia
        on
			bl.product_level_id = ia.product_level_id
			and bl.store_level_id = ia.store_level_id
        left join
            (
                %4$s
            ) filtered_rows
        on filtered_rows.product_level_id = bl.product_level_id
        and filtered_rows.store_level_id = bl.store_level_id
	', in_strategy_id, in_source_pcd, array_to_string(in_dest_pcd, ','),_product_and_store_level_filter,_uuid);
	raise notice ' query 4 ---- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 4 : %', end_time - start_time;





	_query := format('
		create unlogged table price_markdown_temp.tb_copy_current_week_metric_cte_%2$s as
        with current_pcd_cte as (
            select pcd_id from price_markdown.tb_strategy_pcd b
            where strategy_id = %1$L and
            date(
                timezone(
                    (select remarks from metaschema.tb_app_sub_master where name = ''client_timezone''),
                    now()
                )
            ) between b.pcd_start_date and b.pcd_end_date
        )
		select
			strategy_id,
			product_level_id,
			store_level_id,
			pcd_id,
			recommended_offer_percentage as cw_offer_percentage,
            price_markdown.fn_get_incremental_discount(
                recommended_offer_percentage,
                previous_markdown_percentage
            ) as cw_incremental_discount,
            coalesce(
                effective_price_point,
                (100-recommended_offer_percentage)*average_retail_price/100
            ) as cw_effective_price_point
		from
			price_markdown_temp.tb_copy_dest_bl_cte_%2$s bl
		where
            bl.pcd_id = (select pcd_id from current_pcd_cte)
	', in_strategy_id,_uuid);
	raise notice ' query 6 ---- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 6 : %', end_time - start_time;


	_query := format('
		create unlogged table price_markdown_temp.tb_copy_table_data_cte_%3$s as
		select
			bl.strategy_id,
			bl.pcd_id,
            bl.pcd_start_date,
			0 as order_,
			false as is_footer_row,
			coalesce(ia.product_level_value, bl.product_level_value) || ''_'' || coalesce(ia.store_level_value, bl.store_level_value) as rowId,
			coalesce(ia.product_level_id, bl.product_level_id)::int as product_level_id,
			coalesce(ia.product_level_value, bl.product_level_value)::text as product_level_value,
			coalesce(ia.store_level_id, bl.store_level_id)::int as store_level_id,
			coalesce(ia.store_level_value, bl.store_level_value)::text as store_level_value,
			ssf.brand,
			ssf.sub_department,
			ssf.product_name,
			ssf.age,
			ssf.department,
			ssf.base_price,
			ssf.show_alert,
			ssf.sales_units_diff,
        	ssf.ia_discount_next_pcd,
			ssf.upcoming_pcd_id,
			case
                when bl.copied_from_ia is true then cw.cw_offer_percentage
                when ctdc.copied_from_ia is true then ctdc.cw_offer_percentage
                else
                cw.cw_offer_percentage
            end as cw_offer_percentage,
            case when bl.copied_from_ia is true then cw.cw_incremental_discount
                when ctdc.copied_from_ia is true then ctdc.cw_incremental_discount
                else cw.cw_incremental_discount
            end as cw_incremental_discount,
            case when bl.copied_from_ia is true then cw.cw_effective_price_point
                when ctdc.copied_from_ia is true then ctdc.cw_effective_price_point
                else cw.cw_effective_price_point
            end as cw_effective_price_point,
			case when bl.copied_from_ia is true then bl.is_locked
                when ctdc.copied_from_ia is true then ctdc.is_locked
                else bl.is_locked
            end as is_row_locked,
			case when bl.copied_from_ia is true then bl.recommended_offer_percentage
                when ctdc.copied_from_ia is true then ctdc.recommended_offer_percentage
                else bl.recommended_offer_percentage
            end as recommended_offer_percentage,
            case when bl.copied_from_ia is true then bl.previous_markdown_percentage
                when ctdc.copied_from_ia is true then ctdc.previous_markdown_percentage
                else bl.previous_markdown_percentage
            end as previous_markdown_percentage,
            case when bl.copied_from_ia is true then bl.incremental_discount
                when ctdc.copied_from_ia is true then ctdc.incremental_discount
                else bl.incremental_discount
            end as incremental_discount,
            case when bl.copied_from_ia is true then bl.approval_status
                when ctdc.copied_from_ia is true then ctdc.approval_status
                else bl.approval_status
            end as approval_status,
			case when bl.copied_from_ia is true then bl.inventory
                when ctdc.copied_from_ia is true then ctdc.inventory
                else bl.inventory
            end as inventory,
			case when bl.copied_from_ia is true then bl.markdown_dollar
                when ctdc.copied_from_ia is true then ctdc.markdown_dollar
                else bl.markdown_dollar
            end as markdown_dollar,
			case when bl.copied_from_ia is true then bl.sell_through
                when ctdc.copied_from_ia is true then ctdc.sell_through
                else bl.sell_through
            end as sell_through,
			case when bl.copied_from_ia is true or coalesce(ctdc.copied_from_ia,false) is false then coalesce(
                round(bl.effective_price_point::numeric, 2),
                round(
                    ((100-bl.recommended_offer_percentage)*bl.average_retail_price/100)::decimal,
                    2
                )
                )
                else coalesce(
                    round(ctdc.effective_price_point::numeric,2),
                    round(
                        ((100-ctdc.recommended_offer_percentage)*ctdc.average_retail_price/100)::decimal,
                        2
                    )
                )
            end as effective_price_point,
			case when bl.copied_from_ia is true then bl.margin
                when ctdc.copied_from_ia is true then ctdc.margin
                else bl.margin
            end as margin,
			case when bl.copied_from_ia is true then bl.revenue
                when ctdc.copied_from_ia is true then ctdc.revenue
                else bl.revenue
            end as revenue,
			case when bl.copied_from_ia is true then bl.sales_units
                when ctdc.copied_from_ia is true then ctdc.sales_units
                else bl.sales_units
            end as sales_units,
			ia.recommended_offer_percentage as ia_recommended_offer_percentage,
            ia.previous_markdown_percentage as ia_previous_markdown_percentage,
            price_markdown.fn_get_incremental_discount(
                ia.recommended_offer_percentage,
                ia.previous_markdown_percentage
            ) as ia_incremental_discount,
			coalesce(
                round(ia.effective_price_point::numeric,2),
                round(
                    ((100-ia.recommended_offer_percentage)*bl.average_retail_price/100)::decimal,
                    2
                )
            ) as ia_effective_price_point,
            ia.sales_units as ia_sales_units,
			ia.margin as ia_margin,
			ia.revenue as ia_revenue,
			ia.inventory as ia_inventory,
			ia.markdown_dollar as ia_markdown_dollar,
			case
			    when ia.inventory = 0 then 0
			    else (ia.sales_units * 100) / ia.inventory
			end as ia_sell_through,
			case when bl.copied_from_ia is true then bl.is_locked
                when ctdc.copied_from_ia is true then ctdc.is_locked
                else bl.is_locked
            end as is_locked,
			case when bl.copied_from_ia is true then bl.enable_lock
                when ctdc.copied_from_ia is true then ctdc.enable_lock
                else bl.enable_lock
            end as enable_lock,
            case when bl.copied_from_ia is true then bl.copied_from_ia
                when ctdc.copied_from_ia is true then ctdc.copied_from_ia
                else
                bl.copied_from_ia
            end as copied_from_ia,
            bl.average_retail_price
        from
			price_markdown_temp.tb_copy_dest_bl_cte_%3$s bl
		left join
			price_markdown_temp.tb_copy_source_recc_cte_%3$s ia on bl.product_level_id = ia.product_level_id and bl.store_level_id = ia.store_level_id and bl.pcd_id = ia.pcd_id
		left join
			 price_markdown_temp.tb_copy_current_week_metric_cte_%3$s cw on bl.product_level_id = cw.product_level_id and bl.store_level_id = cw.store_level_id
        left join
            price_markdown_temp.tb_copy_table_data_cte_%1$s ctdc
        on
            ctdc.product_level_id = bl.product_level_id
            and ctdc.store_level_id = bl.store_level_id
            and ctdc.pcd_id = bl.pcd_id
		left join
			price_markdown_temp.tb_strategy_step4_full_%1$s ssf
		on
			ssf.product_level_id = bl.product_level_id
			and ssf.store_level_id = bl.store_level_id
	', in_strategy_id, _bl_value_exists,_uuid);
	raise notice ' query 7 ---- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 7 : %', end_time - start_time;


    _query := format('
		create unlogged table price_markdown_temp.tb_copy_overral_overall_metrics_cte_%2$s as
		select
			1 as order_,
			true as is_footer_row,
			''Sub total'' as rowId,
			null::int as product_level_id,
			''Sub total'' as product_level_value,
			null::int as store_level_id,
			null::text as store_level_value,
			null::float as cw_offer_percentage,
            null::float as cw_incremental_discount,
            null::float as cw_effective_price_point,
			0 as is_row_locked,
            null::price_markdown.strategy_approval_status_enum as min_approval_status,
            null::price_markdown.strategy_approval_status_enum as max_approval_status,
			null::text[] as brand,
			null::text[] as department,
			null::text[] as sub_department,
			null::text[] as product_name,
			null::float8 as age,
			null::float8 as base_price,
			null::boolean as show_alert,
			null::float8 as sales_units_diff,
        	null::float8 as ia_discount_next_pcd,
			null::integer as upcoming_pcd_id,
			jsonb_object_agg(
                ''pcd_'' || od.pcd_id::text,
                jsonb_build_object(
                    ''finalized_discount_percent'',round(bl_recommended_offer_percentage::decimal,0),
                    ''finalized_pp'',round(bl_effective_price_point::numeric,2),
                    ''incremental_discount'',price_markdown.fn_get_incremental_discount(
                        bl_recommended_offer_percentage,
                        bl_previous_markdown_percentage
                    ),
                    ''ia_reco_discount_percent'', round(ia_recommended_offer_percentage::decimal,0),
                    ''ia_incremental_discount_percent'', price_markdown.fn_get_incremental_discount(
                        ia_recommended_offer_percentage,
                        ia_previous_markdown_percentage
                    ),
                    ''ia_reco_pp'', round(ia_effective_price_point::numeric,2),
                    ''margin_finalized'', round(bl_margin::decimal,2),
                    ''revenue_finalized'', round(bl_revenue::decimal,2),
                    ''unit_finalized'', round(bl_sales_units::decimal,2),
                    ''unit_ia_reco'', round(ia_sales_units::decimal, 2),
                    ''margin_ia_reco'', round(ia_margin::decimal, 2),
                    ''revenue_ia_reco'', round(ia_revenue::decimal,2),
                    ''finalized_inventory'', round(bl_inventory::decimal,2),
                    ''finalized_markdown_dollar'', round(bl_markdown_dollar::decimal,2),
                    ''ia_inventory'', round(ia_inventory::decimal,2),
                    ''ia_markdown_dollar'', round(ia_markdown_dollar::decimal,2)
                )
            ) as pcd_metrics
		from
        (
			select
				ctdc.pcd_id,
				avg(ctdc.recommended_offer_percentage) as bl_recommended_offer_percentage,
                avg(ctdc.previous_markdown_percentage) as bl_previous_markdown_percentage,
				avg(ctdc.ia_recommended_offer_percentage) as ia_recommended_offer_percentage,
                avg(ctdc.ia_previous_markdown_percentage) as ia_previous_markdown_percentage,
				avg(ctdc.effective_price_point) as bl_effective_price_point,
				avg(ctdc.ia_effective_price_point) as ia_effective_price_point,
				sum(ctdc.ia_sales_units) as ia_sales_units,
				sum(ctdc.ia_margin) as ia_margin,
				sum(ctdc.ia_revenue) as ia_revenue,
				sum(ctdc.sales_units) as bl_sales_units,
				sum(ctdc.margin) as bl_margin,
				sum(ctdc.revenue) as bl_revenue,
				sum(ctdc.inventory) as bl_inventory,
				sum(ctdc.markdown_dollar) as bl_markdown_dollar,
				sum(ctdc.sell_through) as bl_sell_through,
				sum(ctdc.ia_inventory) as ia_inventory,
				sum(ctdc.ia_markdown_dollar) as ia_markdown_dollar,
				sum(ctdc.ia_sell_through) as ia_sell_through
			from
				price_markdown_temp.tb_copy_table_data_cte_%2$s ctdc
			group by
				pcd_id
        ) od
	', in_strategy_id,_uuid);
	raise notice ' query 8 ---- %', _query;
	start_time := clock_timestamp();
	execute _query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken Query 8 : %', end_time - start_time;


    execute format('drop table price_markdown_temp.tb_copy_reco_level_values_cte_%1$s ;',_uuid);
	execute format('drop table price_markdown_temp.tb_copy_source_recc_cte_%1$s ;',_uuid);
	execute format('drop table price_markdown_temp.tb_copy_bl_override_cte_%1$s ;',_uuid);
	execute format('drop table price_markdown_temp.tb_copy_dest_bl_cte_%1$s ;',_uuid);
	execute format('drop table price_markdown_temp.tb_copy_current_week_metric_cte_%1$s ;',_uuid);
    execute format('drop table price_markdown_temp.tb_copy_table_data_cte_%1$s',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_copy_overral_overall_metrics_cte_%1$s', in_strategy_id);
	execute format(
        'alter table price_markdown_temp.tb_copy_overral_overall_metrics_cte_%1$s rename to tb_copy_overral_overall_metrics_cte_%2$s;',
        _uuid,
        in_strategy_id
    );
    raise notice '%',format(
        'alter table price_markdown_temp.tb_copy_table_data_cte_%1$s rename to tb_copy_table_data_cte_%2$s ;',
        _uuid,
        in_strategy_id
    );
	execute format(
        'alter table price_markdown_temp.tb_copy_table_data_cte_%1$s rename to tb_copy_table_data_cte_%2$s ;',
        _uuid,
        in_strategy_id
    );

    update price_markdown.tb_strategy_master set last_copy_ia_session_id = in_session_id where strategy_id = in_strategy_id;


end;
$function$
;
