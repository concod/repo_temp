--liquibase formatted sql
--changeset liquibase:get_clustering_payload1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for get_clustering_payload
--rollback: SELECT 1

DROP FUNCTION IF EXISTS ada_configurator.get_clustering_payload(int4);

CREATE OR REPLACE FUNCTION ada_configurator.get_clustering_payload(exp_id integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
BEGIN
with basic_exp_info as (
	select
		experiment_id,
		experiment_name
	from
		ada_configurator.experiment_master em
	where
		em.experiment_id = exp_id
		and em.level = 'Clustering'
),
    fmt_info as (
	select
		fm.name as fmt_name,
		ARRAY_AGG(fef.feature_name) as feature_names
	from
		ada_configurator.experimental_fmt_mapping efm
	join 
            ada_configurator.fmt_metadata fm on
		efm.fmt_metadata_id = fm.id
	join 
            ada_configurator.fmd_experimental_features fef on
		fef.feature_id = any(
			array(
				select
					unnest(fm.features)::int
			)
		)
	where
		efm.experiment_id = exp_id
	group by
		fm.name
),
    target_col_info as (
	select
		ARRAY_AGG(
			level_id::text
		) as target_col
	from
		(
			select
				epln.product_level_id::text as level_id
			from
				ada_configurator.experiment_product_level_names epln
			inner join ada_configurator.experiment_level el on
				epln.forecast_id = el.level_id
			where
				el.exp_level_type = 'clustering'
				and el.experiment_id = exp_id
		union all
			select
				esln.store_level_id::text as level_id
			from
				ada_configurator.experiment_store_level_names esln
			inner join ada_configurator.experiment_level el on
				esln.forecast_id = el.level_id
			where
				el.exp_level_type = 'clustering'
				and el.experiment_id = exp_id
		) as combined_levels
),
aggr_product_info as (
	select
		ARRAY_AGG(
			level_id::text
		) as target_col
	from
		(
			select
				epln.product_level_id::text as level_id
			from
				ada_configurator.experiment_product_level_names epln
			inner join ada_configurator.experiment_level el on
				epln.forecast_id = el.level_id
			where
				el.exp_level_type = 'clustering'
				and el.experiment_id = exp_id
		) as combined_levels
),
model_product_info as (
	select
		ARRAY_AGG(
			level_id::text
		) as target_col
	from
		(
			select
				epln.product_level_id::text as level_id
			from
				ada_configurator.experiment_product_level_names epln
			inner join ada_configurator.experiment_level el on
				epln.forecast_id = el.level_id
			where
				el.exp_level_type = 'modelling'
				and el.experiment_id = exp_id
		) as combined_levels
),
distinct_aggr_product_info as (
	select
		unnest(target_col) as level_id
	from
		aggr_product_info
),
distinct_model_product_info as (
	select
		unnest(target_col) as level_id
	from
		model_product_info
),
aggr_store_info as (
	select
		ARRAY_AGG(
			level_id::text
		) as target_col
	from
		(
			select
				esln.store_level_id::text as level_id
			from
				ada_configurator.experiment_store_level_names esln
			inner join ada_configurator.experiment_level el on
				esln.forecast_id = el.level_id
			where
				el.exp_level_type = 'clustering'
				and el.experiment_id = exp_id
		) as combined_levels
),
model_store_info as (
	select
		ARRAY_AGG(
			level_id::text
		) as target_col
	from
		(
			select
				esln.store_level_id::text as level_id
			from
				ada_configurator.experiment_store_level_names esln
			inner join ada_configurator.experiment_level el on
				esln.forecast_id = el.level_id
			where
				el.exp_level_type = 'modelling'
				and el.experiment_id = exp_id
		) as combined_levels
),
distinct_aggr_store_info as (
	select
		unnest(target_col) as level_id
	from
		aggr_store_info
),
distinct_model_store_info as (
	select
		unnest(target_col) as level_id
	from
		model_store_info
),
level_of_clustering_product_info as (
	select
		coalesce(
			ARRAY_AGG(
				dap.level_id::text
			),
			array[]::text[]
		) as level_of_product_clustering
	from
		distinct_aggr_product_info dap
	left join 
	    distinct_model_product_info dmp on
		dap.level_id = dmp.level_id
	where
		dmp.level_id is null
),
level_of_clustering_store_info as (
	select
		coalesce(
			ARRAY_AGG(
				dap.level_id::text
			),
			array[]::text[]
		) as level_of_store_clustering
	from
		distinct_aggr_store_info dap
	left join 
	    distinct_model_store_info dmp on
		dap.level_id = dmp.level_id
	where
		dmp.level_id is null
),
value_range_for_no_of_clusters as (
	select
		MIN(parameter_value::int) as start_value,
		MAX(parameter_value::int) as end_value
	from
		ada_configurator.experiment_model_type_selection_configs emtsc
	inner join
            ada_configurator.experiment_model_selection_data emsd on
		emtsc.model_type_id = emsd.model_selection_data_id
	where
		emtsc.experiment_id = exp_id
		and emsd.data_type = 'ModelType'
		and emsd.method_key = 'common_parameter'
		and model_type = 'Clustering'
),
    no_of_clusters_info as (
	select
		ARRAY_AGG(num) as no_of_clusters
	from
		(
			select
				generate_series(
					start_value,
					end_value
				) as num
			from
				value_range_for_no_of_clusters
		) as series
),
    algorithms_info as (
	select
		coalesce(
			ARRAY_AGG(ms.model_name),
			array[]::text[]
		) as algorithms
	from
		ada_configurator.models ms
	where
		ms.model_level_type = 'Clustering'
		and 
            ms.model_id in (
			select
				distinct mp.model_id
			from
				ada_configurator.model_parameters mp
			inner join ada_configurator.experiment_model_selection_config emsc on
				mp.param_id = emsc.model_parameter_id
			where
				emsc.experiment_id = exp_id
		)
),
     parameters_info as (
	select
		coalesce(
			jsonb_object_agg(
				model_name,
				parameters
			),
			'{}'::jsonb
		) as parameters
	from
		(
			select
				ms.model_name,
				jsonb_object_agg(mp.parameter_name,
					case
					    when emsc.parameter_value like '[%' and emsc.parameter_value like '%]' then
					        (
					            select
					                jsonb_agg(
					                    case
					                        when value ~ '^-?[0-9]+(\.[0-9]+)?$' then
					                            (value::text)::numeric::text::jsonb
					                        else
					                            ('"' || value || '"')::jsonb
					                    end
					                )
					            from
					                jsonb_array_elements_text(emsc.parameter_value::jsonb) as value
					        )
					    when emsc.parameter_value ~ '^-?[0-9]+(\.[0-9]+)?$' then
					        emsc.parameter_value::numeric::text::jsonb
					    else
					        emsc.parameter_value::jsonb
					end
) as parameters
			from
				ada_configurator.model_parameters mp
			inner join 
            ada_configurator.experiment_model_selection_config emsc
            on
				emsc.model_parameter_id = mp.param_id
			inner join 
            ada_configurator.models ms 
            on
				ms.model_id = mp.model_id
			where
				emsc.experiment_id = exp_id
			group by
				ms.model_name
		) as subquery
),
numerical_columns_info as (
	select
		null as numerical_columns,
		jsonb_build_object(
			'default',
			'zero'
		) as numerical_imputation
	from
		(
			select
				exp_id as experiment_id
		) as e
	left join 
            ada_configurator.experiment_clustering_feature_imputation_config ecfi on
		ecfi.experiment_id = e.experiment_id
			and ecfi.feature_type = 'Numeric'
		where
			ecfi.experiment_id is null
	union all
		select
			coalesce(
				array_agg(ecfi.feature_name),
				null
			) as numerical_columns,
			jsonb_object_agg(
				ecfi.feature_name,
				imputation_method_type_based
			) || jsonb_build_object(
				'default',
				'zero'
			) as numerical_imputation
		from
			ada_configurator.experiment_clustering_feature_imputation_config ecfi
		where
			ecfi.experiment_id = exp_id
			and ecfi.feature_type = 'Numeric'
		group by
			ecfi.experiment_id
),
    categorical_columns_info as (
	select
		null as categorical_columns,
		jsonb_build_object(
			'default',
			'NA'
		) as categorical_imputation
	from
		(
			select
				exp_id as experiment_id
		) as e
	left join 
            ada_configurator.experiment_clustering_feature_imputation_config ecfi on
		ecfi.experiment_id = e.experiment_id
			and ecfi.feature_type = 'Categorical'
		where
			ecfi.experiment_id is null
	union all
		select
			coalesce(
				array_agg(ecfi.feature_name),
				null
			) as categorical_columns,
			jsonb_object_agg(
				ecfi.feature_name,
				imputation_method_type_based
			) || jsonb_build_object(
				'default',
				'NA'
			) as categorical_imputation
		from
			ada_configurator.experiment_clustering_feature_imputation_config ecfi
		where
			ecfi.experiment_id = exp_id
			and ecfi.feature_type = 'Categorical'
		group by
			ecfi.experiment_id
),
    high_cardinality_imputation_info as (
	select
		BOOL_OR(high_cardinality) as high_cardinality_imputation,
		case
			when MIN(cast(hci_thresold_cutoff as numeric)) is not null 
        then MIN(cast(hci_thresold_cutoff as numeric))
			else 0.05
		end as high_cardinality_threshold
	from
		ada_configurator.experiment_clustering_feature_imputation_config
	where
		experiment_id = exp_id
),
    high_cardinality_features_info as (
	select
		case
			when coalesce(
				array_agg(ecfic.feature_name)
			) is not null then 
                jsonb_build_object(
				'frequency',
				coalesce(
					array_agg(ecfic.feature_name)
				)
			)
			else null
		end as high_cardinality_features
	from
		ada_configurator.experiment_clustering_feature_imputation_config ecfic
	join 
            high_cardinality_imputation_info hci on
		hci.high_cardinality_imputation = true
	where
		ecfic.feature_type = 'Categorical'
		and ecfic.experiment_id = exp_id
),
    numerical_transformation_info as (
	select
		jsonb_build_object(
			'default',
			'min-max-scaler'
		) as numerical_imputation
union all
	select
		jsonb_object_agg(
			ecfi.feature_name,
			transformation
		) as numerical_imputation
	from
		ada_configurator.experiment_clustering_feature_imputation_config ecfi
	where
		ecfi.experiment_id = exp_id
		and ecfi.feature_type = 'Numeric'
		and ecfi.transformation = 'No Transformation'
	group by
		ecfi.experiment_id
),
    categorical_transformation_info as (
	select
		jsonb_build_object(
			'default',
			'one-hot-encoding'
		) as categorical_transformation
union all
	select
		jsonb_object_agg(
			ecfi.feature_name,
			transformation
		) || jsonb_build_object(
			'default',
			'one-hot-encoding'
		) as categorical_transformation
	from
		ada_configurator.experiment_clustering_feature_imputation_config ecfi
	where
		ecfi.experiment_id = exp_id
		and ecfi.feature_type = 'Categorical'
		and ecfi.feature_encoding <> 'No Encoding'
	group by
		ecfi.experiment_id
),
    best_model_selection_weightage_info as (
	select
		jsonb_object_agg(
			emsd.method_key,
			ebms.value::float / 100
		) as best_model_selection_weightage
	from
		ada_configurator.experiment_model_selection_data emsd
	inner join 
            ada_configurator.experiment_best_model_selection ebms on
		ebms.model_id = emsd.model_selection_data_id
	where
		ebms.experiment_id = exp_id
),
    dimentionality_reduction_info as (
	select
		case
			when COUNT(emsdd.model_selection_data_id) > 0 then 'PCA'
			else null
		end as dimentionality_reduction
	from
		ada_configurator.experiment_model_selection_data_dropdown emsdd
	where
		emsdd.experiment_id = exp_id
		and emsdd.model_selection_data_id in (
			select
				model_selection_data_id
			from
				ada_configurator.experiment_model_selection_data emsd
			where
				emsd.method_key = 'Yes'
				and emsd.data_type = 'PCASelectionCriteria'
				and emsd.model_type = 'Clustering'
		)
),
    dimentionality_reduction_variance_threshold_info as (
	select
		coalesce(
			min(efesm.threshold),
			'0.05'
		) as thresholds
	from
		ada_configurator.experiment_feature_elimation_selection_methods efesm
	inner join ada_configurator.experiment_model_selection_data emsd on
		emsd.model_selection_data_id = efesm.elimation_id
		and emsd.method_key = 'PCA_variance_threshold'
		and emsd.data_type = 'EliminationPCA'
		and emsd.model_type = 'Clustering'
		and efesm.experiment_id = exp_id
),
    remove_zero_variance_features_info as (
	select
		case
			when COUNT(efesm.threshold) = 0 then false
			else (
				bool_or(
					efesm.threshold is null
						or efesm.threshold <> 'true'
				)
			)
		end as remove_zero_variance_features
	from
		ada_configurator.experiment_feature_elimation_selection_methods efesm
	where
		efesm.elimation_id in (
			select
				model_selection_data_id
			from
				ada_configurator.experiment_model_selection_data emsd
			where
				emsd.method_key = 'variance'
				and emsd.model_type = 'Clustering'
		)
		and efesm.experiment_id = exp_id
)
    select
	jsonb_build_object(
		'main_task_id',
		exp_id::text,
		'runner',
		'experiment',
		'query',
		'select * from fmt_schema.' || fi.fmt_name,
		'feature_names',
		fi.feature_names,
		'target_col',
		tci.target_col,
		'level_of_clustering',
		array_cat(
			lcpi.level_of_product_clustering,
			lcsi.level_of_store_clustering
		),
		'no_of_clusters',
		nci.no_of_clusters,
		'algorithms',
		ai.algorithms,
		'parameters',
		pi.parameters,
		'numerical_columns',
		nuci.numerical_columns,
		'categorical_columns',
		catci.categorical_columns,
		'numerical_imputation',
		nuci.numerical_imputation,
		'categorical_imputation',
		catci.categorical_imputation,
		'high_cardinality_imputation',
		hcii.high_cardinality_imputation,
		'high_cardinality_features',
		hcfi.high_cardinality_features,
		'high_cardinality_threshold',
		hcii.high_cardinality_threshold,
		'numerical_transformation',
		nti.numerical_imputation,
		'categorical_transformation',
		cti.categorical_transformation,
		'best_model_selection_weightage',
		bmswi.best_model_selection_weightage,
		'remove_zero_variance_features',
		rzvfi.remove_zero_variance_features,
		'dimentionality_reduction',
		dri.dimentionality_reduction,
		'dimentionality_reduction_variance_threshold',
		drvti.thresholds
	) into result
from
	basic_exp_info bei,
	fmt_info fi,
	target_col_info tci,
	level_of_clustering_product_info lcpi,
	level_of_clustering_store_info lcsi,
	no_of_clusters_info nci,
	algorithms_info ai,
	parameters_info pi,
	numerical_columns_info nuci,
	categorical_columns_info catci,
	high_cardinality_imputation_info hcii,
	high_cardinality_features_info hcfi,
	numerical_transformation_info nti,
	categorical_transformation_info cti,
	best_model_selection_weightage_info bmswi,
	remove_zero_variance_features_info rzvfi,
	dimentionality_reduction_info dri,
	dimentionality_reduction_variance_threshold_info drvti;


    RETURN result;
END;
$function$
;
