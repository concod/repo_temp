--liquibase formatted sql
--changeset satvik.sharma@impactanalytics.co:MTP-57272-product_dc runOnChange:true stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment: initial changeset for add_product_dc_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_dc_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_product_dc_mapping(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		-- Parse JSON once into temp tables for efficient bulk operations
		CREATE TEMP TABLE _dc_unmap ON COMMIT DROP AS
		SELECT 
			r->>'product_code' AS product_code,
			u.dc::int AS dc_code
		FROM jsonb_array_elements(($1->'elements')) r,
			 jsonb_array_elements_text(((r->>'dc')::jsonb)->'unmap') u(dc);

		CREATE TEMP TABLE _dc_map ON COMMIT DROP AS
		SELECT 
			r->>'product_code' AS product_code,
			m.dc::int AS dc_code
		FROM jsonb_array_elements(($1->'elements')) r,
			 jsonb_array_elements_text(((r->>'dc')::jsonb)->'map') m(dc);

		-- Unmap: bulk UPDATE from temp table
		UPDATE "global".product_mapping pm
		SET is_active = false, updated_at = now(), updated_by = $2
		FROM _dc_unmap sub
		WHERE pm.product_code = sub.product_code
		  AND pm.dc_code = sub.dc_code
		  AND pm.mapping_type = 'product_dc';

		-- Map: bulk INSERT from temp table
		INSERT INTO "global".product_mapping (mapping_type, product_code, dc_code, created_at, created_by)
		SELECT 'product_dc', product_code, dc_code, now(), $2
		FROM _dc_map
		ON CONFLICT (product_code, dc_code, mapping_type)
		DO UPDATE SET is_active = true, updated_at = now(), updated_by = $2;
	end
$function$
;
