--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_copy_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_copy_discounts

DROP FUNCTION if exists price_promo.fn_copy_discounts;
CREATE OR REPLACE FUNCTION price_promo.fn_copy_discounts(
    p_promo_id int,
    p_source int,
    p_source_scenario_id int,
    p_target int,
    p_target_scenario_id int,
    p_selected_rows int[],
    p_unselected_rows int[],
    p_filters jsonb,
    p_session_id text,
    p_user_id int,
    p_include_temporary_saved_changes boolean default false
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _filter_condition text = '';
    _bulk_edit_json jsonb;
	_query text;
    _last_session_of_user text;
    _source_data text;
BEGIN

    select 
        session_id
        into _last_session_of_user
    from 
        price_promo.tb_user_promo_session
    where 
        user_id = p_user_id
        and promo_id = p_promo_id;
    
    if coalesce(_last_session_of_user,'') != p_session_id THEN

        delete from price_promo.tb_user_promo_temp_bulk_edit_data
        where user_id = p_user_id and promo_id = p_promo_id;

        delete from price_promo.tb_user_promo_session where promo_id = p_promo_id and user_id = p_user_id;
        insert into price_promo.tb_user_promo_session 
        (promo_id,user_id,session_id)
        values
        (p_promo_id,p_user_id,p_session_id);

    end if;

    if not exists(
        select 1 from price_promo.tb_user_promo_temp_bulk_edit_data
        where user_id = p_user_id and promo_id = p_promo_id
    ) then
        execute format(
            '
            create unlogged table if not exists price_promo.tb_user_promo_temp_bulk_edit_data_%1$s
            (
                id int4 not null,
                user_id int4 not null,
                promo_id int4 not null,
                product_level_id int8 null,
                store_level_id int null,
                customer_level_id int8 null,
                scenario_data jsonb not null,
                ia_recommended_data jsonb null
            )
            partition by list(user_id)
            ',
            p_promo_id
        );

        _query = format(
            '
            create table if not exists price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s
            (
                id int4 not null,
                user_id int4 not null,
                promo_id int4 not null,
                product_level_id int8 null,
                store_level_id int null,
                customer_level_id int8 null,
                scenario_data jsonb not null,
                ia_recommended_data jsonb null
            );

            insert into price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s
            (
                id,
                promo_id,
                user_id,
                product_level_id,
                store_level_id,
                customer_level_id,
                scenario_data,
                ia_recommended_data
            )
            select
                id,
                %1$s as promo_id,
                %2$s as user_id,
                product_level_id,
                store_level_id,
                customer_level_id,
                scenario_data,
                ia_recommended_data
            from price_promo.ps_scenario_discounts
            where promo_id = %1$s;
            ',
            p_promo_id,
            p_user_id
        );

        raise notice 'query %', _query;

        execute _query;

    end if;

    if coalesce(array_length(p_selected_rows, 1),0) > 0 THEN

        _filter_condition = format(
            'and tmp_data.id in (select unnest(%1$L::int[]))',
            p_selected_rows
        );

    elsif coalesce(p_filters, '[]'::jsonb) != '[]'::jsonb THEN
        _filter_condition = format(
            '
            and tmp_data.id in (
                select row_id
                from price_promo.fn_get_promo_discounts(
                    %1$s,
                    1,
                    100000000,
                    p_filters => %2$L,
                    p_include_temporary_saved_changes => %3$L,
                    p_user_id => %4$s
                )        
            )
            ',
            p_promo_id,
            p_filters,
            p_include_temporary_saved_changes,
            p_user_id
        );
    end if;

    if coalesce(array_length(p_unselected_rows, 1),0) > 0 THEN
        _filter_condition = format(
            '
                %1$s
                and tmp_data.id not in (select unnest(%2$L::int[]))
            ',
            _filter_condition,
            p_unselected_rows
        );
    end if;

    if p_source = 0 THEN
        _source_data = 'ia_recommended_data->''0''';
    else
        _source_data = format('scenario_data[''%1$s'']',p_source);
    end if;


    _query = format(
        '
        update price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s tmp_data
        set 
            scenario_data[''%5$s''] = psd.%4$s || jsonb_build_object(
                ''scenario_id'', %6$s,
                ''scenario_order_id'', %5$s,
                ''created_at'',tmp_data.scenario_data[''%5$s''][''created_at''],
                ''created_by'',tmp_data.scenario_data[''%5$s''][''created_by''],
                ''updated_at'',now(),
                ''updated_by'',%2$s,
                ''scenario_type'', ''resimulation''
            )
        from price_promo.ps_scenario_discounts psd
        where tmp_data.promo_id = %1$s
        %3$s
        and tmp_data.id = psd.id
        ',
        p_promo_id,
        p_user_id,
        _filter_condition,
        _source_data,
        p_target,
        p_target_scenario_id
    );

    raise notice 'query %', _query;
    execute _query;


    update price_promo.scenario_master
    set updated_at = now() at time zone 'UTC'
    where promo_id = p_promo_id
    and scenario_order_id = p_target;

    _query = format(
        '
        do $$
        begin
            if not exists (
                select 1 from pg_class c
                join pg_inherits i on i.inhrelid = c.oid
                join pg_class parent on parent.oid = i.inhparent
                where c.relname = ''tb_user_promo_temp_bulk_edit_data_%1$s_%2$s''
                and parent.relname = ''tb_user_promo_temp_bulk_edit_data_%1$s''
            ) then
                alter table price_promo.tb_user_promo_temp_bulk_edit_data_%1$s
                attach partition price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s
                for values in (%2$s);
            end if;

            if not exists (
                select 1 from pg_class c
                join pg_inherits i on i.inhrelid = c.oid  
                join pg_class parent on parent.oid = i.inhparent
                where c.relname = ''tb_user_promo_temp_bulk_edit_data_%1$s''
                and parent.relname = ''tb_user_promo_temp_bulk_edit_data''
            ) then
                alter table price_promo.tb_user_promo_temp_bulk_edit_data
                attach partition price_promo.tb_user_promo_temp_bulk_edit_data_%1$s
                for values in (%1$s);
            end if;
        end $$;
        ',
        p_promo_id,
        p_user_id
    );
    raise notice 'query %', _query;

    execute _query;


END;
$function$
;
