--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_overlap_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_overlap_promos

DROP FUNCTION IF EXISTS price_promo_opt.fn_get_overlap_promos ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_overlap_promos(p_promo_id integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    _result JSONB := '[]'::JSONB; -- Initialize the JSON array to store the final result
    _current_promo_id integer; -- Variable to hold the current promo id
    _fetched_data RECORD; -- Record to hold the output of the called function
    _fin_promos JSONB;
    _draft_promos JSONB;
BEGIN
    -- Loop through each value in the input array
    FOREACH _current_promo_id IN ARRAY p_promo_id LOOP
        -- Call the function for the current promo and fetch draft and fin promos
        _fin_promos := '[]'::JSONB;
        _draft_promos := '[]'::JSONB;

        -- Fetch fin and draft for the current promo
        FOR _fetched_data IN
            select promo_id_return, case when status in (4,8) then 'finalized' else 'draft' end as status from price_promo_opt.fn_get_promos_stack(_current_promo_id) a
			join price_promo.promo_master pm
			on  a.promo_id_return = pm.promo_id
			where promo_id in (select distinct promo_id from price_promo.ia_ps_scenario_discounts pripa
								union select distinct promo_id from price_promo.ps_scenario_discounts)
        LOOP
            IF _fetched_data.status = 'draft' THEN
                _draft_promos := _draft_promos || to_jsonb(_fetched_data.promo_id_return);
            ELSIF _fetched_data.status = 'finalized' THEN
                _fin_promos := _fin_promos || to_jsonb(_fetched_data.promo_id_return);
            END IF;
        END LOOP;

        -- Append the result for the current 'a' to the JSON array
        _result := _result || json_build_object(
            'promo_id', _current_promo_id,
            'draft', _draft_promos,
            'finalized', _fin_promos
        )::jsonb;
    END LOOP;

    RETURN _result;

END;
$function$
;
