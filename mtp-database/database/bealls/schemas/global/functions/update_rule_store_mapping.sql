--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:update_rule_store_mapping runOnChange:true stripComments:false splitStatements:false context:update_rule_store_mapping labels:update_rule_store_mapping
--comment: update_rule_store_mapping - intial sync version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_rule_store_mapping(data_list jsonb, created_by integer, updated_by integer);
CREATE OR REPLACE FUNCTION global.update_rule_store_mapping(data_list jsonb, created_by integer, updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/* 	
	 * Function/Procedure name: global.update_rule_store_mapping
	 * calling statement : 	
	  select * from global.update_rule_store_mapping('[{"psa_name": "3", "rule_code": 1662970, "validity": null}, {"psa_name": "4", "rule_code": 1662970, "validity": null}, {"psa_name": "3", "rule_code": 1662970, "validity": null}, {"psa_name": "4", "rule_code": 1662970, "validity": null}, {"psa_name": "1", "validity": "{[2024-05-07, 2024-05-17], [2026-01-15, 2026-01-24]}", "rule_code": 1662959}, {"psa_name": "1", "validity": "{[2024-05-07, 2024-05-17], [2026-01-15, 2026-01-24]}", "rule_code": 1662970}]', 251, 251);
	 * 
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 * Akshay Jain		05-MAY-2024  	SP to update mapping data in rcl flow
	 */
DECLARE
    data_item jsonb;
   query text;
  validity_value text;
BEGIN
    FOR data_item IN SELECT jsonb_array_elements(data_list)
    	
    loop

	   	validity_value := COALESCE(data_item->>'validity', NULL);
	   	
	    query = 
         '
        INSERT INTO global.rcl_product_mapping_product_store (rcl_code, rule_code, psa_code, validity, created_at, updated_at, created_by,updated_by, psa_name, child_sku)
        SELECT DISTINCT 
            rcl_code, 
            rule_code, 
            psa_code,
			' || 
        CASE 
            WHEN validity_value IS NOT NULL THEN '''' || validity_value || ''''
            ELSE  ' NULL '
        END || '::datemultirange,
            now(), 
            now(),
			' || created_by || ',
			' || updated_by || ',
            psa_name, 
            NULL
        FROM 
            global.rcl_product_mapping_product_store_rule rpmpsr
        JOIN 
            global.product_store_attributes_filter psaf ON
            rpmpsr.rcl_dimension->>''l0_name'' = psaf.l0_name
            AND rpmpsr.rcl_dimension->>''l1_name'' = psaf.l1_name
            AND rpmpsr.rcl_dimension->>''l4_name'' = psaf.l4_name
            AND rpmpsr.rcl_dimension->>''l3_name'' = psaf.l3_name
        WHERE 
            rule_code = ''' || (data_item->>'rule_code')::text || '''
            AND psa_name = ''' || (data_item->>'psa_name')::text || '''
        ON CONFLICT (rcl_code, rule_code, psa_code) DO UPDATE
        SET 
            validity = EXCLUDED.validity,
            updated_at = now(),
			updated_by = ' || updated_by || '
		';
	raise notice '_query_part: %', query;
	execute query;
    END LOOP;
END;
$function$
;