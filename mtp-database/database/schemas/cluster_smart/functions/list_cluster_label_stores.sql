--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:updated_sp_order_of_cluster_names liquibase:list_cluster_label_stores runOnChange:true stripComments:false splitStatements:false context:MTP-81443 labels:liquibase_project_start
--comment: Updated SP to fetch cluster display name based on the order of cluster name levels
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_cluster_label_stores(input integer, text, text, text);
CREATE OR REPLACE FUNCTION cluster_smart.list_cluster_label_stores(input integer, text, text, text)
 RETURNS TABLE(cluster_name text, store_codes character varying[], cluster_display_name text)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_combine text;
 	_is_channel text := '';
 	_where text := '';
    _cluster_concat text := 'CONCAT(channel,'' '' ';
    _cluster_levels jsonb;
	_current_element text;
begin
    -- Build the dynamic CONCAT directly
    SELECT attribute_value::jsonb INTO _cluster_levels 
    FROM "global".tenant_attribute_master
    WHERE name = 'client_specific_cluster_name_level';
    
    FOR i IN 0..jsonb_array_length(_cluster_levels)-1 LOOP
        _current_element := jsonb_array_element_text(_cluster_levels, i);
        
        CASE _current_element
            WHEN 'attribute_cluster_name' THEN
                _cluster_concat := _cluster_concat || ', prd.cluster_name';
            WHEN 'performance_cluster_name' THEN
                _cluster_concat := _cluster_concat || ', perf.cluster_name';
            WHEN 'store_cluster_name' THEN
                _cluster_concat := _cluster_concat || ', store_attr.store_cluster_name';
            ELSE
                -- Include the element directly in the CONCAT if it's not one of the known mappings
                -- This handles the space case or any other literal values
                _cluster_concat := _cluster_concat || ', ''' || _current_element || '''';
        END CASE;
    END LOOP;
    
    _cluster_concat := _cluster_concat || ')';
 		
    IF length($4) > 0 THEN 
        _is_channel = 'where channel ='''||$4 || ''' ';
    END IF;
 	
    _query_combine := 'SELECT COALESCE(cluster_display_data.cluster_display_name, bucket_data.label) AS cluster_display_name,
                           bucket_data.store_codes,
                           bucket_data.label
                        FROM (
                            SELECT 
                                cluster_plan_code,
                                ' || _cluster_concat || ' AS label,
                                ARRAY_AGG(DISTINCT store_code) AS store_codes
                            FROM (
                                -- PRODUCT CLUSTER
                                SELECT 
                                    cluster_plan_code,
                                    cluster_name,
                                    prf.store_code AS store_code,
                                    channel.channel AS channel
                                FROM (
                                    SELECT 
                                        pcb.cluster_plan_code,
                                        SPLIT_PART(pcb.cluster_name, '' '', -1) AS cluster_name,
                                        pcbma.attribute_value AS store_code
                                    FROM "cluster_smart".plan_cluster_bucket_map pcb
                                    JOIN "cluster_smart".plan_cluster_bucket_map_attributes pcbma
                                        ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                                    WHERE 
                                        cluster_plan_code = ' || $1 ||' 
                                        AND special_classification = ''product'' 
                                        AND bucket_id = '''|| $2 ||'''
                                        AND pcbma.attribute_name = ''store_code''
                                ) prf
                                JOIN (
                                    SELECT store_code, channel FROM "global".store_attributes_filter
                                ) AS channel
                                    ON prf.store_code = channel.store_code
                            ) prd
                        
                            JOIN (
                                -- PERFORMANCE CLUSTER
                                SELECT 
                                    pcb.cluster_plan_code,
                                    pcbma.attribute_value AS store_code,
                                    CASE 
                                        WHEN pcb.bucket_attribute_value ->> ''upload_cluster_name'' IS NULL THEN 
                                            CASE 
                                                WHEN SPLIT_PART(pcb.cluster_name, '' '', -1) = cluster_name THEN cluster_name 
                                                ELSE SPLIT_PART(pcb.cluster_name, '' '', -1) 
                                            END
                                        ELSE pcb.bucket_attribute_value ->> ''upload_cluster_name'' 
                                    END AS cluster_name,
                                    channel.channel AS channel
                                FROM "cluster_smart".plan_cluster_bucket_map pcb
                                JOIN "cluster_smart".plan_cluster_bucket_map_attributes pcbma
                                    ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                                JOIN (
                                    SELECT store_code, channel FROM "global".store_attributes_filter
                                ) AS channel
                                    ON pcbma.attribute_value = channel.store_code
                                WHERE 
                                    cluster_plan_code = ' || $1 ||' 
                                    AND special_classification = ''performance''
                                    AND bucket_id = '''|| $3 ||'''
                                    AND pcbma.attribute_name = ''store_code''
                            ) perf
                            USING (cluster_plan_code, store_code, channel)
                        
                            LEFT JOIN (
                                -- STORE CLUSTER
                                SELECT 
                                    pcb.cluster_plan_code,
                                    pcbma.attribute_value AS store_code,
                                    BTRIM(SUBSTRING(pcb.cluster_name, (LENGTH(channel) + 1))) AS store_cluster_name,
                                    channel.channel AS channel
                                FROM "cluster_smart".plan_cluster_bucket_map pcb
                                JOIN "cluster_smart".plan_cluster_bucket_map_attributes pcbma
                                    ON pcb.cluster_bucket_code = pcbma.cluster_bucket_code
                                JOIN (
                                    SELECT store_code, channel FROM "global".store_attributes_filter
                                ) AS channel
                                    ON pcbma.attribute_value = channel.store_code
                                WHERE 
                                    cluster_plan_code = ' || $1 ||'
                                    AND special_classification = ''store''
                                    AND pcbma.attribute_name = ''store_code''
                            ) store_attr
                            USING (cluster_plan_code, store_code, channel)
                        '|| _is_channel ||'
                            GROUP BY 
                                cluster_plan_code, 
                                prd.cluster_name, 
                                perf.cluster_name, 
                                store_attr.store_cluster_name, 
                                channel
                        ) AS bucket_data
                        
                        LEFT JOIN (
                            -- CLUSTER DISPLAY NAMES
                            SELECT 
                                COALESCE(pcbm.bucket_attribute_value ->> ''upload_cluster_name'' , pcf.cluster_name) AS label,
                                pcf.attribute_value ->> ''cluster_display_name'' AS cluster_display_name
                            FROM cluster_smart.plan_cluster_bucket_map_attributes pcbma 
                            JOIN cluster_smart.plan_cluster_bucket_map pcbm 
                                ON pcbma.cluster_bucket_code = pcbm.cluster_bucket_code
                            JOIN cluster_smart.plan_cluster_store_final pcsf 
                                ON pcbma.attribute_value = pcsf.attribute_value
                            JOIN cluster_smart.plan_cluster_final pcf 
                                ON pcsf.cluster_code_id = pcf.cluster_code_id 
                                AND pcbm.cluster_plan_code = pcf.cluster_plan_code 
                                AND pcsf.attribute_value = pcbma.attribute_value
                            WHERE 
                                pcbm.cluster_plan_code = ' || $1 ||'
                                AND pcbm.special_classification = ''performance''
                                AND pcbma.attribute_name = ''store_code'' 
                                AND pcsf.attribute_name = ''store_code''
                            GROUP BY 1, 2
                        ) AS cluster_display_data
                        USING (label) ';
	RAISE NOTICE '%', _cluster_concat;
    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
end;
 $function$
;
