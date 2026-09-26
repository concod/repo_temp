--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_stop_or_archive_strategy_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_stop_or_archive_strategy_3 


DROP FUNCTION IF EXISTS price_markdown.fn_stop_or_archive_strategy;
CREATE OR REPLACE FUNCTION price_markdown.fn_stop_or_archive_strategy(_strategy_ids integer[], _user_id integer DEFAULT 0, _timezone text DEFAULT 'US/Eastern'::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    _strategy_object price_markdown.tb_strategy_master%ROWTYPE;
	pcd_ids integer[];
	curr_pcd_end_date Date;
	strategy_id_ integer;
	check_table_exists boolean = FALSE;
    _strategy_deletion_status int := -1;
	query text;
begin
	if array_length(_strategy_ids, 1) > 0 then
		FOREACH strategy_id_ in array _strategy_ids loop
			select * into _strategy_object from price_markdown.tb_strategy_master tsm where tsm.strategy_id = strategy_id_;
			raise notice 'strategy_id: %, status: %', strategy_id_, _strategy_object.status;


			if _strategy_object.status = 3 then
				select array(select pcd_id from price_markdown.tb_strategy_pcd tsp where tsp.strategy_id = strategy_id_ and tsp.pcd_start_date > date(timezone(_timezone, now()))) into pcd_ids;
				raise notice 'pcd_ids: %', pcd_ids;

				select pcd_end_date into curr_pcd_end_date from price_markdown.tb_strategy_pcd where strategy_id = strategy_id_ and pcd_start_date <= date(timezone(_timezone, now())) and pcd_end_date >= date(timezone(_timezone, now()));
				raise notice 'curr_pcd_end_date: %', curr_pcd_end_date;

				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_strategy_discount_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_strategy_discount_ia_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_agg_fin_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_agg_ia_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_ssd_fin_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_ssd_ia_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(''::text, 'tb_strategy_pcd', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_strategy_date_metrics_fin_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_strategy_date_metrics_ia_', pcd_ids);
				perform price_markdown.fn_delete_startegy_pcds_from_table(strategy_id_::text, 'tb_approval_metrics_', pcd_ids);
				call price_markdown_opt.pc_insert_stg_metric(strategy_id_);

				query := format(
                    'update price_markdown.tb_strategy_master
                        set status = 6, updated_by = %3$L, end_date = %1$L, final_data_prepared = false
                        where strategy_id = %2$L
                    ',
                    curr_pcd_end_date,
                    strategy_id_,
                    _user_id
                );

				raise notice 'query: %', query;
				execute query;

			else

                if _strategy_object.parent_strategy is null or (
                    _strategy_object.status = 2 and _strategy_object.parent_strategy is not null
                ) then
                    _strategy_deletion_status = -1;
                else
                    _strategy_deletion_status = -2;
                end if;

				query := format(
                    '
                        update price_markdown.tb_strategy_master tsm
                        set status = %3$s,
                            updated_by = %2$L,
                            final_data_prepared = false
                        where tsm.strategy_id = %1$L
                    ',
                    strategy_id_,
                    _user_id,
                    _strategy_deletion_status
                );
				raise notice 'query: %', query;
				execute query;

			end if;
		end loop;
	end if;
	return 1;
end;
$function$
;
