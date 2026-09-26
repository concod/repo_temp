--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_copy_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_copy_promos

DROP FUNCTION if exists price_promo.fn_copy_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_copy_promos(p_promo_details jsonb, p_user_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 security definer
AS $function$
DECLARE

    _promo record;
    _new_promo_ids int[];

    _valid_promo_ids int[];
    _conflicting_promo_ids int[];
    _result jsonb;

begin

	drop table if exists tb_tmp_promo_details;
    create temp table tb_tmp_promo_details as
    select  
        (s->>'promo_id')::int as promo_id,
		(s->>'event_id')::int as event_id,
        s->>'new_promo_name' as promo_name,
        (s->>'start_date')::date as start_date,
        (s->>'end_date')::date as end_date
    from 
    jsonb_array_elements(p_promo_details) s;

--    select
--        array_agg(distinct ttpd.promo_id) into _conflicting_promo_ids
--    from price_promo.promo_master pm
--    inner join tb_tmp_promo_details ttpd
--    on 
--        trim(ttpd.promo_name) = trim(pm.name)
--        and pm.start_date <= ttpd.end_date 
--        and pm.end_date >= ttpd.start_date
--    where pm.status != 6;

    _conflicting_promo_ids = coalesce(_conflicting_promo_ids,array[]::int[]);

    raise notice 'conflicting_promo_ids: %',_conflicting_promo_ids;
    raise notice 'valid_promo_ids: %', (select array_agg(promo_id) from tb_tmp_promo_details where not promo_id = any(_conflicting_promo_ids));

    for _promo in (select * from tb_tmp_promo_details where not promo_id = any(_conflicting_promo_ids))
    loop 
        raise notice 'copying promo: %',_promo.promo_id;
		raise notice 'promo object: %', _promo;
        _new_promo_ids = array_append(
            _new_promo_ids,
            price_promo.fn_copy_promo(
                _promo.promo_id,
				_promo.event_id,
                _promo.promo_name,
                _promo.start_date,
                _promo.end_date,
                p_user_id
            )
        );
		raise notice 'new_promo_ids: %',_new_promo_ids;
    end loop;

    SELECT jsonb_agg(
        jsonb_build_object(
            'label', pm.name,
            'value', pm.promo_id
        )
    )
    INTO _result
    FROM price_promo.promo_master pm
    WHERE pm.promo_id = ANY(_new_promo_ids);

    return _result;

end;
$function$
;
