from collections import defaultdict

dependency_map = {
    # Create a DAG of the tables to maintain order of execution
    'global.application_master': ['global.action_master'],
    'global.action_master': ['global.roles_master'],
    'global.roles_master': ['global.screen_master'],
    'global.screen_master': ['global.acl_master', 'global.module_master'],
    'global.module_master': ['global.tenant_attribute_master', 'global.role_action_module_mapping', 'global.configurator_frontend_templates'],
    'global.role_action_module_mapping': ['global.dimensions'],
    'global.filter_configurations': ['global.filter_configurations_mapping'],
    'global.table_configurations': ['global.table_configurations_mapping'],
    'global.keyboard_shortcut_actions': ['global.keyboard_shortcut_keys'],
    'global.configurator_frontend_templates': ['global.configurator_sidelayout'],
    'global.configurator_sidelayout': ['global.configurator_mandatory_attributes'],
    'datamodel.tb_app_actiontypemst': ['datamodel.tb_app_model_action_mapping'],
    'datamodel.tb_app_modelmst': ['datamodel.tb_app_model_parameter_mapping'],
    'datamodel.tb_app_model_parametermst': ['datamodel.tb_app_model_parameter_mapping', 'datamodel.tb_app_modelmst'],
    'datamodel.tb_app_modeltypemst': ['datamodel.tb_app_pre_post_actionsmst'],
    'datamodel.tb_app_pre_post_actionsmst': ['datamodel.tb_app_model_action_mapping'],
    'datamodel.tb_app_validationrulesmst': ['datamodel.tb_db_connection'],
    'datamodel.tb_db_connection': ['datamodel.tb_db_providers'],
    'datamodel.tb_sql_query_store': ['datamodel.tb_app_modelmst'],
    'datamodel.tb_db_providers': ['datamodel.tb_sql_query_store'],
    'meta_schema.tb_lock_and_hold_def':['meta_schema.tb_editableflow_master','meta_schema.tb_kpi_config'],
    'data_platform.table_info': ['data_platform.custom_qc'],
    'ada_configurator.workstream': ['ada_configurator.experiment_master', 'ada_configurator.fmt_metadata'],
    'ada_configurator.workstream_level_mapping': ['ada_configurator.workstream'],
    'ada_configurator.workstream_level':['ada_configurator.workstream_level_mapping', 'ada_configurator.workstream_output_product_level_names', 'ada_configurator.workstream_output_store_level_names'],
    'ada_configurator.model_classes': ['ada_configurator.models'],
    'ada_configurator.models': ['ada_configurator.model_parameters'],
    'ada_configurator.model_parameters': ['ada_configurator.experiment_model_selection_config'],
    'ada_configurator.train_test_parameters':['ada_configurator.experiment_model_train_test'],
    'ada_configurator.experiment_model_selection_data': ['ada_configurator.experiment_model_selection_data_dropdown','ada_configurator.experiment_best_model_selection','ada_configurator.feature_elimation_config', 'ada_configurator.train_test_parameters', 'ada_configurator.model_type_selection_parameter', 'ada_configurator.experiment_model_type_selection_configs', 'ada_configurator.experiment_feature_elimation_selection_methods', 'ada_configurator.experiment_feature_engg_model_selection'],
    'ada_configurator.experiment_master': ['ada_configurator.experimental_fmt_mapping','ada_configurator.experiment_model_train_test','ada_configurator.experiment_model_selection_data_dropdown','ada_configurator.experiment_model_selection_config','ada_configurator.experiment_level','ada_configurator.experiment_feedback','ada_configurator.experiment_best_model_selection', 'ada_configurator.experiment_model_type_selection_configs', 'ada_configurator.model_type_selection_parameter', 'ada_configurator.experiment_clustering_feature_imputation_config', 'ada_configurator.experiment_feature_elimation_selection_methods', 'ada_configurator.experiment_feature_engg_model_selection', 'ada_configurator.experiment_feature_imputation_config', 'ada_configurator.lower_experiment_feature_imputation_config'],
    'ada_configurator.experiment_level':['ada_configurator.experiment_product_level_names', 'ada_configurator.experiment_store_level_names','ada_configurator.experiment_time_level_names'],
    'ada_configurator.model_type_selection_parameter': ['ada_configurator.experiment_model_type_selection_configs'],
    'ada_configurator.fmd_global_sources': ['ada_configurator.fmd_global_features'],
    'ada_configurator.fmd_agg_level': ['ada_configurator.fmd_experimental_features', 'ada_configurator.fmd_global_features', 'ada_configurator.fmt_metadata'],
    'ada_configurator.fmd_experimental_sources': ['ada_configurator.fmd_experimental_features'],
    'ada_configurator.fmd_experimental_features': ['ada_configurator.experiment_clustering_feature_imputation_config'],
    'ada_configurator.experiment_feature_imputation_config': ['ada_configurator.experiment_feature_elimation_selection_methods'],
    'ada_configurator.lws_mapping': ['ada_configurator.workstream_level'],
    'ada_configurator.lws_level': ['ada_configurator.lws_mapping', 'ada_configurator.workstream_output_product_level_names', 'ada_configurator.workstream_output_store_level_names'],
    'metaschema.tb_app_master': ['metaschema.tb_app_sub_master'],
    'global.rcl_product_mapping_product_store_rule': ['global.rcl_product_mapping_product_store'],
    'monday_smart.kpi_categories_master': ['monday_smart.kpis_master', 'monday_smart.format_master'],
    'monday_smart.kpis_master': ['monday_smart.kpi_threshold_master'],
    'monday_smart.kpi_threshold_master': ['monday_smart.combination_master'],
    'global.acl_master': ['global.user_access_hierarchy_mapping'],
    'global.user_master': ['global.user_access_hierarchy_mapping'],
    'monday_smart.kpi_categories_master_causal': ['monday_smart.kpis_master_causal', 'monday_smart.kpis_master_causal_v2'],
    'monday_smart.kpis_master_causal_v2' : ['monday_smart.prompt_version'],
    'base_pricing.bp_customer_segment_config': ['base_pricing.bp_customer_segment_master'],
    'base_pricing.bp_actions' : ['base_pricing.bp_ongoing_strategy_action_status_transitions', 'base_pricing.bp_upcoming_strategy_action_status_transitions'],
    'base_pricing.bp_sync_status': ['base_pricing.bp_ongoing_strategy_action_status_transitions', 'base_pricing.bp_upcoming_strategy_action_status_transitions'],
    'base_pricing.bp_strategy_status_level': ['base_pricing.bp_ongoing_strategy_action_status_transitions', 'base_pricing.bp_upcoming_strategy_action_status_transitions'],
    'base_pricing.bp_rule_master': ['base_pricing.bp_rule_types'],
    'base_pricing.bp_channel_cost_logic_config': ['base_pricing.bp_channel_cost_components_mapping'],
    'base_pricing.bp_cost_components_config': ['base_pricing.bp_channel_cost_components_mapping'],
    "base_pricing.bp_reporting_attributes_metadata":["base_pricing.bp_template_attributes_mapping"],
    "base_pricing.bp_templates_metadata":["base_pricing.bp_template_attributes_mapping"],
    "visual_line_planning.line_plan":["visual_line_planning.line_plan_products", "visual_line_planning.presentation_line_plan_join_table"],
    "visual_line_planning.line_plan_products":["visual_line_planning.slide_products_join_table","visual_line_planning.media_items"],
    "visual_line_planning.presentations":["visual_line_planning.presentation_comments","visual_line_planning.user_presentation_mapping", "visual_line_planning.presentation_line_plan_join_table", "visual_line_planning.presentation_slide_join_table"],
    "visual_line_planning.slides":["visual_line_planning.slide_products_join_table", "visual_line_planning.presentation_slide_join_table"],
    "visual_line_planning.product_master_new":["visual_line_planning.line_plan_products"],
    "visual_line_planning.moodboards":["visual_line_planning.subboards"],
    "visual_line_planning.subboards":["visual_line_planning.media_items"],
    "visual_line_planning.media_items":["visual_line_planning.comments"],
    "visual_line_planning.product_master_new": ["visual_line_planning.line_plan_products"],
    "source_smart.asn_master": ["source_smart.po_schedule_master", "source_smart.product_master", "source_smart.store_master", "source_smart.vendor_master", "source_smart.facility_master"],
    "source_smart.facility_construction_type_capacity": ["source_smart.construction_type_master", "source_smart.facility_master"],
    "source_smart.facility_master": ["source_smart.vendor_master"],
    "source_smart.facility_overall_capacity": ["source_smart.facility_master"],
    "source_smart.facility_summary_by_construction_type_weekly": ["source_smart.construction_type_master", "source_smart.vendor_master", "source_smart.store_master"],
    "source_smart.facility_summary_weekly": ["source_smart.facility_master", "source_smart.store_master", "source_smart.vendor_master"],
    "source_smart.granular_forecast_table": ["source_smart.season_master", "source_smart.product_master", "source_smart.store_master"],
    "source_smart.po_schedule_master": ["source_smart.po_master", "source_smart.product_master", "source_smart.store_master", "source_smart.facility_master"],
    "source_smart.po_master": ["source_smart.vendor_master"],
    "source_smart.product_master": ["source_smart.construction_type_master"],
    "source_smart.production_history": ["source_smart.season_master", "source_smart.vendor_master", "source_smart.facility_master", "source_smart.store_master", "source_smart.product_master", "source_smart.construction_type_master"],
    "source_smart.season_product_mapping": ["source_smart.season_master", "source_smart.product_master"],
    "source_smart.supplier_po_metrics": ["source_smart.facility_master", "source_smart.po_master", "source_smart.po_schedule_master", "source_smart.product_master", "source_smart.vendor_master"],
    "source_smart.vendor_capacity": ["source_smart.vendor_master"],
    "source_smart.vendor_summary_by_construction_type_weekly": ["source_smart.construction_type_master", "source_smart.vendor_master", "source_smart.store_master"],
    "source_smart.vendor_summary_weekly": ["source_smart.vendor_master", "source_smart.store_master"],
    "source_smart.available_capacity_values": ["source_smart.available_capacity_rule"],
    "source_smart.committed_capacity_values": ["source_smart.committed_capacity_rule"],
    "source_smart.committed_capacity_rule": ["source_smart.committed_capacity_rcl"],
    "source_smart.available_capacity_rule": ["source_smart.available_capacity_rcl"],
    "source_smart.allocation_rule": ["source_smart.allocation_filters", "source_smart.allocation_rcl", "source_smart.allocation_strategy", "source_smart.season_master", "source_smart.sourcing_class_master"],
    "source_smart.allocation_rules_mapping": ["source_smart.allocation_rule", "source_smart.allocation_rcl"],
    "source_smart.stylecolor_facility_mapping": ["source_smart.facility_master"],
    "source_smart.facility_cost_summary": ["source_smart.product_master", "source_smart.facility_master", "source_smart.store_master", "source_smart.season_master", "source_smart.construction_type_master"],
    "source_smart.facility_lead_time_summary": ["source_smart.product_master", "source_smart.facility_master", "source_smart.store_master", "source_smart.season_master", "source_smart.construction_type_master"],
    "source_smart.facility_group_master": ["source_smart.facility_master"],
    "source_smart.allocation_constraint_details": ["source_smart.allocation_constraints"],
    "source_smart.allocation_plan_rules": ["source_smart.allocation_plans"],
    "monday_smart.kpis_master_intermediate_v2": ["monday_smart.kpis_master_v2"],
    "monday_smart.kpis_master_v2" : ["monday_smart.alerts_processor"],
    "monday_smart.notifications" : ["monday_smart.notification_channel"],
    "monday_smart.alerts" : ["monday_smart.alerts_history"],
    "pricesmart.tb_forms" : ["pricesmart.tb_form_sections"],
    "pricesmart.tb_form_sections" : ["pricesmart.tb_form_attributes"],
    "pricesmart.tb_query_catalog" : ["pricesmart.tb_query_placeholder"],
    "pricesmart.tb_placeholder_catalog" : ["pricesmart.tb_query_placeholder", "pricesmart.tb_placeholder_columns"],
    "pricesmart.tb_metric_catalog" : ["pricesmart.tb_placeholder_columns"],
    "pricesmart.filter_source_table_mapping": ["pricesmart.source_hierarchy_filters_mapping"],
    # config_schema dependencies
    "config_schema.tb_screen_type_mst": ["config_schema.tb_screen_configurations"],
    "config_schema.tb_config_context": ["config_schema.tb_screen_configurations"],
    "config_schema.tb_screen_configurations": [
        "config_schema.tb_section_configurations",
        "config_schema.tb_screen_filter_config_map",
        "config_schema.tb_configuration_drafts",
        "config_schema.tb_configuration_versions",
        "config_schema.tb_screen_filter_config_map_history"
    ],
    "config_schema.tb_section_type_mst": ["config_schema.tb_section_configurations"],
    "config_schema.tb_section_configurations": [
        "config_schema.tb_table_configurations",
        "config_schema.tb_filter_configurations",
        "config_schema.tb_kpi_container_configurations"
    ],
    "config_schema.tb_table_configurations": [
        "config_schema.tb_table_column_configurations",
        "config_schema.tb_table_column_group_configurations",
        "config_schema.tb_table_quick_filters"
    ],
    "config_schema.tb_table_quick_filters": [
        "config_schema.tb_table_quick_filter_options"
    ],
    "config_schema.tb_filter_configurations": [
        "config_schema.tb_filter_control_configurations",
        "config_schema.tb_filter_sections"
    ],
    "config_schema.tb_filter_data_source_mst": ["config_schema.tb_filter_data_source_params_mst"],
    "config_schema.tb_application_mst": ["config_schema.tb_table_formatter_mst"],
    "config_schema.tb_kpi_card_templates": ["config_schema.tb_kpi_card_groups"],
    "config_schema.tb_kpi_container_configurations": ["config_schema.tb_kpi_card_groups"],
    "config_schema.tb_kpi_card_groups": [
        "config_schema.tb_kpi_card_measures",
        "config_schema.tb_kpi_card_overrides",
        "config_schema.tb_kpi_placeholder_mappings",
        "config_schema.tb_kpi_static_cards"
    ],
    "config_schema.tb_download_configurations": [
        "config_schema.tb_download_categories",
        "config_schema.tb_download_column_groups",
        "config_schema.tb_download_custom_commands",
        "config_schema.tb_download_jobs"
    ],
    "config_schema.tb_download_categories": ["config_schema.tb_download_master_tables"],
    "config_schema.tb_download_master_tables": ["config_schema.tb_download_grains"],
    "config_schema.tb_download_grains": ["config_schema.tb_download_sub_grains"],
    "config_schema.tb_download_custom_commands": [
        "config_schema.tb_download_data_tables",
        "config_schema.tb_download_filter_mappings"
    ],
    "config_schema.tb_download_data_tables": ["config_schema.tb_download_data_columns"],
    "config_schema.tb_download_data_columns": ["config_schema.tb_download_group_columns"],
    "config_schema.tb_download_column_groups": ["config_schema.tb_download_group_columns"]
}

parent_map = {
    'global.filter_configurations_mapping':'global.filter_configurations',
    'global.table_configurations_mapping':'global.table_configurations',
}

class DependencyGraph:

    def __init__(self,n):

        self.graph = defaultdict(list)
        self.N = n

    def addDependency(self,m,n):

        self.graph[m].append(n)

    def sortUtil(self,n,visited,rec_stack,stack,tables, index_table_map):

        visited[n] = True
        rec_stack[n] = True
        
        for element in self.graph[n]:
            if visited[element] == False:
                if self.sortUtil(element,visited,rec_stack,stack,tables, index_table_map):
                    return True
            elif rec_stack[element]:
                print(f'cycle detected between nodes {index_table_map[n]} and {index_table_map[element]}')
                return True
        
        rec_stack[n] = False
        stack.insert(0,tables[n])
        return False

    def topologicalSort(self , tables, index_table_map):

        visited = [False]*self.N
        rec_stack = [False]*self.N
        stack =[]
        
        for element in range(self.N):
            if visited[element] == False:
                if self.sortUtil(element,visited,rec_stack,stack,tables, index_table_map):
                    print("Graph contains a cycle - topological sort not possible")
                    return None
        return stack

def sort_files(tables):
    
    table_len = len(tables)
    # Create a reverse mapping of table name to integer index
    table_index_map = {}
    index_table_map = {}
    for idx , obj in enumerate(tables):
        table_index_map[obj['table_name']] = idx
        index_table_map[idx] = obj['table_name']
    
    graph = DependencyGraph(table_len)
    # add dependencies so that the child tables are created after parent tables 
    for key, child_tables in dependency_map.items():
        parent_index = table_index_map.get(key)  
        # If the parent table exists in the table_index_map
        if parent_index is not None:
            # Add dependencies for the child tables
            for table in child_tables:
                child_index = table_index_map.get(table)
                if child_index is not None:
                    graph.addDependency(parent_index, child_index)

    sorted_csv_tables = graph.topologicalSort(tables, index_table_map)
    return sorted_csv_tables
