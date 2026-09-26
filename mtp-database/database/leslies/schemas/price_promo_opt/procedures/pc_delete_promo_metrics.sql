--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_delete_promo_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_delete_promo_metrics

DROP PROCEDURE IF EXISTS price_promo_opt.pc_delete_promo_metrics ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_delete_promo_metrics(IN p_promo_id integer[] DEFAULT NULL::integer[], IN _scenario_id integer[] DEFAULT NULL::integer[], IN _scenario_delete integer DEFAULT 1, IN _ia_delete integer DEFAULT 1, IN _fin_delete integer DEFAULT 0, IN _offers_mapping_delete integer DEFAULT 0)
 LANGUAGE plpgsql
AS $procedure$

declare

_delete_query text;

_scenario_table_names text[] := '{}';

_table_names text[] := '{}';

_table_name text;

_promo_filter text;

_offers_mapping_delete_query text;

begin

    raise notice '------------------------------------------------------------------------------------------------------';

    if p_promo_id is null and _scenario_id is null then

        raise notice 'There are no scenarios to be refreshed';

    elsif p_promo_id is not null and _scenario_id is null then

        select array_agg(scenario_id) from price_promo.scenario_master sm where promo_id = any(p_promo_id) into _scenario_id;

    end if;

    if _scenario_delete = 1 then

        _scenario_table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_override', 'ps_recommended_scenarios_agg',

                            'ps_recommended_override_agg', 'ps_recommended_scenarios_stack', 'ps_recommended_scenarios_stack_agg',

                            'ps_recommended_scenarios_stack_override', 'ps_recommended_scenarios_stack_override_agg'];

    end if;

    if _ia_delete = 1 then

        _table_names := _table_names || array['ps_recommended_ia_projected', 'ps_recommended_ia_projected_agg', 'ps_recommended_override_ia', 'ps_recommended_override_ia_agg',

                            'ps_recommended_stack_ia', 'ps_recommended_stack_ia_agg', 'ps_recommended_stack_override_ia', 'ps_recommended_stack_override_ia_agg'];

    end if;

    if _fin_delete = 1 then

        _table_names := _table_names || ARRAY['ps_recommended_finalized', 'ps_recommended_finalized_agg', 'ps_recommended_finalized_override', 'ps_recommended_finalized_override_agg',

'ps_recommended_finalized_stack', 'ps_recommended_finalized_stack_agg', 'ps_recommended_finalized_stack_override', 'ps_recommended_finalized_stack_override_agg'];

    end if;

    FOR _table_name IN SELECT unnest(_scenario_table_names)

    loop

        _delete_query = FORMAT('DELETE FROM price_promo.%1$s

 WHERE scenario_id = any(%2$L);', _table_name, _scenario_id);

        raise notice ' delete query for % : %', _table_name, _delete_query;

        execute _delete_query;



    end loop;



    FOR _table_name IN SELECT unnest(_table_names)

LOOP

    IF _table_name IN ('ps_recommended_finalized_stack', 'ps_recommended_finalized_stack_agg',

                       'ps_recommended_finalized_stack_override', 'ps_recommended_finalized_stack_override_agg') THEN

        _promo_filter = FORMAT('promo_ids && %L', p_promo_id);

    ELSE

        _promo_filter = FORMAT('promo_id = ANY(%L)', p_promo_id);

    END IF;



    _delete_query = FORMAT('DELETE FROM price_promo.%1$s WHERE %2$s;', _table_name, _promo_filter);

    RAISE NOTICE 'Delete query for %: %', _table_name, _delete_query;

    EXECUTE _delete_query;

END LOOP;



	if _offers_mapping_delete = 1 then

		 _offers_mapping_delete_query = format('Delete FROM price_promo.tb_promo_stacked_offers_mapping

												WHERE stacked_promo_id = any(%1$L)', p_promo_id);

		raise notice '_offers_mapping_delete_query : %', _offers_mapping_delete_query;

		execute _offers_mapping_delete_query;

	end if;



end;

$procedure$
;
