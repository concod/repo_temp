--liquibase formatted sql
--changeset liquibase:pc_trim_parent_strategy_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: migrate discount cleanup from old tables to tb_strategy_discount_level JSONB
--rollback: SELECT 1

DROP PROCEDURE if exists price_markdown.pc_trim_parent_strategy;
CREATE OR REPLACE PROCEDURE price_markdown.pc_trim_parent_strategy(IN p_strategy_id integer)
 LANGUAGE plpgsql
AS $procedure$
	declare
		parent_strategy_record price_markdown.tb_strategy_master%ROWTYPE;
		current_strategy_record price_markdown.tb_strategy_master%ROWTYPE;
		metric varchar;
		_deleted_order_numbers int[];
	begin
		select * into current_strategy_record from price_markdown.tb_strategy_master
		where strategy_id = p_strategy_id;

		select * into parent_strategy_record from price_markdown.tb_strategy_master
		where strategy_id = current_strategy_record.parent_strategy;

		if parent_strategy_record is null then
			raise notice 'no parent record';
			return;
		end if;

		update price_markdown.tb_strategy_master
		set end_date = current_strategy_record.start_date - INTERVAL '1 day'
		where strategy_id = parent_strategy_record.strategy_id;

		for metric in select unnest(array['ia','fin','actual'])
		loop
			begin
				execute 'delete from ' || FORMAT(
								'price_markdown.tb_ssd_%s_%s',
								metric,
								parent_strategy_record.strategy_id::text
								)
						|| FORMAT(' where recommendation_date >= %L',current_strategy_record.start_date)  ;
				execute 'delete from ' || FORMAT(
								' price_markdown.tb_agg_%s_%s ',
								metric,
								parent_strategy_record.strategy_id::text
								)
						|| FORMAT(' where recommendation_date >= %L',current_strategy_record.start_date)  ;
				raise notice 'delete from % %', FORMAT(
								' price_markdown.tb_ssd_%s_%s ',
								metric,
								parent_strategy_record.strategy_id::text
								),
								FORMAT(' where recommendation_date >= %L',current_strategy_record.start_date);
				raise notice 'delete from % %', FORMAT(
								' price_markdown.tb_agg_%s_%s ',
								metric,
								parent_strategy_record.strategy_id::text
								),
								FORMAT(' where recommendation_date >= %L',current_strategy_record.start_date);

			exception
				when sqlstate '42P01' then
					raise notice 'exception handled %', metric;
					continue;
			end;
		end loop;

        -- capture order_numbers of pcds to be deleted before removing them
        select array_agg(order_number) into _deleted_order_numbers
        from price_markdown.tb_strategy_pcd_new
        where strategy_id = parent_strategy_record.strategy_id
            and pcd_start_date >= current_strategy_record.start_date;

        -- deleting all pcds which are greater than child strategy start date
        delete from price_markdown.tb_strategy_pcd_new
        where strategy_id = parent_strategy_record.strategy_id
            and pcd_start_date >= current_strategy_record.start_date;

        -- updating last pcd end date to start date of child strategy
        update price_markdown.tb_strategy_pcd_new
        set pcd_end_date = current_strategy_record.start_date - INTERVAL '1 day'
        where strategy_id = parent_strategy_record.strategy_id
            and pcd_start_date = (
                    select max(pcd_start_date) from
                    price_markdown.tb_strategy_pcd_new
                    where strategy_id = parent_strategy_record.strategy_id
                );

        -- remove deleted PCD keys from tb_strategy_discount_level pcd_data and ia_pcd_data
        if _deleted_order_numbers is not null and array_length(_deleted_order_numbers, 1) > 0 then
            update price_markdown.tb_strategy_discount_level
            set pcd_data = (
                    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                    from jsonb_each(pcd_data) as e(key, value)
                    where not (e.key::int = any(_deleted_order_numbers))
                ),
                ia_pcd_data = (
                    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                    from jsonb_each(ia_pcd_data) as e(key, value)
                    where not (e.key::int = any(_deleted_order_numbers))
                )
            where strategy_id = parent_strategy_record.strategy_id;
        end if;

        delete from price_markdown.tb_strategy_date_metrics_fin
        where strategy_id = parent_strategy_record.strategy_id
        and recommendation_date >= current_strategy_record.start_date;

        delete from price_markdown.tb_strategy_date_metrics_ia
        where strategy_id = parent_strategy_record.strategy_id
        and recommendation_date >= current_strategy_record.start_date;


        call price_markdown_opt.pc_insert_approval_metrics(
            parent_strategy_record.strategy_id
        );

        call price_markdown_opt.pc_insert_stg_metric(parent_strategy_record.strategy_id);


		-- Calling a new procedure to create materialised view for optimisation flow as dates of parent strategy are now updated
        call price_markdown_opt.pc_opt_create_materialized_views_sim_splits(parent_strategy_record.strategy_id);

		raise notice 'trimmed parent record';

	END;
$procedure$
;