--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:create_item_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for create_item_schema_dept_week
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.create_item_schema_dept_week();

CREATE OR REPLACE PROCEDURE item_smart.create_item_schema_dept_week(IN tbl_name text, IN depts text[], IN weeks integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    dept_part_name text;
    dept_part_sql  text;
    wk_part_name text;
    wk_part_sql  text;
    dept           text;
    wk             int;
BEGIN
    -- Loop through each department
    FOREACH dept IN ARRAY depts 
    LOOP
        -- Remove spaces, slashes, and other special characters from the department name
        dept_part_name := regexp_replace(dept, '[ /.-]', '', 'g');
        
        -- Construct the dynamic SQL for creating a partitioned table for each department
        dept_part_sql := '
            CREATE TABLE IF NOT EXISTS item_smart.' || tbl_name || '_' || dept_part_name || ' PARTITION OF item_smart.' || tbl_name || ' 
            FOR VALUES IN (''' || dept || ''')
            PARTITION BY LIST (current_week);';
        
        -- Uncomment the line below to see the generated SQL statements
        -- RAISE NOTICE 'dept_part_sql - %', dept_part_sql;
        
        -- Execute the dynamic SQL for department partition
        EXECUTE dept_part_sql;

        -- Loop through each week for the current department
        FOREACH wk IN ARRAY weeks 
        LOOP
            wk_part_name := wk::text;
            wk_part_sql  := '
                CREATE TABLE IF NOT EXISTS item_smart.' || tbl_name || '_' || dept_part_name || '_' || wk_part_name || ' PARTITION OF item_smart.' || tbl_name || '_' || dept_part_name || '
                FOR VALUES IN (' || wk || ');';
            
            -- Uncomment the line below to see the generated SQL statements
            -- RAISE NOTICE 'wk_part_sql %', wk_part_sql;
            
            -- Execute the dynamic SQL for week subpartition
            EXECUTE wk_part_sql;
        END LOOP;
    END LOOP;
END;
$procedure$
;