--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:rule_store_mapping_view_1 runOnChange:true stripComments:false splitStatements:false context:MTP-58080 labels:MTP-58080
--comment: initial changeset for rule_store_mapping_view
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.rule_store_mapping_view;
CREATE OR REPLACE VIEW inventory_smart.rule_store_mapping_view 
AS
select
	distinct psm.rcl_code,
	rm.module_code,
	CONCAT(
    'l0_name::', psm_rule.rcl_dimension->>'l0_name', ';;',
    'l1_name::', psm_rule.rcl_dimension->>'l1_name', ';;',
    'l2_name::', psm_rule.rcl_dimension->>'l2_name', ';;',
    'l3_name::', psm_rule.rcl_dimension->>'l3_name', ';;',
    'l5_name::', psm_rule.rcl_dimension->>'l5_name', ';;',
    'l6_name::', psm_rule.rcl_dimension->>'l6_name', ';;',
    'article::', psm_rule.rcl_dimension->>'article'
    ) as rcl_dimension,
	psm.psa_code,
	psm_rule.rcl_dimension->>'article' as article,
	case
		when psm.rcl_code = 2 then psm_rule.rcl_dimension->>'size'
		else null
	end as size,
	psm.psa_name,
	TO_DATE(psm.eligibility_start_date, 'YYYY-MM-DD') as start_date,
	TO_DATE(psm.eligibility_end_date, 'YYYY-MM-DD') as end_date,
	'product_store' as mapping_type,
    ARRAY_TO_STRING(rm.rcl_lowest_level, ', ') AS rcl_lowest_level
    from
	(
	select
		rcl_code,
		rule_code,
		psa_code,
		psa_name,
		SPLIT_PART(SPLIT_PART(range_list::text,
		',',
		1),
		'[',
		2) as eligibility_start_date,
		SPLIT_PART(SPLIT_PART(range_list::text,
		',',
		2),
		')',
		1) as eligibility_end_date
	from
		(
		select
			*,
			case
				when right(range,
				1) != '}' then CONCAT(range,
				')}')
				when left(range,
				2) != '{[' then CONCAT('{[',
				range)
				else range
			end as range_list
		from
			(
			select
				*,
				REGEXP_SPLIT_TO_TABLE(validity::text,
				'\),\[') as range
			from
				(
				select
					distinct rcl_code,
					rule_code,
					psa_code,
					psa_name,
					validity
				from
					global.rcl_product_mapping_product_store ) a ) a ) b ) psm
inner join (
	select
		rule_code,
		rcl_code,
		rcl_dimension
	from
		global.rcl_product_mapping_product_store_rule ) psm_rule
		using (rcl_code,
	rule_code)
left join global.rcl_master rm
		using (rcl_code);