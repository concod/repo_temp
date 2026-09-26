--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_get_hierarchies_format_for_insert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_get_hierarchies_format_for_insert


DROP FUNCTION if exists price_markdown.fn_get_hierarchies_format_for_insert;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_hierarchies_format_for_insert(p_hierarchies jsonb, _is_product_hierarchy boolean DEFAULT true)
 RETURNS TABLE(hierarchy_level integer, hierarchy_level_id integer, hierarchy_level_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	begin
        return query (
            select
                hm.id_mapping as hierarchy_level,
                (hierarchy_item.value)::integer as hierarchy_level_id,
                (hierarchy_item.label)::text as hierarchy_level_name
            from jsonb_each(p_hierarchies) jb(key, value)
            inner join pricesmart.pricesmart_hierarchy_mapping hm 
                on hm.request_key = jb.key
                and hm.is_product_hierarchy = _is_product_hierarchy
            cross join 
            lateral jsonb_to_recordset(jb.value) as hierarchy_item(label text, value int)
            where jsonb_array_length(jb.value) > 0
        );

	end;
$function$
;
