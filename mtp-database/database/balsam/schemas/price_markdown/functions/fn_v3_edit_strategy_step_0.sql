--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_edit_strategy_step_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_v3_edit_strategy_step_1

DROP FUNCTION if exists price_markdown.fn_v3_edit_strategy_step_0;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_edit_strategy_step_0(p_strategy_id integer, p_strategy_name character varying, p_strategy_comment character varying, p_start_date date, p_end_date date, p_calendar_config_id integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    timeframe_change bool := false;
    is_active_strategy bool := price_markdown.fn_check_is_active_strategy(p_strategy_id);
    current_strategy price_markdown.tb_strategy_master%rowtype;
    _current_date date;

    new_strategy_id integer;
    new_strategy price_markdown.tb_strategy_master%rowtype;
    _new_strategy_start_date date;
BEGIN
    raise notice 'strategy_id : % start', p_strategy_id;

    -- fetch current strategy details.
    select * into current_strategy
    from price_markdown.tb_strategy_master as sm
    where sm.strategy_id = p_strategy_id;

	if current_strategy.strategy_name != p_strategy_name and current_strategy.start_date = p_start_date and current_strategy.end_date = p_end_date and current_strategy.calendar_config_id = p_calendar_config_id then
		update 
	        price_markdown.tb_strategy_master
	    set 
	        strategy_name = p_strategy_name,
	        strategy_comment= p_strategy_comment,
	        updated_by = p_user_id,
	        updated_at = now()
	    where 
	        strategy_id = p_strategy_id;
	
		if current_strategy.step_count = 3 then 
			return -current_strategy.step_count;
		end if;
		return p_strategy_id;
	end if;

    _current_date = date(
        timezone(
            (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'),
            now()
        )
    );

    -- check if edits are allowed based on strategy timeframe, 
    -- if strategy is active and it is running at the last pcd then edit is not allowed.
    if current_strategy.start_date <= _current_date 
       and current_strategy.end_date <= coalesce(
           (select min(pcd_end_date) 
            from price_markdown.tb_strategy_pcd
            where strategy_id = p_strategy_id and pcd_end_date >= _current_date),
           current_strategy.end_date) then
        return p_strategy_id;
    end if;

    -- determine if timeframe change occurred
    if current_strategy.start_date != p_start_date 
       or current_strategy.end_date != p_end_date 
       or current_strategy.calendar_config_id != p_calendar_config_id then
        timeframe_change := true;
    end if;

    -- update strategy details if applicable
    if is_active_strategy then
        raise notice 'strategy is active';
        if current_strategy.strategy_name != p_strategy_name or current_strategy.strategy_comment != p_strategy_comment then
            update 
                price_markdown.tb_strategy_master
            set 
                strategy_name = p_strategy_name,
                strategy_comment = p_strategy_comment,
				updated_by = p_user_id,
                updated_at = now()
            where 
                strategy_id = p_strategy_id;
        end if;

        if not timeframe_change then
            return p_strategy_id;
        end if;

        -- handle if end_date got reduced.
        if p_calendar_config_id = current_strategy.calendar_config_id and p_start_date = current_strategy.start_date and p_end_date < current_strategy.end_date then
            raise notice 'strategy end date reduced';
            perform price_markdown.fn_reduce_active_strategy_end_date(p_strategy_id, p_end_date);
            
            update 
                price_markdown.tb_strategy_master
            set 
                updated_by = p_user_id,
                updated_at = now()
            where 
                strategy_id = p_strategy_id;

            return p_strategy_id;
        end if;

        -- handle if date extended or calendar_config_id change.
        new_strategy_id = price_markdown.fn_v3_copy_strategy(p_strategy_id, p_user_id, null::date, null::date);
        update 
            price_markdown.tb_strategy_master
        set
            step_count = 0,
            status = 0
        where 
            strategy_id = new_strategy_id;

        select * into new_strategy from price_markdown.tb_strategy_master where strategy_id = new_strategy_id;
        if p_start_date != current_strategy.start_date then
            _new_strategy_start_date = p_start_date;
        else
            _new_strategy_start_date = new_strategy.start_date;
        end if;

        return price_markdown.fn_v3_edit_strategy_step_0(
            new_strategy.strategy_id,
            new_strategy.strategy_name,
            p_strategy_comment,
            _new_strategy_start_date,
            p_end_date,
            p_calendar_config_id,
            p_user_id
        );

    else
        raise notice 'strategy is non-active';
        if timeframe_change then
            call price_markdown.pc_clear_strategy_metrics(p_strategy_id);
        else
            update 
                price_markdown.tb_strategy_master
            set 
                strategy_name = p_strategy_name,
                strategy_comment = p_strategy_comment,
                updated_by = p_user_id,
                updated_at = now()
            where 
                strategy_id = p_strategy_id;
            return p_strategy_id;
        end if;

        update 
            price_markdown.tb_strategy_master
        set 
            strategy_name = p_strategy_name,
            strategy_comment= p_strategy_comment,
            start_date = p_start_date,
            end_date = p_end_date,
            calendar_config_id = p_calendar_config_id,
            step_count = 0,
            status = 0,
            final_data_prepared = false,
            updated_by = p_user_id,
            updated_at = now()
        where 
            strategy_id = p_strategy_id;

        if timeframe_change then
            raise notice 'editing pcd';
            --call price_markdown.pc_clear_strategy_discounts(p_strategy_id);
            perform price_markdown.fn_v3_edit_strategy_pcd(
                p_strategy_id,
                p_start_date,
                p_end_date,
                p_calendar_config_id,
                p_user_id
            );

            delete from price_markdown.tb_strategy_discount where strategy_id = p_strategy_id;
            delete from price_markdown.tb_strategy_discount_ia where strategy_id = p_strategy_id;

            call price_markdown_opt.pc_opt_create_materialized_views_sim_splits(p_strategy_id);
        end if;
    end if;

    raise notice 'strategy_id : % end', p_strategy_id;
    return p_strategy_id;
END;
$function$
;
