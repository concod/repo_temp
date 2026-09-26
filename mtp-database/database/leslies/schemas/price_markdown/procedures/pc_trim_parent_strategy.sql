--liquibase formatted sql
--changeset liquibase:pc_trim_parent_strategy_7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: status update bugfix
--rollback: SELECT 1

DROP PROCEDURE if exists price_markdown.pc_trim_parent_strategy;
CREATE OR REPLACE PROCEDURE price_markdown.pc_trim_parent_strategy(IN p_strategy_id integer)
 LANGUAGE plpgsql
AS $procedure$
	declare
		parent_strategy_record price_markdown.tb_strategy_master%ROWTYPE;
		current_strategy_record price_markdown.tb_strategy_master%ROWTYPE;
		metric varchar;
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

        -- deleting all pcds which are greater than child strategy start date
        delete from price_markdown.tb_strategy_pcd
        where strategy_id = parent_strategy_record.strategy_id
            and pcd_start_date >= current_strategy_record.start_date;

        -- updating last pcd end date to start date of child strategy
        update price_markdown.tb_strategy_pcd
        set pcd_end_date = current_strategy_record.start_date - INTERVAL '1 day'
        where strategy_id = parent_strategy_record.strategy_id
            and pcd_start_date = (
                    select max(pcd_start_date) from
                    price_markdown.tb_strategy_pcd
                    where strategy_id = parent_strategy_record.strategy_id
                );

 		delete from price_markdown.tb_strategy_discount
		where strategy_id = parent_strategy_record.strategy_id
		and pcd_id in (
			select pcd_id from price_markdown.tb_strategy_pcd
			where pcd_start_date >= current_strategy_record.start_date
			and strategy_id = parent_strategy_record.strategy_id
		);

		delete from price_markdown.tb_strategy_discount_ia
		where strategy_id = parent_strategy_record.strategy_id
		and pcd_id in (
			select pcd_id from price_markdown.tb_strategy_pcd
			where pcd_start_date >= current_strategy_record.start_date
			and strategy_id = parent_strategy_record.strategy_id
		);

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