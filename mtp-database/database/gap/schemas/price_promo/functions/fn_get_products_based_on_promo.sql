--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_get_products_based_on_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_get_products_based_on_promo

DROP FUNCTION if exists price_promo.fn_get_products_based_on_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_get_products_based_on_promo(p_promo_id integer)
 RETURNS TABLE(product_id bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
	_product_hierarchies_config jsonb;
	attribute_hierachy_where_condition text;
	attribute_hierachy_where_list text[];
    _promo_record  price_promo.promo_master%ROWTYPE;
    _query text;
	hierarchy_key text;
	cfg jsonb;
	hierarchy_levels int[];
	product_selection_config_json jsonb;
	product_selection_type text;

BEGIN

	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

    select *
    from price_promo.promo_master pm
    where pm.promo_id = p_promo_id
    into _promo_record;
	
	 SELECT array_agg(hierarchy_level_id)
	 	INTO hierarchy_levels
	 FROM price_promo.included_product_hierarchy
	 WHERE promo_id = p_promo_id;
	
	FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_product_hierarchies_config)
		LOOP
			IF cfg->>'id' is NULL THEN
				CONTINUE;
			END IF;
			
			IF not (cfg->>'id')::int = ANY(hierarchy_levels) THEN
				CONTINUE;
			END IF;
			
			
			attribute_hierachy_where_list := array_append(
				attribute_hierachy_where_list,
				format('pm.%1$s::bigint in (
			                select hierarchy_value_id from 
			                price_promo.included_product_hierarchy iph 
			                where promo_id = %2$s and hierarchy_level_id = %3$s
			            )',
						cfg->>'id_column',
						p_promo_id,
						cfg->>'id'
				)
			);

			
			
		END LOOP;
	

	attribute_hierachy_where_condition := array_to_string(attribute_hierachy_where_list, ' and ');

	product_selection_type := _promo_record.product_selection_type;

	SELECT json_object_agg(id, to_jsonb(row)) INTO product_selection_config_json
        FROM (
            SELECT * FROM price_promo.product_selection_type_config
        ) AS row;

    if product_selection_config_json -> product_selection_type ->> 'product_selection_type' IN (
		'specific_products', 'product_group', 'whole_category'
	) then
        return query (
            select 
                pp.product_id
            from price_promo.promo_product pp
			where promo_id = p_promo_id
        );

    end if;

END;
$function$
;
