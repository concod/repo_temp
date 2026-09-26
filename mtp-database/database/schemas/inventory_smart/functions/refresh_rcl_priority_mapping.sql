--liquibase formatted sql
--changeset liquibase:refresh_rcl_priority_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:inventory_smart_refresh_rcl_priority_mapping
--comment: Rebuild global.rcl_priority_mapping for one module from inventory_smart.rcl_master_attribute_list (product dimension); function returns void
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.refresh_rcl_priority_mapping(integer);

CREATE OR REPLACE FUNCTION inventory_smart.refresh_rcl_priority_mapping(p_module_code integer)
 RETURNS void

 LANGUAGE plpgsql
AS $function$
DECLARE
	_mandatory_count int;
	_n_optional int;
BEGIN
	IF p_module_code IS NULL THEN
		RAISE EXCEPTION 'p_module_code is required';
	END IF;

	SELECT count(*) INTO _mandatory_count
	FROM inventory_smart.rcl_master_attribute_list
	WHERE module_code = p_module_code
	  AND attribute_dimension = 'product'
	  AND is_mandatory;

	IF _mandatory_count = 0 THEN
		RAISE EXCEPTION 'No mandatory product attributes for module_code % in inventory_smart.rcl_master_attribute_list', p_module_code;
	END IF;

	SELECT count(*) INTO _n_optional
	FROM inventory_smart.rcl_master_attribute_list
	WHERE module_code = p_module_code
	  AND attribute_dimension = 'product'
	  AND NOT is_mandatory;

	IF _n_optional > 30 THEN
		RAISE EXCEPTION 'Too many optional RCL attributes (%) for module_code %; max supported is 30', _n_optional, p_module_code;
	END IF;

	DELETE FROM global.rcl_priority_mapping WHERE module_code = p_module_code;

	INSERT INTO global.rcl_priority_mapping (level, rcl_priority, module_code)
	WITH params AS (
		SELECT p_module_code AS module_code
	),
	mandatory AS (
		SELECT array_agg(m.attribute_name ORDER BY m.attribute_name) AS mandatory_arr
		FROM inventory_smart.rcl_master_attribute_list m
		JOIN params p ON m.module_code = p.module_code
		WHERE m.attribute_dimension = 'product'
		  AND m.is_mandatory
	),
	optional_ordered AS (
		SELECT
			m.attribute_name,
			(row_number() OVER (ORDER BY m.order_of_display NULLS LAST, m.attribute_name) - 1)::int AS bit_idx
		FROM inventory_smart.rcl_master_attribute_list m
		JOIN params p ON m.module_code = p.module_code
		WHERE m.attribute_dimension = 'product'
		  AND NOT m.is_mandatory
	),
	opts AS (
		SELECT count(*)::int AS n FROM optional_ordered
	),
	series AS (
		SELECT gs.v
		FROM opts o
		CROSS JOIN LATERAL generate_series(
			0::bigint,
			CASE WHEN o.n = 0 THEN 0::bigint ELSE (1::bigint << o.n) - 1 END
		) AS gs(v)
	),
	expanded AS (
		SELECT
			s.v,
			COALESCE((
				SELECT array_agg(oo.attribute_name ORDER BY oo.attribute_name)
				FROM optional_ordered oo
				WHERE (s.v & (1::bigint << oo.bit_idx)) <> 0
			), ARRAY[]::varchar[]) AS opt_names
		FROM series s
	)
	SELECT
		(SELECT array_agg(sub.elem ORDER BY sub.elem)
		 FROM unnest(m.mandatory_arr || e.opt_names) AS sub(elem)),
		((1::bigint << o.n) - e.v)::int,
		pr.module_code
	FROM expanded e
	CROSS JOIN mandatory m
	CROSS JOIN opts o
	CROSS JOIN params pr;
END;
$function$;