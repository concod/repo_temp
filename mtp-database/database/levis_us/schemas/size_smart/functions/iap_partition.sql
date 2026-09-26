-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:iap_partition_modify_changeset runOnChange:true stripComments:false splitStatements:false context:uat_release_1_0_modify_changes labels:uat_release_1_0_modify_changes
-- comment: update changeset for iap_partition

DROP FUNCTION IF EXISTS size_smart.iap_partition();
CREATE OR REPLACE FUNCTION size_smart.iap_partition()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    app_tag_values TEXT[] := ARRAY['assort', 'size', 'master'];
    l0_names TEXT[];
    l3_names TEXT[];
    current_app_tag TEXT;
    current_l0 TEXT;
    current_l3 TEXT;
    l0_table_name TEXT;
    l3_table_name TEXT;
    create_partition_sql TEXT;
    partition_exists BOOLEAN;
    idx_prefix TEXT;
    result_message TEXT := '';
    partition_count INTEGER := 0;
BEGIN
    -- Get distinct values from hierarchy master
    EXECUTE 'SELECT ARRAY(
        SELECT DISTINCT l0_name 
        FROM size_smart.tb_hierarachy_mst 
        WHERE l0_name IS NOT NULL 
        ORDER BY l0_name
    )' INTO l0_names;
    
    EXECUTE 'SELECT ARRAY(
        SELECT DISTINCT l3_name 
        FROM size_smart.tb_hierarachy_mst 
        WHERE l3_name IS NOT NULL 
        ORDER BY l3_name
    )' INTO l3_names;
    
    result_message := result_message || format('Found %s l0_names, %s l3_names', 
        array_length(l0_names, 1), array_length(l3_names, 1)) || E'\n';
    
    -- First level partitions by application_tag
    FOREACH current_app_tag IN ARRAY app_tag_values
    LOOP
        -- Create first level partition
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS size_smart.tb_size_curve_iap_%I PARTITION OF size_smart.tb_size_curve_iap FOR VALUES IN (%L) PARTITION BY LIST(l0_name)', 
            current_app_tag, current_app_tag
        );
                
        -- Second level partitions by l0_name
        FOREACH current_l0 IN ARRAY l0_names
        LOOP
            -- Convert l0_name to a valid table name
            l0_table_name := lower(regexp_replace(current_l0, '[^[:alnum:]]+', '_', 'g'));
            l0_table_name := trim(both '_' from l0_table_name);
            
            -- Create second level partition
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS size_smart.tb_size_curve_iap_%I_%I PARTITION OF size_smart.tb_size_curve_iap_%I FOR VALUES IN (%L) PARTITION BY LIST(l3_name)', 
                current_app_tag, l0_table_name, current_app_tag, current_l0
            );
            
            -- Third level partitions by l3_name (removed l1_name level)
            FOREACH current_l3 IN ARRAY l3_names
            LOOP
                -- Convert l3_name to a valid table name
                l3_table_name := lower(regexp_replace(current_l3, '[^[:alnum:]]+', '_', 'g'));
                l3_table_name := trim(both '_' from l3_table_name);
                
                -- Create a unique index prefix using concatenation of all parts
                idx_prefix := format('idx_iap_%s_%s_%s',
                    current_app_tag,
                    l0_table_name,
                    l3_table_name
                );
                
                -- Create third level partition (final level)
                create_partition_sql := format(
                    'CREATE TABLE IF NOT EXISTS size_smart.tb_size_curve_iap_%I_%I_%I PARTITION OF size_smart.tb_size_curve_iap_%I_%I FOR VALUES IN (%L)', 
                    current_app_tag, l0_table_name, l3_table_name,
                    current_app_tag, l0_table_name, current_l3
                );
                
                BEGIN
                    EXECUTE create_partition_sql;
                    partition_count := partition_count + 1;
                    
                    -- Create indexes with unique names
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (l1_name)',
                        idx_prefix || '_l1',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (l5_name)',
                        idx_prefix || '_l5',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (size_range_id)',
                        idx_prefix || '_sr',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (display_article)',
                        idx_prefix || '_st',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (fiscal_year_week)',
                        idx_prefix || '_fw',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    -- Composite indexes with unique names
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (size_range_id, tag)',
                        idx_prefix || '_srt',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX IF NOT EXISTS %I ON size_smart.tb_size_curve_iap_%I_%I_%I (size_range_id, tag, display_article)',
                        idx_prefix || '_srts',
                        current_app_tag, l0_table_name, l3_table_name
                    );
                EXCEPTION
                    WHEN OTHERS THEN
                        result_message := result_message || format('Error creating partition for l3_name "%s": %s', current_l3, SQLERRM) || E'\n';
                END;
            END LOOP;
        END LOOP;
    END LOOP;
    
    result_message := result_message || format('Successfully created %s partitions for size_smart.tb_size_curve_iap', partition_count);
    
    RETURN result_message;
END $$;
