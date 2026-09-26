--liquibase formatted sql
--changeset liquibase:get_lower_payload1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for get_lower_payload
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_lower_payload(int4, varchar);

CREATE OR REPLACE FUNCTION ada_configurator.get_lower_payload(exp_id integer, client character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return the JSONB result
    RETURN (

with experiment_details as (
SELECT 
                concat(LOWER(SPLIT_PART(el.exp_level_type::text, '_', 1)), '_split') AS action,
                em.level || '-' || em.experiment_name AS iteration,
                em.created_by,
                em.experiment_name
            FROM ada_configurator.experiment_master em
            inner join ada_configurator.experiment_level el
            on em.experiment_id  = el.experiment_id
            WHERE em.experiment_id = exp_id
            and exp_level_type::text like '%Lower%'
),
user_details AS (
            SELECT 
				um.user_code AS user_id,
                um.email AS user_email
            FROM ada_configurator.experiment_master em
            INNER JOIN "global".user_master um 
                ON em.created_by = um.user_code
            WHERE em.experiment_id = exp_id
        ),
        workstream_details AS (
            SELECT 
				w.workstream_id,
                w.workstream_name
            FROM ada_configurator.experiment_master em
            INNER JOIN ada_configurator.workstream w 
                ON w.workstream_id = em.workstream_id
            WHERE em.experiment_id = exp_id
        ),
		fmt_details as (
				select concat('fmt_schema.',lower(fm.name)) as fmt_name from ada_configurator.experimental_fmt_mapping efm 
				inner join ada_configurator.fmt_metadata fm on fm.id = efm.fmt_metadata_id 
				where efm.experiment_id  = exp_id
		),
		 model_selection_config AS (
            SELECT 
                JSON_OBJECT_AGG(
                    m.model_key,
                    COALESCE(
                        (
                            SELECT JSON_OBJECT_AGG(
                                mp.parameter_name, 
                                emsc.parameter_value
                            )
                            FROM ada_configurator.experiment_model_selection_config emsc
                            INNER JOIN ada_configurator.model_parameters mp 
                                ON mp.param_id = emsc.model_parameter_id
                            WHERE emsc.experiment_id = exp_id 
                              AND mp.model_id = m.model_id
                        ),
                        '{}'::JSON
                    )
                ) AS model_configs
            FROM ada_configurator.models m
            WHERE m.model_level_type = 'Lower' and m.active=true
        ),
        min_data_points AS (select COALESCE((
                    SELECT data_points 
                    FROM ada_configurator.experiment_feature_engg_model_selection efems 
                    WHERE efems.experiment_id = exp_id
                ), 13) AS min_data_point),
        dependent_var_limit AS (select COALESCE((
                    SELECT dependent_var_limit 
                    FROM ada_configurator.experiment_feature_engg_model_selection efems 
                    WHERE efems.experiment_id = exp_id
                ), 0) AS var_limit),
                imputation_config AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'features', JSON_OBJECT_AGG(
                        feature_name, JSON_BUILD_OBJECT(
                            'feature_category', feature_category,
                            'feature_type',  replace(feature_type, 'Numeric', 'Numerical'),
                            'feature_usage', replace(feature_usage, ' Feature', ''),
                            'encoding', encoding,
                           'feature_transformation',STRING_TO_ARRAY(transformation, ','),
                            'elasticity_required', CASE 
                                WHEN elasticity_required THEN 'True' 
                                ELSE 'False' 
                            END
                        )
                    )
                ) AS imputation
            FROM ada_configurator.lower_experiment_feature_imputation_config 
            WHERE experiment_id = exp_id
        ),
        fiscal_week_mapping as (
		-- Fetch all fiscal year weeks for date mapping
		select
			fdm.calendar_date,
			fdm.fiscal_year_week
		from
			"global".fiscal_date_mapping fdm
		),
		train_test_data as (
			select
				JSON_OBJECT_AGG(
			            emsd.method_key,
				coalesce((
				select
					JSON_OBJECT_AGG(ttp.parameter_name, emtt.parameter_value)
				from
					ada_configurator.experiment_model_train_test emtt
				inner join ada_configurator.train_test_parameters ttp on ttp.train_test_id = emtt.train_test_param_id
				where emtt.experiment_id = exp_id and ttp.model_id = emsd.model_selection_data_id), '{}'::JSON)
			        ) as train_test
			from
				ada_configurator.experiment_model_selection_data emsd
			where
				emsd.data_type = 'TrainTest'
		),
		extracted_dates as (
		select
			
				JSON_OBJECT_AGG(
			            key,
			   case
		      		when value::text = '{}' then '{}'::JSON
		    	else 
					JSON_BUILD_OBJECT(
				    'train_start',(select fdm.fiscal_year_week from fiscal_week_mapping fdm where fdm.calendar_date = (value::JSON->>'Training Start Date')::DATE),
					'train_end',(select fdm.fiscal_year_week from fiscal_week_mapping fdm where fdm.calendar_date = (value::JSON->>'Training End Date')::DATE),
					'test_start',(select fdm.fiscal_year_week from fiscal_week_mapping fdm where fdm.calendar_date = (value::JSON->>'Test Start Date')::DATE),
					'test_end',(select fdm.fiscal_year_week from fiscal_week_mapping fdm where fdm.calendar_date = (value::JSON->>'Test End Date')::DATE),
					'full_coverage', (value::JSON->>'Model Coverage'::text),
		             'exclude_dates', (case
                    		WHEN value::JSON->>'Dates to be excluded' = '' OR value::JSON->'Dates to be excluded' IS NULL THEN '[]'::JSON
                    		else   (select
									JSON_AGG(JSON_BUILD_OBJECT(
									'start',(select	fiscal_year_week from fiscal_week_mapping where calendar_date = (dates->>'startDate')::DATE),
									'end',(select fiscal_year_week from	fiscal_week_mapping	where calendar_date = (dates->>'endDate')::DATE)))
								from
									JSONB_ARRAY_ELEMENTS(replace( replace( replace((value::JSON->'Dates to be excluded')::text, '\', ''), '"[', '[' ), ']"', ']' )::JSONB ) as dates ) 
							end))
				end ) as fiscal_weeks 
		from
			train_test_data,
			JSON_EACH_TEXT(train_test::JSON)
		),
		feature_elimination AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'cutoffs', JSON_OBJECT_AGG(
                        emsd.method_key, 
                        COALESCE(efesm.threshold, '0')
                    ),
                    'selection_criteria', (
                        SELECT emsd.method_key 
                        FROM ada_configurator.experiment_model_selection_data_dropdown emsdd
                        INNER JOIN ada_configurator.experiment_model_selection_data emsd 
                            ON emsd.model_selection_data_id = emsdd.model_selection_data_id
                        WHERE emsdd.experiment_id = exp_id 
                          AND emsd.data_type = 'SelectionCriteria' 
                        LIMIT 1
                    )
                ) AS feature_elimination
            FROM ada_configurator.experiment_feature_elimation_selection_methods efesm
            INNER JOIN ada_configurator.experiment_model_selection_data emsd  
                ON emsd.model_selection_data_id = efesm.elimation_id
            WHERE efesm.experiment_id = exp_id
        ),
        data_preparation_config AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'regime', COALESCE((
                        SELECT JSON_OBJECT_AGG(
                            mtsp.parameter_name, 
                            emtsc.parameter_value
                        )
                        FROM ada_configurator.experiment_model_type_selection_configs emtsc
                        INNER JOIN ada_configurator.experiment_model_selection_data emsd 
                            ON emsd.model_selection_data_id = emtsc.model_type_id
                        INNER JOIN ada_configurator.model_type_selection_parameter mtsp 
                            ON mtsp.model_type_parameter_id = emtsc.model_typeparameter_id
                        WHERE emtsc.experiment_id = exp_id 
                          AND emsd.data_type = 'ModelType' 
                          AND emsd.ui_label = 'Regime'
                    ), '{}'::JSON),
                    'drift', COALESCE((
                        SELECT JSON_OBJECT_AGG(
                            mtsp.parameter_name, 
                            emtsc.parameter_value
                        )
                        FROM ada_configurator.experiment_model_type_selection_configs emtsc
                        INNER JOIN ada_configurator.experiment_model_selection_data emsd 
                            ON emsd.model_selection_data_id = emtsc.model_type_id
                        INNER JOIN ada_configurator.model_type_selection_parameter mtsp 
                            ON mtsp.model_type_parameter_id = emtsc.model_typeparameter_id
                        WHERE emtsc.experiment_id = exp_id 
                          AND emsd.data_type = 'ModelType' 
                          AND emsd.ui_label = 'Drift'
                    ), '{}'::JSON)
                ) AS data_preparation
        ),
        best_model_selection_config AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'weight_method', (SELECT DISTINCT ebms.selection_type 
                                      FROM ada_configurator.experiment_best_model_selection ebms
                                      INNER JOIN ada_configurator.experiment_model_selection_data emsd 
                                        ON emsd.model_selection_data_id = ebms.model_id
                                      WHERE ebms.experiment_id = exp_id),
                    'metrics', COALESCE(
                        (
                            SELECT JSON_OBJECT_AGG(
                                emsd.method_key, 
                                (ebms.value::float)/100
                            )
                            FROM ada_configurator.experiment_best_model_selection ebms
                            INNER JOIN ada_configurator.experiment_model_selection_data emsd 
                                ON emsd.model_selection_data_id = ebms.model_id
                            WHERE ebms.experiment_id = exp_id
                        ),
                        '{}'::JSON
                    )
                ) AS best_model_selection
        ),
        aggr_product_info AS (
		    SELECT
		        ARRAY_AGG(level_id::text) AS target_col
		    FROM (
		        SELECT
		            epln.product_level_id::text AS level_id
		        FROM
		            ada_configurator.experiment_product_level_names epln
		        INNER JOIN ada_configurator.experiment_level el ON
		            epln.forecast_id = el.level_id
		        WHERE
		            el.exp_level_type::text like '%_Lower%'
		            AND el.experiment_id = exp_id
		    ) AS combined_levels
		),
		model_product_info AS (
		    SELECT
		        ARRAY_AGG(level_id::text) AS target_col
		    FROM (
		        SELECT
		            epln.product_level_id::text AS level_id
		        FROM
		            ada_configurator.experiment_product_level_names epln
		        INNER JOIN ada_configurator.experiment_level el ON
		            epln.forecast_id = el.level_id
		        WHERE
		            el.exp_level_type::text like '%_Higher%'
		            AND el.experiment_id = exp_id
		    ) AS combined_levels
		),
		distinct_aggr_product_info AS (
		    SELECT UNNEST(target_col) AS level_id
		    FROM aggr_product_info
		),
		distinct_model_product_info AS (
		    SELECT UNNEST(target_col) AS level_id
		    FROM model_product_info
		),
		modelling_product_skip_level_info AS (
			SELECT 
				COALESCE(ARRAY_AGG(dap.level_id::text), ARRAY[]::text[]) AS modelling_skip_levels
			FROM 
			    distinct_aggr_product_info dap
			LEFT JOIN 
			    distinct_model_product_info dmp ON dap.level_id = dmp.level_id
			WHERE 
			    dmp.level_id IS NULL
		),
		aggr_store_info AS (
		    SELECT
		        ARRAY_AGG(level_id::text) AS target_col
		    FROM (
		        SELECT
		            esln.store_level_id::text AS level_id
		        FROM
		            ada_configurator.experiment_store_level_names esln
		        INNER JOIN ada_configurator.experiment_level el ON
		            esln.forecast_id = el.level_id
		        WHERE
		            el.exp_level_type::text like '%_Lower%'
		            AND el.experiment_id = exp_id
		    ) AS combined_levels
		),
		model_store_info AS (
		    SELECT
		        ARRAY_AGG(level_id::text) AS target_col
		    FROM (
		        SELECT
		            esln.store_level_id::text AS level_id
		        FROM
		            ada_configurator.experiment_store_level_names esln
		        INNER JOIN ada_configurator.experiment_level el ON
		            esln.forecast_id = el.level_id
		        WHERE
		            el.exp_level_type::text like '%_Higher%'
		            AND el.experiment_id = exp_id
		    ) AS combined_levels
		),
		distinct_aggr_store_info AS (
		    SELECT UNNEST(target_col) AS level_id
		    FROM aggr_store_info
		),
		distinct_model_store_info AS (
		    SELECT UNNEST(target_col) AS level_id
		    FROM model_store_info
		),
		modelling_store_skip_level_info AS (
			SELECT 
				COALESCE(ARRAY_AGG(dsp.level_id::text), ARRAY[]::text[]) AS modelling_skip_levels
			FROM 
			    distinct_aggr_store_info dsp
			LEFT JOIN 
			    distinct_model_store_info dmp ON dsp.level_id = dmp.level_id
			WHERE 
			    dmp.level_id IS NULL
		),
        aggregation_product_level AS (
            SELECT 
                COALESCE(ARRAY_AGG(product_level_id::text ORDER BY epln.hierarchy), ARRAY[]::text[]) AS product_level
            FROM ada_configurator.experiment_product_level_names epln
            INNER JOIN ada_configurator.experiment_level el 
                ON epln.forecast_id = el.level_id
            WHERE el.exp_level_type::text like '%_Lower%'
              AND el.experiment_id = exp_id
        ),
        aggregation_store_level AS (
            SELECT 
                COALESCE(ARRAY_AGG(store_level_id::text ORDER BY esln.hierarchy), ARRAY[]::text[]) AS store_level
            FROM ada_configurator.experiment_store_level_names esln
            INNER JOIN ada_configurator.experiment_level el 
                ON esln.forecast_id = el.level_id
            WHERE el.exp_level_type::text like '%_Lower%' 
              AND el.experiment_id = exp_id
        ),
        time_level_details AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'calendar_type', (SELECT DISTINCT calendar_type 
                                      FROM ada_configurator.experiment_time_level_names etln  
                                      INNER JOIN ada_configurator.experiment_level el 
                                        ON etln.forecast_id = el.level_id 
                                      WHERE el.experiment_id = exp_id 
                                        AND el.exp_level_type::text like '%_Lower%'
                                      LIMIT 1),
                    'time_granularity_type', (
						SELECT replace(etln.time_level_name, 'fiscal_','')::text
	                        FROM ada_configurator.experiment_time_level_names etln
	                        INNER JOIN ada_configurator.experiment_level el 
	                            ON etln.forecast_id = el.level_id
	                        WHERE el.exp_level_type::text like '%_Lower%'
	                          AND el.experiment_id = exp_id
								ORDER BY etln.hierarchy desc limit 1
                    )
                ) AS time_level
        ),
        modelling_product_level AS (
            SELECT 
                 COALESCE(ARRAY_AGG(product_level_id::text ORDER BY epln.hierarchy), ARRAY[]::text[]) AS product_level
            FROM ada_configurator.experiment_product_level_names epln
            INNER JOIN ada_configurator.experiment_level el 
                ON epln.forecast_id = el.level_id
            WHERE el.exp_level_type::text like '%_Higher%'
              AND el.experiment_id = exp_id
        ),
        modelling_store_level AS (
            SELECT 
                 COALESCE(ARRAY_AGG(store_level_id::text ORDER BY esln.hierarchy), ARRAY[]::text[]) AS store_level
            FROM ada_configurator.experiment_store_level_names esln
            INNER JOIN ada_configurator.experiment_level el 
                ON esln.forecast_id = el.level_id
            WHERE el.exp_level_type::text like '%_Higher%'
              AND el.experiment_id = exp_id
        ),
        modelling_time_level_details AS (
            SELECT 
                JSON_BUILD_OBJECT(
                    'calendar_type', (SELECT DISTINCT calendar_type 
                                      FROM ada_configurator.experiment_time_level_names etln  
                                      INNER JOIN ada_configurator.experiment_level el 
                                        ON etln.forecast_id = el.level_id 
                                      WHERE el.experiment_id = exp_id 
                                        AND el.exp_level_type::text like '%_Higher%'
                                      LIMIT 1),
                    'time_granularity_type', (
                        SELECT replace(etln.time_level_name, 'fiscal_','')::text
                        FROM ada_configurator.experiment_time_level_names etln
                        INNER JOIN ada_configurator.experiment_level el 
                            ON etln.forecast_id = el.level_id
                        WHERE el.exp_level_type::text like '%_Higher%'
                          AND el.experiment_id = exp_id
							ORDER BY etln.hierarchy desc limit 1
                    )
                ) AS time_level
        )
        SELECT JSONB_BUILD_OBJECT(
            'client_config', JSONB_BUILD_OBJECT(
                'client', client
            ),
            'task_config', JSONB_BUILD_OBJECT(
                'action', (SELECT action FROM experiment_details),
                'iteration', (SELECT iteration FROM experiment_details),
				'experiment_id', exp_id,
				'experiment_name', (SELECT experiment_name FROM experiment_details)
            ),
            'user_config', JSONB_BUILD_OBJECT(
                'user', (SELECT user_email FROM user_details),
				'user_id', (SELECT user_id FROM user_details)
            ),
            'workstream_config', JSONB_BUILD_OBJECT(
                'workstream_id', (SELECT workstream_id FROM workstream_details),
                'workstream', (SELECT workstream_name FROM workstream_details)
            ),
            'fmt_config', JSONB_BUILD_OBJECT(
                'postgres_modelling_table', (select fmt_name from fmt_details),
                'partitioned_columns', JSONB_BUILD_ARRAY('l0_name', 'l1_name', 'l2_name')
            ),
            'train_test_config', (SELECT * FROM extracted_dates),
            'best_model_selection_config', (SELECT best_model_selection FROM best_model_selection_config),
            'model_selection', JSON_BUILD_OBJECT(
                'model_configs', (SELECT model_configs FROM model_selection_config),
                'min_data_points', (select min_data_point from min_data_points),
                'dependent_var_limit', (select var_limit from dependent_var_limit)
            ),
            'data_preparation_config', (SELECT data_preparation FROM data_preparation_config),
            'feature_elimination', (SELECT feature_elimination FROM feature_elimination),
            'imputation_config', (SELECT imputation FROM imputation_config),
            'aggregation_level_config', JSON_BUILD_OBJECT(
                'product_level', (SELECT product_level FROM aggregation_product_level),
                'store_level', (SELECT store_level FROM aggregation_store_level),
                'time_level', (SELECT time_level FROM time_level_details)
            ),
            'model_level_config', JSON_BUILD_OBJECT(
                'product_level', JSON_BUILD_OBJECT(
					'modeling_level', (SELECT product_level FROM modelling_product_level),
					'skip_level', (SELECT modelling_skip_levels from modelling_product_skip_level_info)),
                'store_level', JSON_BUILD_OBJECT(
					'modeling_level',(SELECT store_level FROM modelling_store_level),
					'skip_level', (SELECT modelling_skip_levels from modelling_store_skip_level_info)),
                'time_level', (SELECT time_level FROM modelling_time_level_details)
            )
        ) AS full_config
		);
END;
$function$
;
