-- liquibase formatted sql
-- changeset liquibase:added_more_attributes_to_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-63016 labels:added_more_attributes_to_hierarchy_mapping
-- comment: added_more_attributes_to_hierarchy_mapping
drop procedure if exists global.tenant_hierarchy_mapping();
-- Create the new procedure

CREATE OR REPLACE PROCEDURE global.tenant_hierarchy_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.tenant_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    result RECORD;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Delete existing data from the target table
    DELETE FROM global.tenant_hierarchy_mapping;

    FOR result IN
        WITH raw_data AS (
            SELECT 
                (COALESCE(l0_name, 'OTHERS')) AS l0_name, 
                (COALESCE(category_name, 'OTHERS')) AS l1_name, 
                (COALESCE(sub_category_name, 'OTHERS')) AS l2_name
            FROM 
                global.product_attributes_filter paf
            GROUP BY 
                l0_name, category_name, sub_category_name
        ),
        d AS (
            SELECT *, ROW_NUMBER() OVER () - 1 AS hierarchy_level_id
            FROM raw_data
        ),
        coun_attri AS (
            SELECT d.hierarchy_level_id, p.*
            FROM d
            CROSS JOIN LATERAL (
                VALUES ('l0_name', l0_name)
            ) AS p(hierarchy_level, hierarchy_value)
        ),
        base_data AS (
            SELECT 
                hierarchy_level_id, 
                c.attribute_type, 
                c.attribute_value, 
                2 AS application_code, 
                TRUE AS is_active, 
                c.description 
            FROM d
            CROSS JOIN (
                VALUES 
                    ('max_performance_kpi', '2', ''), 
                    ('min_performance_kpi', '1', ''), 
                    ('min_attribute_cluster', '1', ''),
                    ('max_performance_cluster', '3', ''), 
                    ('min_performance_cluster', '1', ''), 
                    ('color', 'FALSE', 'product_indicator'),
                    ('info_material_description', 'FALSE', 'product_indicator'),
                    ('region_name', 'FALSE', 'store_indicator'), 
                    ('sales_retail', 'FALSE', 'performance_indicator'),
                    ('sales_units', 'FALSE', 'performance_indicator'),
                    ('st', 'FALSE', 'performance_indicator'),
                    ('choice_count', 'FALSE', 'performance_indicator'),
                    ('APS', 'FALSE', 'performance_indicator'),
                    ('AUR', 'FALSE', 'performance_indicator'),
                    ('margin_perc', 'FALSE', 'performance_indicator'),
                    ('margin', 'FALSE', 'performance_indicator'),
                    ('GMROI', 'FALSE', 'performance_indicator'),
                    ('revenue_per_transaction', 'FALSE', 'performance_indicator'), 
                    ('units_per_transaction', 'FALSE', 'performance_indicator'),
                    ('productivity', 'FALSE', 'performance_indicator'),
                    ('product_type', 'FALSE', 'product_indicator'),
                    ('info_colour_family_description', 'FALSE', 'product_indicator'),
                    ('article_value_stream_description', 'FALSE', 'product_indicator'),
                    ('article_season_name', 'FALSE', 'product_indicator'),
                    ('article_brand_name', 'FALSE', 'product_indicator'),
                    ('info_price_architecture', 'FALSE', 'product_indicator')
            ) AS c(attribute_type, attribute_value, description)
        )
        SELECT 
            b.hierarchy_level_id, 
            b.attribute_type, 
            (
                CASE
                    WHEN b.attribute_type IN ('sales_retail', 'sales_units',  'color', 'region_name','info_material_description'
                    ) THEN 'true'
                    WHEN b.attribute_type IN('', '', '','', '','max_performance_kpi', 'min_performance_kpi','min_attribute_cluster','max_performance_cluster', 'min_performance_cluster', 'st', 'choice_count', 'APS', 'AUR', 'margin_perc', 'margin', 'GMROI', 'revenue_per_transaction',
                    'units_per_transaction', 'productivity') THEN 'false'
                    ELSE b.attribute_value
                END
            ) AS attribute_value, 
            b.application_code, 
            b.is_active, 
            b.description 
        FROM base_data AS b
        LEFT JOIN coun_attri AS c USING(hierarchy_level_id)
    LOOP
        -- Insert the result into the tenant_hierarchy_mapping_table
        INSERT INTO global.tenant_hierarchy_mapping
            (hierarchy_level_id, attribute_type, attribute_value, application_code, is_active, description)
        VALUES 
            (result.hierarchy_level_id, result.attribute_type, result.attribute_value, result.application_code, result.is_active, result.description);
    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;