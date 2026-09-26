--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_get_products_based_on_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for price_promo.fn_get_products_based_on_event_2

drop function if exists price_promo.fn_get_products_based_on_event;
CREATE OR REPLACE FUNCTION price_promo.fn_get_products_based_on_event(p_event_id integer)
 RETURNS TABLE(product_id bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
	_product_hierarchies_config jsonb;
	attribute_hierachy_where_condition text;
	attribute_hierachy_where_list text[];
    _event_record  price_promo.event_master%ROWTYPE;
    _query text;
	hierarchy_key text;
	cfg jsonb;
	hierarchy_levels int[];

BEGIN

	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

    select *
    from price_promo.event_master em
    where em.event_id = p_event_id
    into _event_record;
	
	 SELECT array_agg(hierarchy_level_id)
	 	INTO hierarchy_levels
	 FROM price_promo.included_event_product_hierarchy
	 WHERE event_id = p_event_id;
	
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
			                price_promo.included_event_product_hierarchy ieph 
			                where event_id = %2$s and hierarchy_level_id = %3$s
			            )',
						cfg->>'id_column',
						p_event_id,
						cfg->>'id'
				)
			);

			
			
		END LOOP;
	

	attribute_hierachy_where_condition := array_to_string(attribute_hierachy_where_list, ' and ');

    if _event_record.product_inclusion_type = 'whole_category' then

        _query = format(
            '
            select 
                pm.product_id
            from price_promo.product_master pm
            where 
            %2$s
            ',
            p_event_id,
            attribute_hierachy_where_condition

        );

        raise notice 'Query: %', _query;

        return query execute _query;

    elsif _event_record.product_inclusion_type = 'specific_products' then
        return query (
            select 
                iep.product_id
            from price_promo.included_event_products iep
			where event_id = p_event_id
        );

    end if;

END;
$function$
;