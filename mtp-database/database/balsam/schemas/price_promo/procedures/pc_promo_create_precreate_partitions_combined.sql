--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_promo_create_precreate_partitions_combined_v261124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_promo_create_precreate_partitions_combined

DROP PROCEDURE IF EXISTS price_promo.pc_promo_create_precreate_partitions_combined;

CREATE OR REPLACE PROCEDURE price_promo.pc_promo_create_precreate_partitions_combined()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Call to create predefined partitions for the promo_master table with various partitions

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.promo_store',
        100,
        ''
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.promo_product',
        100,
        ''
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.excluded_products',
        100,
        ''
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.included_products',
        100,
        ''
    );

   -----------PS Fin Tables Start

   	CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_finalized',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

   	CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_finalized_override',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

	-----------PS Scenarios Tables Start
    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.scenario_master_scenario_id_seq',
        'last_value',
        'price_promo.ps_recommended_scenarios',
        200,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.scenario_master_scenario_id_seq',
        'last_value',
        'price_promo.ps_recommended_override',
        200,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.scenario_master_scenario_id_seq',
        'last_value',
        'price_promo.ps_recommended_scenarios_stack',
        200,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.scenario_master_scenario_id_seq',
        'last_value',
        'price_promo.ps_recommended_scenarios_stack_override',
        200,
        'PARTITION BY RANGE (recommendation_date)'
    );

    -----------PS IA Tables Start
    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_ia_projected',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );


    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_override_ia',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_stack_ia',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

   CALL price_promo.pc_create_predefined_partitions(
        'price_promo.promo_master_promo_id_seq',
        'last_value',
        'price_promo.ps_recommended_stack_override_ia',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

END;
$procedure$
;
