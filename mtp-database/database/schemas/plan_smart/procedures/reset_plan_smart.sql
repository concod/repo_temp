--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:reset_plan_smart runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reset_plan_smart
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS plan_smart.reset_plan_smart();
CREATE OR REPLACE PROCEDURE plan_smart.reset_plan_smart()
LANGUAGE plpgsql
security definer 
AS $$
DECLARE
  i record;
  j record;
  k record;
  l record;
  query text;
BEGIN
  FOR i IN (SELECT DISTINCT split_part(plan_table, '.', 2) AS table_name
            FROM plan_smart.query_source_mappings qsm)
  LOOP
    FOR j IN (SELECT child.relname AS part_name
              FROM pg_inherits
              JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
              JOIN pg_class child ON pg_inherits.inhrelid = child.oid
              JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
              JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
              WHERE parent.relname = i.table_name)
    LOOP
      FOR k IN (SELECT child.relname AS part_name
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid
                JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
                JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
                WHERE parent.relname = j.part_name)
      LOOP
        RAISE NOTICE 'table : %', k.part_name;
        query := 'DROP TABLE IF EXISTS plan_smart.' || k.part_name;
        EXECUTE query;
      END LOOP;
    END LOOP;
  END LOOP;

  FOR l IN (SELECT child.relname AS part_name
            FROM pg_inherits
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            JOIN pg_class child ON pg_inherits.inhrelid = child.oid
            JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
            JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
            WHERE parent.relname = 'plan_modifications')
  LOOP
    RAISE NOTICE 'table : %', l.part_name;
    query := 'DROP TABLE IF EXISTS plan_smart.' || l.part_name;
    EXECUTE query;
  END LOOP;

  EXECUTE 'TRUNCATE TABLE plan_smart.plan_master CASCADE;';
  EXECUTE 'TRUNCATE TABLE plan_smart.plan_filter_mappings;';
  EXECUTE 'TRUNCATE TABLE plan_smart.lock_info CASCADE;';
END;
$$
;