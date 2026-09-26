--liquibase formatted sql
--changeset pricesmart:fn_filter_product_group_ids_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: returns final_pg_ids for product group landing page (used by fn_fetch_product_group_landing_page_data)

DROP FUNCTION IF EXISTS pricesmart.fn_filter_product_group_ids;

CREATE OR REPLACE FUNCTION pricesmart.fn_filter_product_group_ids(
	_product_hierarchy jsonb DEFAULT NULL::jsonb,
	_product_group_ids integer[] DEFAULT NULL::integer[],
	p_event_id integer DEFAULT NULL,
	p_with_exclusions bool DEFAULT false
)
RETURNS integer[]
LANGUAGE plpgsql
AS $function$
DECLARE
	pg_ids_query text;
	final_pg_ids integer[];
	_event_record price_promo.event_master%ROWTYPE;
	_event_excluded_product_groups integer[] := array[]::int[];
	_ineligible_product_groups integer[];
	_final_pg_ids_length integer;
BEGIN
	IF p_event_id IS NOT NULL THEN
		SELECT * INTO _event_record
		FROM price_promo.event_master
		WHERE event_id = p_event_id;
	END IF;

	IF _product_group_ids IS NOT NULL AND array_length(_product_group_ids, 1) > 0 THEN
		final_pg_ids := _product_group_ids;
	ELSE
		pg_ids_query := 'SELECT array_agg(pg_id) FROM pricesmart.tb_pg_hierarchy_agg_data WHERE %1$s ';
		pg_ids_query := format(pg_ids_query, pricesmart.fn_get_pg_landing_page_where_clause(_product_hierarchy));
		EXECUTE pg_ids_query INTO final_pg_ids;
	END IF;

	_final_pg_ids_length := coalesce(array_length(final_pg_ids, 1), 0);

	IF p_with_exclusions THEN
		SELECT array_agg(eepg.product_group_id) INTO _event_excluded_product_groups
		FROM price_promo.excluded_event_product_groups eepg
		WHERE eepg.event_id = p_event_id;

		final_pg_ids := array(SELECT unnest(final_pg_ids) UNION SELECT unnest(_event_excluded_product_groups));

	ELSIF _final_pg_ids_length > 0 AND _event_record.product_inclusion_type IN ('specific_products', 'whole_category') THEN
		SELECT array_agg(distinct tpp.pg_id) INTO _ineligible_product_groups
		FROM pricesmart.tb_pg_product tpp
		WHERE tpp.product_id NOT IN (
			SELECT s.product_id FROM price_promo.fn_get_products_based_on_event(p_event_id) s
		)
		AND tpp.pg_id = ANY(final_pg_ids);

		_ineligible_product_groups := coalesce(_ineligible_product_groups, array[-1]::int[]);

		SELECT array_agg(tpg.pg_id) INTO final_pg_ids
		FROM pricesmart.tb_product_group tpg
		WHERE tpg.pg_id = ANY(final_pg_ids)
		AND NOT tpg.pg_id = ANY(_ineligible_product_groups)
		AND tpg.products_count > 0;

	ELSIF _final_pg_ids_length > 0 AND _event_record.product_inclusion_type = 'product_group' THEN
		SELECT array_agg(distinct iepg.product_group_id) INTO final_pg_ids
		FROM price_promo.included_event_product_groups iepg
		WHERE event_id = p_event_id;
	END IF;

	RETURN coalesce(final_pg_ids, array[]::integer[]);
END;
$function$;
