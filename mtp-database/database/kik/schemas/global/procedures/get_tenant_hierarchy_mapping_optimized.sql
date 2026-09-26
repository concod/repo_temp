--liquibase formatted sql
--changeset liquibase:changes_for_tenant_hierarchy_mapping_for_priority_levels runOnChange:true stripComments:false splitStatements:false context:MTP-84180 labels:changes_for_tenant_hierarchy_mapping
--comment: MTP-84180: changes for the SP to include the store and product levels in the hierarchy mapping.
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.get_tenant_hierarchy_mapping_optimized(input integer, text, text[]);
CREATE OR REPLACE FUNCTION global.get_tenant_hierarchy_mapping_optimized(input integer, text, text[])
 RETURNS TABLE(application_code integer, attribute_type character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$

DECLARE
    _query_combine text;
    _levels_list text;  -- Variable to hold the converted levels list
    _max_expected_level integer;  -- Maximum expected level based on input array length
	_chk_condition text;
BEGIN
    -- Convert the array to a comma-separated string
    _levels_list := array_to_string(ARRAY(SELECT quote_literal(attr) FROM unnest($3::text[]) AS attr), ',');

    -- Set the maximum expected level based on the number of attributes provided
    _max_expected_level := array_length($3, 1);

	-- Set the check condition based on max expected level
    IF _max_expected_level = 1 THEN
        _chk_condition := '';
    ELSE
        _chk_condition := 'AND chk >= 0';
    END IF;

    _query_combine := 'with recursive filter_cte as
                        (
select
	b.hierarchy_level,
	b.hierarchy_value,
	a.rnk,
	b.hierarchy_level_id,
	-1 as chk,
	a.rnk as level_reached
from
	t1 as a
join t2 as b
		using(hierarchy_level, hierarchy_value)
where
	a.rnk = (
	select
		MIN(rnk)
	from
		t1)
union all
                            (
select
	b.hierarchy_level,
	b.hierarchy_value,
	a.rnk,
	b.hierarchy_level_id,
	c.hierarchy_level_id as chk,
	a.rnk as level_reached
from
	filter_cte as c
join t1 as a on
	a.rnk = (
	select
		MIN(rnk)
	from
		t1
	where
		rnk > c.rnk)
join t2 as b on
	a.hierarchy_value = b.hierarchy_value
	and a.hierarchy_level = b.hierarchy_level
	and b.hierarchy_level_id = c.hierarchy_level_id
                            )
                        ),
                        t1 as
                        (
select
	a.attribute_name as hierarchy_level,
	TRIM(REGEXP_SPLIT_TO_TABLE(replace(TRIM(both ''{}'' from attribute_value), ''"'', ''''), '',''),  '' '') as hierarchy_value,
	rnk
from
	cluster_smart.cluster_plan_attributes as a
join
                            (
	select
		attribute_name,
		hierarchy_level,
		rank() over(order by hierarchy_level) as rnk
	from
		(
		select
			distinct generic_column_name as attribute_name,
			hierarchy_level
		from
			global.store_generic_schema_mapping pgsm
		where
			generic_column_name IN (' || _levels_list || ')
	union
		select
			distinct generic_column_name as attribute_name,
			hierarchy_level + 10
		from
			global.product_generic_schema_mapping pgsm
		where
			generic_column_name IN (' || _levels_list || ') )a
                            ) as b
		using(attribute_name)
where
	cluster_plan_code = ' || $1 || '
order by
	left(attribute_name, 2) desc
                        ),
                        t2 as
                        (
select
	hierarchy_level_id,
	a.hierarchy_level,
	hierarchy_value,
	rnk
from
	"global".tenant_hierarchy_levels as a
join
                            (
	select
		hierarchy_level,
		rnk + 10 as rnk
	from
		(
		select
			distinct generic_column_name as hierarchy_level,
			rank() over(order by hierarchy_level) as rnk
		from
			global.product_generic_schema_mapping pgsm
		where
			generic_column_name  in (' || _levels_list || '))a
union
	select
		distinct generic_column_name as hierarchy_level,
		rank() over(order by hierarchy_level) as rnk
	from
		global.store_generic_schema_mapping pgsm
	where
		generic_column_name   in (' || _levels_list || ')) as b
		using(hierarchy_level)
                        )
                        select
    application_code,
    attr_type,
    JSONB_OBJECT_AGG(attribute_type, attribute_value) AS attribute_value
from
(
    select
        thm.application_code,
        thm.description as attr_type,
        thm.attribute_type,
        thm.attribute_value,
        fc.level_reached,
        max(fc.level_reached) over (partition by fc.hierarchy_level_id) as max_level
    from
        (
            SELECT *
            FROM global.tenant_hierarchy_mapping
            WHERE description = ''' || $2 || '''
              AND is_active = TRUE
        ) thm
    join filter_cte fc
        using(hierarchy_level_id)
) x
where
    level_reached = max_level
group by
	1,
	2';
	RAISE NOTICE '%', _max_expected_level;
    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
END
$function$
;