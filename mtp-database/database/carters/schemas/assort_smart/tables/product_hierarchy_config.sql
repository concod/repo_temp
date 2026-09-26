--liquibase formatted sql
--changeset sadhana.j@impactanalytics.co:updated_pk_key liquibase:plan_cluster_opt_master stripComments:false splitStatements:false context:updated_pk_key labels:liquibase_project_start
--comment: updated_pk_key

CREATE TABLE IF NOT EXISTS assort_smart.product_hierarchy_config (
    id serial4 NOT NULL,
    levels jsonb NOT NULL,
    store_levels jsonb NOT NULL,
    season_code varchar NULL,
    planning_path _varchar NULL,
    optimization_threshold varchar NULL,
    starting_level _varchar NULL,
    optimization_level _varchar NULL,
    final_level _varchar NULL,
    CONSTRAINT product_hierarchy_config_pkey PRIMARY KEY (id)
);

--changeset srinivasgowda.sg@impactanalytics.co:product_hierarchy_config_unique_key stripComments:false splitStatements:false context:updated_pk_key labels:liquibase_project_start
--comment: updated_pk_key
ALTER TABLE assort_smart.product_hierarchy_config
        ADD CONSTRAINT product_hierarchy_config_unique_key 
        UNIQUE (levels, store_levels, season_code);