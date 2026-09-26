-- liquibase formatted sql
-- changeset liquibase:added_more_attributes_to_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-63016 labels:added_more_attribute_to_hierarchy_mapping
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
				(COALESCE(l1_name, 'OTHERS')) AS l1_name,
				(COALESCE(l2_name, 'OTHERS')) AS l2_name,
				(COALESCE(l3_name, 'OTHERS')) AS l3_name,
				(COALESCE(l4_name, 'OTHERS')) AS l4_name,
				(COALESCE(l5_name, 'OTHERS')) AS l5_name,
				(COALESCE(l8_name, 'OTHERS')) AS l8_name

            FROM 
                global.product_attributes_filter paf
            GROUP BY 
                l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l8_name
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
					('garment_construction', 'FALSE', 'product_indicator'),
					('fabric_yarn_type', 'FALSE', 'product_indicator'),
					('consumer_style', 'FALSE', 'product_indicator'),
					('good_better_best', 'FALSE', 'product_indicator'),
					('fashionability', 'FALSE', 'product_indicator'),
					('uom', 'FALSE', 'product_indicator'),
					('leg_shape', 'FALSE', 'product_indicator'),
					('shape_outline', 'FALSE', 'product_indicator'),
					('hood', 'FALSE', 'product_indicator'),
					('neckline', 'FALSE', 'product_indicator'),
					('length', 'FALSE', 'product_indicator'),
					('sleeve_length', 'FALSE', 'product_indicator'),
					('climate', 'FALSE', 'store_indicator'),
					('store_sizing', 'FALSE', 'store_indicator'),
					('sales_retail', 'FALSE', 'performance_indicator'),
					('sales_units', 'FALSE', 'performance_indicator'),
                    ('GMROI', 'FALSE', 'performance_indicator'),
                    ('APS', 'FALSE', 'performance_indicator'),
                    ('margin', 'TRUE', 'performance_indicator'),
                    ('margin_perc', 'TRUE', 'performance_indicator'),
                    ('original_selling_price', 'TRUE', 'performance_indicator'),
                    ('full_price_sell_through_pct', 'TRUE', 'performance_indicator')

            ) AS c(attribute_type, attribute_value, description)
        )
        SELECT 
            b.hierarchy_level_id, 
            b.attribute_type, 
            b.attribute_value, 
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