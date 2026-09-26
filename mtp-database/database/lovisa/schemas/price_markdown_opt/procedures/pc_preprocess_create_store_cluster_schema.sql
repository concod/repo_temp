--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_store_cluster_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_store_cluster_schema

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_store_cluster_schema;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_store_cluster_schema(IN _store_cluster_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare _store_cluster_query text;
BEGIN
    _store_cluster_query = format('
        CREATE TABLE IF NOT EXISTS %1$s
        (
            product_level_id INT4 NULL,
            store_level_id INT4 NULL,
            store_id INT4 NULL,
            inv_oh FLOAT8 NULL,
            n_cluster INT4 NULL
        );
    ', _store_cluster_table);
   raise notice 'store cluster schema query : %', _store_cluster_query;
  execute _store_cluster_query;
END;
$procedure$
;
