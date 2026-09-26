--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_delete_non_finalized_promo_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_delete_non_finalized_promo_metrics

DROP PROCEDURE IF EXISTS price_promo_opt.pc_delete_non_finalized_promo_metrics ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_delete_non_finalized_promo_metrics(IN p_promo_id integer[] DEFAULT NULL::integer[], IN _scenario_id integer[] DEFAULT NULL::integer[], IN _delete_ia integer DEFAULT 1)
 LANGUAGE plpgsql
AS $procedure$

declare

_delete_query text;

_table_names text[];

_ia_table_names text[];

_table_name text;

begin

	if p_promo_id is null and _scenario_id is null then

		raise notice 'There are no scenarios to be refreshed';

	elsif p_promo_id is not null and _scenario_id is null then

		select array_agg(scenario_id) from price_promo.scenario_master sm where promo_id = any(p_promo_id) into _scenario_id;

	end if;

	

	if _delete_ia = 0 then

		_table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_override', 'ps_recommended_scenarios_agg', 

							'ps_recommended_override_agg', 'ps_recommended_scenarios_stack', 'ps_recommended_scenarios_stack_agg', 

							'ps_recommended_scenarios_stack_override', 'ps_recommended_scenarios_stack_override_agg'];

	else

		_table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_override', 'ps_recommended_scenarios_agg', 

							'ps_recommended_override_agg', 'ps_recommended_scenarios_stack', 'ps_recommended_scenarios_stack_agg', 

							'ps_recommended_scenarios_stack_override', 'ps_recommended_scenarios_stack_override_agg'];

		_ia_table_names := array['ps_recommended_ia_projected', 'ps_recommended_ia_projected_agg', 'ps_recommended_override_ia', 'ps_recommended_override_ia_agg',

							'ps_recommended_stack_ia', 'ps_recommended_stack_ia_agg', 'ps_recommended_stack_override_ia', 'ps_recommended_stack_override_ia_agg'];

	end if;



	FOR _table_name IN SELECT unnest(_table_names)

    loop

	    _delete_query = FORMAT('DELETE FROM price_promo.%1$s

								WHERE scenario_id = any(%2$L);', _table_name, _scenario_id);

		raise notice ' delete query for % : %', _table_name, _delete_query;

		execute _delete_query;

    	

    end loop;

   

   	if _delete_ia = 1 then

   		FOR _table_name IN SELECT unnest(_ia_table_names)

    	loop

	    _delete_query = FORMAT('DELETE FROM price_promo.%1$s

								WHERE promo_id = any(%2$L);', _table_name, p_promo_id);

		raise notice ' delete query for % : %', _table_name, _delete_query;

		execute _delete_query;

    	

    	end loop;

   	end if;

   	

end;

$procedure$
;
