--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_copy_events runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_copy_events

DROP FUNCTION if exists price_promo.fn_copy_events;

CREATE OR REPLACE FUNCTION price_promo.fn_copy_events(p_event_details jsonb, p_user_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE

    _event record;
    _new_event_ids int[];
    _result jsonb;

begin

    drop table if exists tb_tmp_event_details;
    create temp table tb_tmp_event_details as
    select  
        (s->>'event_id')::int as event_id,
        s->>'new_event_name' as event_name,
        (s->>'start_date')::date as start_date,
        (s->>'end_date')::date as end_date,
        (s->>'submit_offers_by')::date as submit_offers_by
    from 
    jsonb_array_elements(p_event_details) s;

    raise notice 'valid_event_ids: %', (select array_agg(event_id) from tb_tmp_event_details);

    for _event in (select * from tb_tmp_event_details)
    loop 
        raise notice 'copying event: %',_event.event_id;
        raise notice 'event object: %', _event;
        _new_event_ids = array_append(
            _new_event_ids,
            price_promo.fn_copy_event(
                _event.event_id,
                _event.event_name,
                _event.start_date,
                _event.end_date,
                _event.submit_offers_by,
                p_user_id
            )
        );
        raise notice 'new_event_ids: %',_new_event_ids;
    end loop;

    SELECT jsonb_agg(
        jsonb_build_object(
            'label', em.name,
            'value', em.event_id
        )
    )
    INTO _result
    FROM price_promo.event_master em
    WHERE em.event_id = ANY(_new_event_ids);

    return _result;

end;
$function$
;
