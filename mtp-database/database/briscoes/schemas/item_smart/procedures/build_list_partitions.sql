--liquibase formatted sql
--changeset jaya.kahndelwal@impactanalytics.co:build_list_partitions_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for build_list_partitions
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.build_list_partitions(IN tbl_name text);
CREATE OR REPLACE PROCEDURE item_smart.build_list_partitions(IN tbl_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    dept              text;
    channel           text;
    wk                int;
    dept_part_name    text;
    dept_part_sql     text;
    channel_part_name text;
    channel_part_sql  text;
    wk_part_sql       text;
    v_week_part_key   text;
    schema_name       text;
BEGIN
    -- Extract the schema name (before the dot) from tbl_name
    schema_name := split_part(tbl_name, '.', 1);
   

   if tbl_name like '%_master%' then
    -- Loop over distinct depts
    FOR dept IN
        SELECT DISTINCT wm.dept FROM item_smart.wp_master_mv wm WHERE is_active = 1
    LOOP
        dept_part_name := lower(regexp_replace(dept, '[ /.-]', '', 'g'));

        dept_part_sql := '
            CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || dept_part_name || 
            ' PARTITION OF ' || tbl_name || 
            ' FOR VALUES IN (''' || dept || ''') PARTITION BY LIST (channel)';

        RAISE NOTICE 'Creating dept partition: %', dept_part_sql;
        EXECUTE dept_part_sql;

        -- Loop over distinct channels
        FOR channel IN
            SELECT DISTINCT wm.channel FROM item_smart.wp_master_mv wm
        LOOP
            channel_part_name := lower(regexp_replace(channel, '[ /.-]', '', 'g'));

            channel_part_sql := '
                CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || dept_part_name || '_' || channel_part_name || 
                ' PARTITION OF ' || tbl_name || '_' || dept_part_name || 
                ' FOR VALUES IN (''' || channel || ''') PARTITION BY LIST (current_week)';

            RAISE NOTICE 'Creating channel partition: %', channel_part_sql;
            EXECUTE channel_part_sql;

            -- Loop over weeks
            FOR wk IN
                SELECT DISTINCT wm.current_week FROM item_smart.wp_master_mv wm
            LOOP
                v_week_part_key := item_smart.get_md5_from_array(ARRAY[dept_part_name, channel_part_name, wk::text]);

                INSERT INTO item_smart.table_partition_mapping (table_name, dept, channel, week, md5sum)
                VALUES (tbl_name, dept, channel, wk, v_week_part_key)
                ON CONFLICT DO NOTHING;

                wk_part_sql := '
                    CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || v_week_part_key || 
                    ' PARTITION OF ' || tbl_name || '_' || dept_part_name || '_' || channel_part_name || 
                    ' FOR VALUES IN (' || wk || ')';

                RAISE NOTICE 'Creating week partition: %', wk_part_sql;
                EXECUTE wk_part_sql;
            END LOOP;
        END LOOP;
    END LOOP;

    elsif tbl_name like '%itemfact_sku_week%' then
	FOR dept IN
        SELECT DISTINCT wm.dept FROM item_smart.wp_master_mv wm 
    LOOP
        dept_part_name := lower(regexp_replace(dept, '[ /.-]', '', 'g'));

        dept_part_sql := '
            CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || dept_part_name || 
            ' PARTITION OF ' || tbl_name || 
            ' FOR VALUES IN (''' || dept || ''') PARTITION BY LIST (current_week)';

        RAISE NOTICE 'Creating dept partition: %', dept_part_sql;
        EXECUTE dept_part_sql;

            FOR wk IN
                SELECT DISTINCT wm.current_week FROM item_smart.wp_master_mv wm
            LOOP
                v_week_part_key := item_smart.get_md5_from_array(ARRAY[dept_part_name, wk::text]);

                INSERT INTO item_smart.table_partition_mapping (table_name, dept, week, md5sum)
                VALUES (tbl_name, dept_part_name, wk, v_week_part_key)
                ON CONFLICT DO NOTHING;
                wk_part_sql := '
                CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || v_week_part_key || 
                ' PARTITION OF ' || tbl_name || '_' || dept_part_name || 
                ' FOR VALUES IN (' || wk || ')';
			
                RAISE NOTICE 'Creating week partition: %', wk_part_sql;
                EXECUTE wk_part_sql;
            END LOOP;
    END LOOP;

ELSEIF tbl_name LIKE '%itemfact_sku%' THEN
    -- Loop over departments
    FOR dept IN
        SELECT DISTINCT wm.dept FROM item_smart.wp_master_mv wm WHERE is_active = 1
    LOOP
        -- Clean department name to remove invalid characters
        dept_part_name := lower(regexp_replace(dept, '[ /.-]', '', 'g'));

        -- Create the partition for the department
        dept_part_sql := '
            CREATE TABLE IF NOT EXISTS ' || tbl_name || '_' || dept_part_name || 
            ' PARTITION OF ' || tbl_name || 
            ' FOR VALUES IN (''' || dept || ''')';

        RAISE NOTICE 'Creating dept partition: %', dept_part_sql;
        EXECUTE dept_part_sql;

    END LOOP;
END IF;

	
END;
$procedure$
;

