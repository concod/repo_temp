--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_create_event_store_restrictions_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_event_store_restrictions_1

DROP FUNCTION if exists price_promo.fn_create_event_store_restrictions;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event_store_restrictions(
    p_event_id int,
    p_event_store_restriction price_promo.store_restriction
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
        hierarchy_l_id int;
        store_id int;
        store_ids int[];
        store_group_id int;
        store_details record;
    begin

    _query := format('create table if not exists price_promo.included_event_stores_%1$s 
                        partition of price_promo.included_event_stores for values in (%1$s)', 
                    p_event_id);
    raise notice 'partition create query for stores: %', _query;
    execute _query;
    --Case 1 - Specific Stores
    if p_event_store_restriction.store_restriction_level = 'specific_stores' then
    
        --Storing specific stores in the stores table
        foreach store_id in array p_event_store_restriction.stores loop
            insert into price_promo.included_event_stores (event_id, store_id)
            values (p_event_id, store_id);
        end loop;

        DROP TABLE IF EXISTS temp_store_details;
        --Storing store hierarchies in the hierarchy table as per specific stores
        EXECUTE '
            CREATE TEMP TABLE temp_store_details AS
            SELECT DISTINCT
                store_id
            FROM global.tb_store_master tsm
            WHERE store_id = ANY($1::INTEGER[])'
        USING p_event_store_restriction.stores;

        FOR hierarchy_l_id IN
            (SELECT unnest(ARRAY[0, 1]))
        LOOP
            EXECUTE '
                INSERT INTO price_promo.included_event_store_hierarchy (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                SELECT 
                    DISTINCT $1 AS event_id, 
                    $2 AS hierarchy_level_id,
                    CASE 
                        WHEN $2 = 0 THEN ''country''
                        WHEN $2 = 1 THEN ''channel''
                    END::text AS hierarchy_level_name,
                    CASE 
                        WHEN $2 = 0 THEN s0_id 
                        WHEN $2 = 1 THEN s1_id 
                    END::bigint AS hierarchy_value_id, 
                    CASE 
                        WHEN $2 = 0 THEN s0_name
                        WHEN $2 = 1 THEN s1_name 
                    END::TEXT AS hierarchy_value_name
                FROM global.tb_store_master tsm
                WHERE 
                    store_id IN (SELECT unnest($3::INTEGER[]))
            ' USING p_event_id, hierarchy_l_id, p_event_store_restriction.stores;
        END LOOP;

    --Case 2 - Store Groups
    elsif p_event_store_restriction.store_restriction_level = 'store_group' then

        --Storing data into SG table
        foreach store_group_id in array p_event_store_restriction.store_groups loop
            insert into price_promo.included_event_store_groups (event_id, store_group_id)
            values (p_event_id, store_group_id);
        end loop;

        drop table if exists temp_store_groups_details;
        EXECUTE '
            CREATE TEMP TABLE temp_store_groups_details AS
            SELECT
                sg_id,
                sg_name
            FROM global.tb_store_group
            WHERE sg_id = ANY($1::INTEGER[])'
        USING p_event_store_restriction.store_groups;
    
        drop table if exists temp_store_details;
        -- Create a temporary table to store unique product IDs and names
        EXECUTE '
            CREATE TEMP TABLE temp_store_details AS
            SELECT DISTINCT
                tss.store_id,
                pm.store_name
            FROM global.tb_sg_store tss
            LEFT JOIN global.tb_store_master pm ON tss.store_id = pm.store_id
            WHERE sg_id = ANY($1::INTEGER[])'
        USING p_event_store_restriction.store_groups;

        -- Loop through each store_group_id
        FOREACH store_group_id IN ARRAY p_event_store_restriction.store_groups
        LOOP
            -- Insert into temporary table
            EXECUTE format('
                INSERT INTO price_promo.event_store_sg_hierarchy (
                    event_id,
                    store_group_id,
                    store_group_name,
                    hierarchy_level_id, 
                    hierarchy_level_name, 
                    hierarchy_value_id, 
                    hierarchy_value_name
                )
                SELECT DISTINCT
                    $1 AS event_id,
                    $2 AS store_group_id,
                    tsg.sg_name AS store_group_name,
                    tsh.hierarchy_level AS hierarchy_level_id,
                    CASE 
                        WHEN tsh.hierarchy_level = 0 THEN ''country''
                        WHEN tsh.hierarchy_level = 1 THEN ''channel''
                        WHEN tsh.hierarchy_level = 2 THEN ''store_group''
                        WHEN tsh.hierarchy_level = 3 THEN ''district''
                        WHEN tsh.hierarchy_level = 4 THEN ''state''
                        WHEN tsh.hierarchy_level = 5 THEN ''city''
                        WHEN tsh.hierarchy_level = -1 THEN ''store_id''
                    END AS hierarchy_level_name,
                    tsh.hierarchy_value AS hierarchy_value_id,
                    CASE
                        WHEN tsh.hierarchy_level = 0 THEN tsm.s0_name
                        WHEN tsh.hierarchy_level = 1 THEN tsm.s1_name
                        WHEN tsh.hierarchy_level = 2 THEN tsm.s2_name
                        WHEN tsh.hierarchy_level = 3 THEN tsm.s3_name
                        WHEN tsh.hierarchy_level = 4 THEN tsm.s4_name
                        WHEN tsh.hierarchy_level = 5 THEN tsm.s5_name
                        WHEN tsh.hierarchy_level = -1 THEN tsm.store_name
                    END AS hierarchy_value_name
                FROM 
                    global.tb_sg_hierarchy tsh
                LEFT JOIN global.tb_store_group tsg ON tsh.sg_id = tsg.sg_id
                LEFT JOIN 
                    global.tb_store_master tsm 
                ON 
                    (tsh.hierarchy_level = 0 AND tsh.hierarchy_value = tsm.s0_id) OR
                    (tsh.hierarchy_level = 1 AND tsh.hierarchy_value = tsm.s1_id) OR
                    (tsh.hierarchy_level = 2 AND tsh.hierarchy_value = tsm.s2_id) OR
                    (tsh.hierarchy_level = 3 AND tsh.hierarchy_value = tsm.s3_id) OR
                    (tsh.hierarchy_level = 4 AND tsh.hierarchy_value = tsm.s4_id) OR
                    (tsh.hierarchy_level = 5 AND tsh.hierarchy_value = tsm.s5_id) OR
                    (tsh.hierarchy_level = -1 AND tsh.hierarchy_value = tsm.store_id)
                WHERE
                    tsh.sg_id = $2
                ;'
            )
            USING p_event_id, store_group_id;
        END LOOP;

        -- Loop over each store_id and store_name in the temporary table
        FOR store_details IN
            SELECT tsd.store_id
            FROM temp_store_details tsd
        LOOP
            -- Insert data into promo_store, routing to the correct partition
            EXECUTE format('
                INSERT INTO price_promo.included_event_stores_%1$s  (event_id, store_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING',
                p_event_id::TEXT
            )
            USING p_event_id, store_details.store_id;
        END LOOP;

    --Case 3 - BNM and Ecom stores
        elsif p_event_store_restriction.store_restriction_level = 'bnm_stores' then

            DROP TABLE IF EXISTS temp_store_details;
            EXECUTE '
                CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT
                    store_id,
                    store_name
                FROM global.tb_store_master
                WHERE
                    is_active = 1
                    AND s1_id IN (2)
            ';
                    
            -- Fetch product_ids into an array variable
            SELECT array_agg(tsd.store_id) INTO store_ids FROM temp_store_details tsd;

                FOR hierarchy_l_id IN
                SELECT unnest(ARRAY[0, 1])
            LOOP
                EXECUTE '
                    INSERT INTO price_promo.included_event_store_hierarchy (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    SELECT 
                        DISTINCT $1 AS event_id, 
                        $2 AS hierarchy_level_id,
                        CASE 
                            WHEN $2 = 0 THEN ''country''
                            WHEN $2 = 1 THEN ''channel''
                        END::text AS hierarchy_level_name,
                        CASE 
                            WHEN $2 = 0 THEN s0_id 
                            WHEN $2 = 1 THEN s1_id 
                        END::bigint AS hierarchy_value_id, 
                        CASE 
                            WHEN $2 = 0 THEN s0_name
                            WHEN $2 = 1 THEN s1_name 
                        END::TEXT AS hierarchy_value_name
                    FROM global.tb_store_master tsm
                    WHERE 
                        store_id IN (SELECT unnest($3::INTEGER[]))
                ' USING p_event_id, hierarchy_l_id, store_ids;
            END LOOP;

            -- Loop over each store_id and store_name in the temporary table
            FOR store_details IN
                SELECT tsd.store_id
                FROM temp_store_details tsd
            LOOP
                -- Insert data into promo_store, routing to the correct partition
                EXECUTE format('
                    INSERT INTO price_promo.included_event_stores_%s (event_id, store_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                )
                USING p_event_id, store_details.store_id;
            END LOOP;

            -- Drop the temp_store_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';

        elsif p_event_store_restriction.store_restriction_level = 'ecom_stores' then

            -- Create a temporary table to save unique store IDs and names
            EXECUTE '
                CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT
                    store_id,
                    store_name
                FROM global.tb_store_master
                WHERE
                    is_active = 1
                    AND s1_id IN (1)
            ';
                    
            -- Fetch product_ids into an array variable
            SELECT array_agg(tsd.store_id) INTO store_ids FROM temp_store_details tsd;
            
            FOR hierarchy_l_id IN
                SELECT unnest(ARRAY[0, 1])
            LOOP
                EXECUTE '
                    INSERT INTO price_promo.included_event_store_hierarchy (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    SELECT 
                        DISTINCT $1 AS event_id, 
                        $2 AS hierarchy_level_id,
                        CASE 
                            WHEN $2 = 0 THEN ''country''
                            WHEN $2 = 1 THEN ''channel''
                        END::text AS hierarchy_level_name,
                        CASE 
                            WHEN $2 = 0 THEN s0_id 
                            WHEN $2 = 1 THEN s1_id 
                        END::bigint AS hierarchy_value_id, 
                        CASE 
                            WHEN $2 = 0 THEN s0_name
                            WHEN $2 = 1 THEN s1_name 
                        END::TEXT AS hierarchy_value_name
                    FROM global.tb_store_master tsm
                    WHERE 
                        store_id IN (SELECT unnest($3::INTEGER[]))
                ' USING p_event_id, hierarchy_l_id, store_ids;
            END LOOP;			    

            EXECUTE 'INSERT INTO price_promo.included_event_stores (event_id, store_id)
                SELECT
                    $1,
                    store_id
                FROM global.tb_store_master
                WHERE
                    is_active = 1
                    AND s1_id IN (1)
                group by 1,2'
            USING p_event_id;
            
            -- Drop the temp_store_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';

    end if;
    end;
$function$

;