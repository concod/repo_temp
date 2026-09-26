--liquibase formatted sql
--changeset liquibase:pc_update_approval_status_of_strategy_discounts_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_update_approval_status_of_strategy_discounts_10


DROP PROCEDURE IF EXISTS price_markdown.pc_update_approval_status_of_strategy_discounts;


CREATE OR REPLACE PROCEDURE price_markdown.pc_update_approval_status_of_strategy_discounts(IN p_strategy_id integer, IN p_selected_product_level_ids integer[], IN p_unselected_product_level_ids integer[], IN p_selected_store_level_ids integer[], IN p_unselected_store_level_ids integer[], IN p_pcd_ids integer[], IN p_approval_status character varying, IN p_user_id integer, IN p_pcd_metrics_filter jsonb, IN p_approval_status_filter text[], IN p_in_filters jsonb, IN p_filter_selected boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare
        _approval_status price_markdown.strategy_approval_status_enum;
       _all_discounts_are_withdrawn bool;
      	_min_pcd_start_date date;
       _query text;
       _product_level_ids int[];
       _product_and_store_level_filter text := '';
	   _store_level_ids int[];
	begin
        if p_approval_status = 'approve' then
            _approval_status = 'Initially Approved'::price_markdown.strategy_approval_status_enum;
        else
            _approval_status = 'Not Approved'::price_markdown.strategy_approval_status_enum;
        end if;

		call price_markdown.pc_trim_parent_strategy(p_strategy_id);

        if p_filter_selected then
            _product_and_store_level_filter = format(
                '
                    and (product_level_id, store_level_id) in (
                        select distinct product_level_id, store_level_id
                        from price_markdown.fn_get_step4_filtered_product_and_store_level_ids(
                            ''step4'',
                            %1$s,
                            array[%2$s]::int[],
                            ''%3$s''::jsonb,
                            array[%4$s]::text[],
                            ''%5$s''::jsonb,
                            false
                        )
                    )
                ',
                p_strategy_id,
                array_to_string(p_pcd_ids,','),
                coalesce(p_pcd_metrics_filter,jsonb_build_object())::text,
                array_to_string(array(select quote_literal(unnest(p_approval_status_filter))),','),
                p_in_filters
            )
            ;

        end if;

        if coalesce(array_length(p_selected_product_level_ids,1),0) != 0 then
            _product_and_store_level_filter = format(
                ' and product_level_id = any(array[%1$s]) ',
                array_to_string(p_selected_product_level_ids,',')
            );
        end if;

        if coalesce(array_length(p_unselected_product_level_ids,1),0) != 0 then
            _product_and_store_level_filter = _product_and_store_level_filter || format(
                ' and not product_level_id = any(array[%1$s])',
                array_to_string(p_unselected_product_level_ids,',')
            );

        end if;

		if coalesce(array_length(p_selected_store_level_ids,1),0) != 0 then
            _product_and_store_level_filter = format(
                ' and store_level_id = any(array[%1$s]) ',
                array_to_string(p_selected_store_level_ids,',')
            );
        end if;

        if coalesce(array_length(p_unselected_store_level_ids,1),0) != 0 then
            _product_and_store_level_filter = _product_and_store_level_filter || format(
                ' and not store_level_id = any(array[%1$s])',
                array_to_string(p_unselected_store_level_ids,',')
            );

        end if;


        create temp table tb_tmp_strategy_updated_discounts (
            product_level_id int,
    		store_level_id int
        );
        _query = format(
            '
                with update_approval_status_cte as (
                    update price_markdown.tb_strategy_discount
                    set approval_status = ''%1$s''
                    where strategy_id = %3$s and pcd_id = any(array[%2$s])
                    and approval_status != ''Finally Approved''::price_markdown.strategy_approval_status_enum
                    %4$s
                    returning product_level_id, store_level_id
                )
                insert into tb_tmp_strategy_updated_discounts
                (product_level_id, store_level_id)
                (
                    select
                        distinct product_level_id, store_level_id
                    from
                        update_approval_status_cte
                )
            ',
            _approval_status,
            array_to_string(p_pcd_ids,','),
            p_strategy_id,
            _product_and_store_level_filter
        );

       	raise notice 'query: %',_query;

       	execute _query;

        if p_approval_status = 'withdraw' then
            _all_discounts_are_withdrawn = not exists(
                select 1
                from price_markdown.tb_strategy_discount
                where strategy_id = p_strategy_id
                and approval_status in ('Initially Approved','Finally Approved')
            );
        else
            _all_discounts_are_withdrawn = false;
        end if;

		update
            price_markdown.tb_strategy_master
        set
            status = case
                        when _all_discounts_are_withdrawn then 7
                        when status = 2 then 2
                        else 1
                    end,
            updated_by = p_user_id
        where strategy_id = p_strategy_id
        and status!=3;

        _min_pcd_start_date = (
            select min(pcd_start_date)
            from
                price_markdown.tb_strategy_pcd
            where strategy_id = p_strategy_id
            and pcd_id = any(p_pcd_ids)
        );

        _product_level_ids = array(select product_level_id from tb_tmp_strategy_updated_discounts);
		_store_level_ids = array(select store_level_id from tb_tmp_strategy_updated_discounts);

        call price_markdown_opt.pc_insert_strategy_date_metrics(
            p_strategy_id,
            'ia',
            _min_pcd_start_date
        );

        call price_markdown_opt.pc_insert_strategy_date_metrics(
            p_strategy_id,
            'fin',
            _min_pcd_start_date
        );

        if p_approval_status = 'approve' then
            call price_markdown_opt.pc_insert_approval_metrics(
                p_strategy_id,
                _product_level_ids,
				_store_level_ids
            );
        else
            delete from price_markdown.tb_approval_metrics
            where strategy_id = p_strategy_id
            and product_level_id = any(_product_level_ids)
			and store_level_id = any(_store_level_ids)
            and pcd_id = any(p_pcd_ids);
        end if;


        execute format('
            update price_markdown_temp.tb_strategy_step4_full_%1$s
            set pcd_metrics = price_markdown.fn_update_strategy_simulation_results_json(
                pcd_metrics,
                %2$L,
                jsonb_build_object(
                    ''approval_status'',''%3$s''::price_markdown.strategy_approval_status_enum
                )
            )
            where (product_level_id, store_level_id) in (
		        select product_level_id, store_level_id 
		        from tb_tmp_strategy_updated_discounts
		    )
            ',
            p_strategy_id,
            p_pcd_ids,
            _approval_status
        );

	end;
$procedure$
;
