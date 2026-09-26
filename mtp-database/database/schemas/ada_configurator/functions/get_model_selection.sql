--liquibase formatted sql
--changeset liquibase:get_model_selection2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for get_model_selection1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_model_selection(int4, varchar);

CREATE OR REPLACE FUNCTION ada_configurator.get_model_selection(exp_id integer, exp_type character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    model_type_result JSONB;
    model_result JSONB;
    data_points_data_type_result JSONB;
BEGIN
-- Step 1 Query to fetch model type
 WITH filtered_experiment_model_type_selection_configs AS (
        SELECT
            model_typeparameter_id,
            parameter_value,
            model_type_id
        FROM
            "ada_configurator"."experiment_model_type_selection_configs" emtsc
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
		inner join "ada_configurator".experiment_model_selection_data emsd on emsd.model_selection_data_id = msp.model_selection_id and emsd.model_type=exp_type
        LEFT JOIN
            filtered_experiment_model_type_selection_configs femtp on msp.model_type_parameter_id = femtp.model_typeparameter_id
        WHERE
            msp.display_flag = true AND COALESCE(femtp.parameter_value, msp.default_value) IS NOT NULL
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
            model_parameters_with_values mpw on msd.model_selection_data_id = mpw.model_id
        LEFT JOIN
            filtered_experiment_model_type_selection_configs femtp on msd.model_selection_data_id = femtp.model_type_id
        WHERE
            msd.display_flag = true and msd.model_type=exp_type and msd.data_type='ModelType'
        GROUP BY
            msd.model_selection_data_id, msd.ui_label, msd.display_flag, femtp.model_type_id
    )
	    SELECT
            json_agg(
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
            ) INTO model_type_result
    FROM
        model_type_with_parameters mtw;
        
-- Step 2 query to selected model data
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
            inner join "ada_configurator".models m on mp.model_id = m.model_id and m.model_level_type::text = exp_type
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
                    'parameter_value',  mpw.parameter_value,
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
        from "ada_configurator"."model_classes" mc
        inner join "ada_configurator"."models" m on mc.class_id = m.class_id and m.model_level_type::text = exp_type
        inner join models_with_parameters mwp on m.model_id = mwp.model_id
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
            ada_configurator.experiment_model_selection_config emsc ON mp.param_id = emsc.model_parameter_id
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
        INTO model_result
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
 
-- Step 3 query to data points for high/low level

	WITH data_types AS (
	    SELECT DISTINCT data_type
	    FROM ada_configurator.experiment_model_selection_data
	    WHERE model_type = exp_type 
	    AND data_type IN ('EnsemblingRequired', 'EnsemblingTechnique')
	)
	SELECT jsonb_build_object(
	        'data_points', COALESCE((
	            SELECT data_points 
	            FROM ada_configurator.experiment_feature_engg_model_selection efems 
	            WHERE efems.experiment_id = exp_id
	        ), 13),
	        'dependent_variable', COALESCE((
	            SELECT feature_name 
	            FROM ada_configurator.experiment_feature_imputation_config efic 
	            WHERE efic.experiment_id = exp_id 
	            AND efic.feature_category = 'Dependent'
	        ), (
			SELECT feature_name 
	            FROM ada_configurator.lower_experiment_feature_imputation_config efic 
	            WHERE efic.experiment_id = exp_id 
	            AND efic.feature_category = 'Dependent'
			)),
	        'dependent_var_limit', COALESCE((
	            SELECT dependent_var_limit 
	            FROM ada_configurator.experiment_feature_engg_model_selection efems 
	            WHERE efems.experiment_id = exp_id
	        ), 0),
	    'data_types', jsonb_agg(
	        jsonb_build_object(
	            'data_type', dt.data_type,
	            'default', COALESCE((
	                SELECT emsd.model_selection_data_id
	                FROM ada_configurator.experiment_model_selection_data_dropdown emsdd
	                INNER JOIN ada_configurator.experiment_model_selection_data emsd 
	                ON emsd.model_selection_data_id = emsdd.model_selection_data_id
	                WHERE emsdd.experiment_id = exp_id
	                AND emsd.data_type = dt.data_type
	            ), (
	                SELECT model_selection_data_id
	                FROM ada_configurator.experiment_model_selection_data 
	                WHERE data_type = dt.data_type 
	                AND default_flag = true 
	                AND model_type = exp_type
	            )),
	            'options', (
	                SELECT jsonb_agg(
	                    jsonb_build_object(
	                        'model_selection_data_id', emsd.model_selection_data_id,
	                        'ui_label', emsd.ui_label
	                    )
	                )
	                FROM ada_configurator.experiment_model_selection_data emsd
	                WHERE emsd.data_type = dt.data_type
	                AND emsd.model_type = exp_type
	            )
	        )
	    )
	) AS result_json
	INTO data_points_data_type_result
	FROM data_types dt;

-- Combine all results into one JSONB object
   return jsonb_build_object(
        'ModelTypes', model_type_result,
    	'Models', model_result,
    	'DataPoints', data_points_data_type_result
);
END;
$function$
;
