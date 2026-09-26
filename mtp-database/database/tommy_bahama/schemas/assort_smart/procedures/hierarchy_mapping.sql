-- liquibase formatted sql
-- changeset liquibase:hierarchy_mapping_changes runOnChange:true stripComments:false splitStatements:false context:MTP-81362 labels:changes_for_hierarchy_mapping
-- comment: changes for tenant_hierarchy_mappings procedure 

DROP PROCEDURE IF EXISTS global.tenant_hierarchy_mapping();
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
			    (COALESCE(l1_name, 'OTHERS')) AS l1_name,
			    (COALESCE(l2_name, 'OTHERS')) AS l2_name,
			    (COALESCE(l3_name, 'OTHERS')) AS l3_name,
			    (COALESCE(s1_name, 'OTHERS')) AS s1_name
			FROM
			    global.product_attributes_filter
			CROSS JOIN
			    (SELECT DISTINCT(s1_name) AS s1_name 
			     FROM "global".store_attributes_filter) AS s
			GROUP BY
			    l1_name, l2_name, l3_name, s1_name
        ),
        d AS (
            SELECT *, ROW_NUMBER() OVER () - 1 AS hierarchy_level_id
            FROM raw_data
        ),
        product as
        (SELECT d.hierarchy_level_id, p.hierarchy_level, p.hierarchy_value
        FROM d
        CROSS JOIN LATERAL (
            VALUES
                ('l1_name', l1_name),
                ('l2_name', l2_name),
                ('l3_name', l3_name),
                ('s1_name', s1_name)
        ) AS p(hierarchy_level, hierarchy_value)),
   		base_data as
        	(select d.hierarchy_level_id,
        		c.attribute_type,
                c.attribute_value,
                2 AS application_code,
                FALSE AS is_active,
                c.description
            FROM d
            CROSS JOIN (
                VALUES
                    ('sales_retail', 'FALSE', 'performance_indicator'),
                    ('sales_units', 'FALSE', 'performance_indicator'),
                    ('AUR', 'FALSE', 'performance_indicator'),
                    ('margin', 'FALSE', 'performance_indicator'),
                    ('margin_perc', 'FALSE', 'performance_indicator'),
                    ('st', 'FALSE', 'performance_indicator'),
                    ('climate', 'FALSE', 'store_indicator'),
                    ('home_unit_capacity', 'FALSE','store_indicator'),
                    ('store_lifestyle', 'FALSE', 'store_indicator'),
                    ('l4_name', 'FALSE', 'product_indicator'),
                    ('collaboration','FALSE','product_indicator'),
                    ('collar','FALSE','product_indicator'),
                    ('end_use','FALSE','product_indicator'),
                    ('layer','FALSE','product_indicator'),
                    ('length','FALSE','product_indicator'),
                    ('fabric','FALSE','product_indicator'),
                    ('product_print','FALSE','product_indicator'),
                    ('property','FALSE','product_indicator'),
                    ('silhouette','FALSE','product_indicator'),
                    ('sleeve','FALSE','product_indicator'),
                    ('stitch_gauge','FALSE','product_indicator'),
                    ('type_fashion_grade','FALSE','product_indicator'),
                    ('program','FALSE','product_indicator'),
                    ('collection','FALSE','product_indicator')
            ) AS c(attribute_type, attribute_value, description))
            SELECT b.hierarchy_level_id,
            b.attribute_type,
            (CASE
				WHEN b.attribute_type = 'type_fashion_grade' 
					THEN 'TRUE'
				WHEN b.attribute_type = 'l4_name' AND (d.s1_name ILIKE '%OUT%' OR d.s1_name ILIKE '%DTG%') 
					THEN 'TRUE'
                ELSE b.attribute_value
             END) 
				AS attribute_value,
            b.application_code,
            (CASE
				WHEN b.attribute_type = 'sales_retail' THEN 'TRUE'
				WHEN b.attribute_type = 'sales_units' THEN 'TRUE'
				WHEN b.attribute_type = 'AUR' THEN 'TRUE'
				WHEN b.attribute_type = 'margin' THEN 'TRUE'
				WHEN b.attribute_type = 'margin_perc' THEN 'TRUE'
				WHEN b.attribute_type = 'st' THEN 'TRUE'
                WHEN b.attribute_type = 'climate' AND (d.s1_name NOT ILIKE '%WH%')
                    THEN 'TRUE'
				WHEN b.attribute_type = 'home_unit_capacity' AND (d.s1_name NOT ILIKE '%WH%' AND d.s1_name NOT ILIKE '%OUTLET%')
				    THEN 'TRUE'
				WHEN b.attribute_type = 'store_lifestyle' AND d.s1_name NOT ILIKE '%WH%'
				    THEN 'TRUE'
				WHEN b.attribute_type = 'collaboration' AND NOT ((d.l1_name ILIKE '%HOME%') OR (d.l2_name ILIKE '%FOOTWEAR%'))
				    THEN 'TRUE'
				WHEN b.attribute_type = 'collar' AND d.l1_name NOT ILIKE '%WOMEN%' AND d.l2_name ILIKE '%WOVEN%'
				    THEN 'TRUE'
				WHEN b.attribute_type = 'end_use' AND NOT ((d.l2_name ILIKE '%FRAGRANCE%') OR (d.l2_name ILIKE '%FOOTWEAR%'))
				    THEN 'TRUE'
                WHEN b.attribute_type = 'layer' AND d.l2_name ILIKE '%KNIT%'
                    THEN 'TRUE'
                WHEN b.attribute_type = 'length' AND ((d.l2_name ILIKE '%PANTS%' OR d.l2_name ILIKE '%SWIM%' OR d.l2_name ILIKE '%SHORTS%' OR d.l2_name ILIKE '%DRESSES%'
                    OR d.l2_name ILIKE '%SKIRTS%' OR d.l2_name ILIKE '%SKORTS%') OR (d.l3_name ILIKE '%LINENS%' OR d.l3_name ILIKE '%FURNISHINGS%' OR
                    d.l3_name ILIKE '%SLEEPWEAR%'))
                    THEN 'TRUE'
				WHEN b.attribute_type = 'fabric' AND d.l1_name NOT ILIKE '%HOME%'
				    THEN 'TRUE'
				WHEN b.attribute_type = 'product_print' AND NOT (d.l1_name ILIKE '%HOME%' OR (d.l1_name ILIKE '%MEN%' AND d.l2_name ILIKE '%ACCESSORIES%') 
				    OR (d.l1_name ILIKE '%WOMEN%' AND d.l2_name ILIKE '%ACCESSORIES%' AND (d.l3_name ILIKE '%HATS%' OR d.l3_name ILIKE '%JEWELRY%' 
				    OR d.l3_name ILIKE '%EYEWEAR%' OR d.l3_name ILIKE '%OTHER%' OR d.l3_name ILIKE '%ALL%'))) 
				    THEN 'TRUE'
                WHEN b.attribute_type = 'property'
                    THEN 'TRUE'
				WHEN b.attribute_type = 'silhouette' AND NOT (
				    d.l1_name ILIKE '%HOME%' AND 
				    (d.l3_name NOT ILIKE '%LINEN%' OR d.l3_name NOT ILIKE '%CANDLE%')) 
					THEN 'TRUE'
                WHEN b.attribute_type = 'sleeve' AND ((d.l2_name ILIKE '%KNITS%' OR d.l2_name ILIKE '%WOVEN%' OR d.l2_name ILIKE '%SWEATER%' OR d.l2_name ILIKE '%OUTERWEAR%'
                    OR d.l2_name ILIKE '%DRESSES%') OR (d.l1_name ILIKE '%MEN%' AND d.l2_name ILIKE '%ACCESSORIES%' AND d.l3_name ILIKE '%FURNISHINGS%')
                    OR (d.l1_name ILIKE '%WOMEN%' AND d.l2_name ILIKE '%ACCESSORIES%' AND d.l3_name ILIKE '%SLEEPWEAR%'))
                    THEN 'TRUE'
                WHEN b.attribute_type = 'stitch_gauge' AND d.l2_name ILIKE '%SWEATER%'
                    THEN 'TRUE'
				WHEN b.attribute_type = 'type_fashion_grade' 
					THEN 'TRUE'
				WHEN b.attribute_type = 'program' AND NOT (
				    d.l1_name ILIKE '%HOME%' OR d.l2_name ILIKE '%ACCESSORIES%') 
					THEN 'TRUE'
                WHEN b.attribute_type = 'collection' AND (d.l1_name ILIKE '%WOMEN%' AND d.l1_name ILIKE '%SWIM%')
                    THEN 'TRUE'
				WHEN b.attribute_type = 'l4_name' 
					THEN 'TRUE'
                ELSE b.is_active
            END) 
				AS is_active,
            b.description
        FROM base_data AS b
        LEFT JOIN d USING (hierarchy_level_id)
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