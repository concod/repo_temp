--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_delete_agg_promo_metrics runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_delete_agg_promo_metrics

DROP PROCEDURE if exists price_promo_opt.pc_delete_agg_promo_metrics;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_delete_agg_promo_metrics(IN p_promo_id integer[] DEFAULT NULL::integer[], IN _scenario_id integer[] DEFAULT NULL::integer[], IN _scenario_delete integer DEFAULT 1, IN _ia_delete integer DEFAULT 1, IN _fin_delete integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    _delete_query TEXT;

    _scenario_table_names TEXT[] := '{}';

    _table_names TEXT[] := '{}';

    _table_name TEXT;

BEGIN

    RAISE NOTICE '------------------------------------------------------------------------------------------------------';



    -- Determine scenarios to refresh

    IF p_promo_id IS NULL AND _scenario_id IS NULL THEN

        RAISE NOTICE 'There are no scenarios to be refreshed';

    ELSIF p_promo_id IS NOT NULL AND _scenario_id IS NULL THEN

        SELECT ARRAY_AGG(scenario_id)

        INTO _scenario_id

        FROM price_promo.scenario_master sm

        WHERE promo_id = ANY(p_promo_id);

    END IF;



    -- Determine scenario-related tables to process

    IF _scenario_delete = 1 THEN

        _scenario_table_names := ARRAY[

            'ps_recommended_scenarios_agg',

            'ps_recommended_override_agg',

            'ps_recommended_scenarios_stack_agg',

            'ps_recommended_scenarios_stack_override_agg'

        ];

    END IF;



    -- Determine IA-related tables to process

    IF _ia_delete = 1 THEN

        _table_names := _table_names || ARRAY[

            'ps_recommended_ia_projected_agg',

            'ps_recommended_override_ia_agg',

            'ps_recommended_stack_ia_agg',

            'ps_recommended_stack_override_ia_agg'

        ];

    END IF;



    -- If finalized deletion is enabled, append the finalized tables

    -- Uncomment the following block if needed:

    -- IF _fin_delete = 1 THEN

    --     _table_names := _table_names || ARRAY[

    --         'ps_recommended_finalized_agg',

    --         'ps_recommended_finalized_override_agg'

    --     ];

    -- END IF;



    -- Process scenario-related tables

    FOR _table_name IN SELECT UNNEST(_scenario_table_names)

    LOOP

        _delete_query := FORMAT(

            'DELETE FROM price_promo.%1$s WHERE scenario_id = ANY(%2$L);',

            _table_name,

            _scenario_id

        );

        RAISE NOTICE 'Delete query for % : %', _table_name, _delete_query;

        EXECUTE _delete_query;

    END LOOP;



    -- Process promo-related tables

     FOR _table_name IN SELECT UNNEST(_table_names)

     LOOP

         _delete_query := FORMAT(

             'DELETE FROM price_promo.%1$s WHERE promo_id = ANY(%2$L);',

             _table_name,

             p_promo_id

         );

         RAISE NOTICE 'Delete query for % : %', _table_name, _delete_query;

         EXECUTE _delete_query;

     END LOOP;

END;

$procedure$
;

