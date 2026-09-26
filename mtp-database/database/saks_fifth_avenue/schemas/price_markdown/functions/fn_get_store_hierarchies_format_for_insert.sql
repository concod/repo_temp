
--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_store_hierarchies_format_for_insert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_get_store_hierarchies_format_for_insert


DROP FUNCTION if exists price_markdown.fn_get_store_hierarchies_format_for_insert;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_store_hierarchies_format_for_insert(p_hierarchies jsonb)
 RETURNS TABLE(hierarchy_level integer, hierarchy_level_id integer, hierarchy_level_name text)
 LANGUAGE plpgsql
AS $function$
	DECLARE
	begin
        return query (
            select
                case
                    when starts_with(key,'s0') then 0
                    when starts_with(key,'s1') then 1
                    else null
                end as hierarchy_level,
                hierarchy_level_value.value as hierarchy_level_id,
                hierarchy_level_value.label as hierarchy_level_name
            from jsonb_each_text(p_hierarchies) 
            cross join 
            lateral (
                select * from jsonb_to_recordset(value::jsonb) as hierarchies(
                    value int,
                    label text
                )
            ) as hierarchy_level_value
        );

	end;
$function$
;
