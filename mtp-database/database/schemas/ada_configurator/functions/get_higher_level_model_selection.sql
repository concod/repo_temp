--liquibase formatted sql
--changeset liquibase:get_higher_level_model_selection1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for get_higher_level_model_selection
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_higher_level_model_selection(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_higher_level_model_selection(exp_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result_step1 JSONB;
    result_step2_step3 JSONB;
    result_step4 JSONB;
BEGIN
    -- Step 1 Query
    WITH filtered_experiment_model_type_selection_configs AS (
        SELECT
            model_typeparameter_id,
            parameter_value,
            model_type_id
        FROM
            "ada_configurator"."experiment_model_type_selection_configs"
        WHERE
            experiment_id = exp_id
    ),
    model_parameters_with_values AS (
        SELECT
            msp.model_selection_id AS model_id,
            msp.model_type_parameter_id AS id,
            msp.label_name AS label,
            msp.parameter_name,
            msp.start_range,
            msp.end_range,
            msp.list_value,
            COALESCE(femtp.parameter_value, msp.default_value) AS default_value,
            msp.display_flag,
            msp.input_type
        FROM
            "ada_configurator"."model_type_selection_parameter" msp
        LEFT JOIN
            filtered_experiment_model_type_selection_configs femtp
        ON
            msp.model_type_parameter_id = femtp.model_typeparameter_id
        WHERE
            msp.display_flag = true
            AND COALESCE(femtp.parameter_value, msp.default_value) IS NOT NULL
    ),
    model_type_with_parameters AS (
        SELECT
            msd.model_selection_data_id AS model_id,
            msd.ui_label,
            msd.display_flag AS model_display_flag,
            json_agg(
                json_build_object(
                    'id', mpw.id,
                    'label', mpw.label,
                    'input_type', mpw.input_type,
                    'list_value', mpw.list_value,
                    'default_value', mpw.default_value,
                    'start_range', mpw.start_range,
                    'end_range', mpw.end_range
                ) ORDER BY mpw.id
            ) AS dropdown,
            CASE
                WHEN femtp.model_type_id IS NOT NULL THEN true
                ELSE false
            END AS selected
        FROM
            "ada_configurator"."experiment_model_selection_data" msd
        LEFT JOIN
            model_parameters_with_values mpw
        ON
            msd.model_selection_data_id = mpw.model_id
        LEFT JOIN
            filtered_experiment_model_type_selection_configs femtp
        ON
            msd.model_selection_data_id = femtp.model_type_id
        WHERE
            msd.display_flag = true
            AND msd.model_selection_data_id IN (1, 2, 3)
        GROUP BY
            msd.model_selection_data_id, msd.ui_label, msd.display_flag, femtp.model_type_id
    )
    SELECT
        json_build_object(
            'default', json_agg(
                json_build_object(
                    'model_id', mtw.model_id,
                    'ui_label', mtw.ui_label,
                    'dropdown', COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'id', id,
                                    'label', label,
                                    'input_type', input_type,
                                    'list_value', list_value,
                                    'default_value', default_value,
                                    'start_range', start_range,
                                    'end_range', end_range
                                )
                            )
                            FROM model_parameters_with_values
                            WHERE model_id = mtw.model_id
                        ),
                        '[]'::json
                    ),
                    'selected', mtw.selected
                ) ORDER BY mtw.model_id
            )
        ) INTO result_step1
    FROM
        model_type_with_parameters mtw;
    
    -- Step 2 and Step 3 Query
    WITH filtered_experiment_model_configs AS (
        SELECT
            model_parameter_id,
            parameter_value
        FROM
            "ada_configurator"."experiment_model_selection_config"
        WHERE
            experiment_id = exp_id
    ),
    model_parameters_with_values AS (
        SELECT
            mp.model_id,
            mp.param_id,
            mp.label_name,
            mp.parameter_name,
            mp.parameter_type,
            mp.start_range,
            mp.end_range,
            mp.list_values,
            COALESCE(femc.parameter_value, mp.default_value) AS parameter_value,
            mp.display_flag,
            mp.input_type
        FROM
            "ada_configurator"."model_parameters" mp
        LEFT JOIN
            filtered_experiment_model_configs femc
        ON
            mp.param_id = femc.model_parameter_id
    ),
    models_with_parameters AS (
        SELECT
            m.model_id,
            m.model_name,
            json_agg(
                json_build_object(
                    'param_id', mpw.param_id,
                    'label_name', mpw.label_name,
                    'parameter_name', mpw.parameter_name,
                    'parameter_type', mpw.parameter_type,
                    'start_range', mpw.start_range,
                    'end_range', mpw.end_range,
                    'list_value', mpw.list_values,
                    'parameter_value', mpw.parameter_value,
                    'display_flag', mpw.display_flag,
                    'input_type', mpw.input_type
                )
            ) AS parameters
        FROM
            "ada_configurator"."models" m
        JOIN
            model_parameters_with_values mpw
        ON
            m.model_id = mpw.model_id
        GROUP BY
            m.model_id, m.model_name
    ),
    classes_with_models AS (
        SELECT
            mc.class_id,
            mc.class_name,
            json_agg(
                json_build_object(
                    'model_id', mwp.model_id,
                    'model_name', mwp.model_name,
                    'parameters', mwp.parameters
                )
            ) AS models
        FROM
            "ada_configurator"."model_classes" mc
        JOIN
            "ada_configurator"."models" m
        ON
            mc.class_id = m.class_id
        JOIN
            models_with_parameters mwp
        ON
            m.model_id = mwp.model_id
        GROUP BY
            mc.class_id, mc.class_name
    ),
    selected_model_class AS (
        SELECT array_agg(DISTINCT mc.class_name) AS selected_classes
        FROM 
            ada_configurator.model_classes mc
        JOIN 
            ada_configurator.models m ON mc.class_id = m.class_id
        JOIN 
            ada_configurator.model_parameters mp ON m.model_id = mp.model_id
        JOIN 
            ada_configurator.experiment_model_selection_config emsc 
            ON mp.param_id = emsc.model_parameter_id
        WHERE 
            emsc.experiment_id = exp_id
    ),
    selected_model_ids AS (
        SELECT array_agg(DISTINCT mp.model_id) AS selected_models
        FROM 
            ada_configurator.model_parameters mp
        JOIN 
            ada_configurator.experiment_model_selection_config emsc
            ON mp.param_id = emsc.model_parameter_id
        WHERE 
            emsc.experiment_id = exp_id
    ),
    static_data AS (
        SELECT
            smi.selected_models,
            smc.selected_classes
        FROM
            selected_model_ids smi
        CROSS JOIN
            selected_model_class smc
    )
    SELECT
        json_build_object(
            'selected_models', sd.selected_models,
            'selected_classes', sd.selected_classes,
            'classes', ac.classes
        ) AS result
    INTO result_step2_step3
    FROM
        static_data sd,
        (
            SELECT
                json_agg(
                    json_build_object(
                        'class_id', cwm.class_id,
                        'class_name', cwm.class_name,
                        'models', cwm.models
                    )
                ) AS classes
            FROM
                classes_with_models cwm
        ) ac;

    -- Step 4 Query
    WITH default_ensembling_technique AS (
        SELECT json_build_object(
            'type', 'Dropdown',
            'dropdown', json_agg(emsd.ui_label ORDER BY emsd.ui_label),
            'default_value', '' -- Default value if no specific default is needed
        ) AS ensembling_technique
        FROM ada_configurator.experiment_model_selection_data emsd
        WHERE emsd.data_type = 'EnsemblingTechnique'
    ),
    actual_data AS (
        SELECT json_build_object(
            'data_points', COALESCE(efems.data_points, 13),
            'dependent_var_limit', dependent_var_limit,
            'dependent_variable', COALESCE(efi.feature_name, 'qty'),
            'ensembling_required', COALESCE(efems.ensembling_flag, false),
            'ensembling_technique', json_build_object(
                'type', 'Dropdown',
                'dropdown', json_agg(DISTINCT emsd.ui_label ORDER BY emsd.ui_label),
                'default_value', COALESCE(
                    (
                        SELECT emsd_default.ui_label
                        FROM ada_configurator.experiment_model_selection_data emsd_default
                        WHERE emsd_default.model_selection_data_id = efems.ensembling_technique_id
                    ),
                    ''
                )
            )
        ) AS experiment_configuration
        FROM ada_configurator.experiment_feature_engg_model_selection efems
        LEFT JOIN ada_configurator.experiment_feature_imputation_config efi
            ON efems.dependent_feature = efi.id
        LEFT JOIN ada_configurator.experiment_model_selection_data emsd
            ON emsd.model_selection_data_id IN (
                SELECT emsd2.model_selection_data_id
                FROM ada_configurator.experiment_model_selection_data emsd2
                WHERE emsd2.data_type = 'EnsemblingTechnique'
            )
        WHERE efems.experiment_id = exp_id
        GROUP BY efems.id, efi.feature_name, efems.data_points, efems.ensembling_flag, efems.ensembling_technique_id
    )
    SELECT * FROM actual_data
    UNION ALL
    SELECT json_build_object(
        'data_points', 13,
        'dependent_variable', 'qty',
        'ensembling_required', false,
        'ensembling_technique', (SELECT ensembling_technique FROM default_ensembling_technique)
    ) AS experiment_configuration
    WHERE NOT EXISTS (
        SELECT 1
        FROM ada_configurator.experiment_feature_engg_model_selection
        WHERE experiment_id = exp_id
    ) INTO result_step4;

    -- Combine all results into one JSONB object
    RETURN jsonb_build_object(
        'ModelTypes', result_step1,
        'Models', result_step2_step3,
        'DataPoints', result_step4
    );
END;
$function$
;
