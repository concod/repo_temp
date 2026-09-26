--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_stop_or_archive_strategy_using_date_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_stop_or_archive_strategy_using_date_1

DROP FUNCTION IF EXISTS price_markdown.fn_stop_or_archive_strategy_using_date;
CREATE OR REPLACE FUNCTION price_markdown.fn_stop_or_archive_strategy_using_date(payload jsonb, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	r record;
    _strategy_object price_markdown.tb_strategy_master%ROWTYPE;
    _strategy_deletion_status int := -1;
	temp_query text := '';
	query text;
begin

	drop table if exists input_data_1;

	create temp table input_data_1 as (
		select * from jsonb_to_recordset(payload) as d(strategy_id int, strategy_name text, strategy_end_date date)
	);

	FOR r IN SELECT * FROM input_data_1
	loop
        select * into _strategy_object from price_markdown.tb_strategy_master tsm where tsm.strategy_id = r.strategy_id;
		raise notice 'strategy_id: %, status: %', r.strategy_id, _strategy_object.status;

		if _strategy_object.status = 3 then

			perform price_markdown.fn_reduce_active_strategy_end_date(r.strategy_id, r.strategy_end_date::date);

			query := format(
                'update price_markdown.tb_strategy_master
                    set updated_by = %3$L, end_date = %1$L, final_data_prepared = false
                    where strategy_id = %2$L
                ',
                r.strategy_end_date::date,
                r.strategy_id,
                _user_id
            );

			raise notice 'query: %', query;
			execute query;

			perform price_markdown.fn_populate_step4_data(r.strategy_id);

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
                r.strategy_id,
                _user_id,
                _strategy_deletion_status
            );
			raise notice 'query: %', query;
			execute query;

		end if;

	end loop;

end;
$function$
;
