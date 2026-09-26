--liquibase formatted sql
--changeset sivaprasath.vadivel:kpis_master_v2_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_v2

DO $$
BEGIN

	CREATE TABLE monday_smart.kpis_master_v2 (
		kpi_code int4 NOT NULL,
		kc_code int4 NULL,
		"name" varchar NOT NULL,
		description varchar NULL,
		formula varchar NOT NULL,
		table_name varchar NOT NULL,
		variables _varchar NULL,
		"type" varchar NULL,
		formula_description varchar NULL,
		identifier varchar NULL,
		display_name varchar NULL,
		sort_order int4 NULL,
		format varchar NULL,
		min_thres float4 NULL,
		max_thres float4 NULL,
		CONSTRAINT kpi_master_pk PRIMARY KEY (name),
		CONSTRAINT kpis_master_v2_kpi_code_key UNIQUE (kpi_code)
	);

	IF NOT EXISTS (SELECT 1 FROM pg_proc where proname = 'build_kpi_intermediate_link' and pronamespace in (select oid from pg_namespace where nspname = 'monday_smart')) THEN

	CREATE FUNCTION monday_smart.build_kpi_intermediate_link()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $function$
	DECLARE missing_count int;
	DECLARE missing_variables varchar;
	DECLARE exception_message text;
	BEGIN

	SELECT COUNT(v), array_to_string(array_agg(v),',')
	INTO missing_count, missing_variables
	FROM unnest(COALESCE(NEW.variables, '{}')) AS v
	LEFT JOIN monday_smart.kpis_master_intermediate_v2 kmi
		ON kmi.intermediate_column = v
	WHERE kmi.intermediate_column IS NULL;

	IF missing_count > 0 THEN
		exception_message := 'variables '|| missing_variables ||' is/are not available in monday_smart.kpis_master_intermediate_v2';
		RAISE EXCEPTION '%', exception_message;
	ELSE
		insert into monday_smart.kpis_master_intermediate_link
		select NEW.name, v
		from
			unnest(coalesce(NEW.variables, '{}')) as v
		on conflict do nothing
		;
	END IF;

	RETURN NEW;
	END
	$function$
	;

	END IF;

	create trigger trigger_kpi_intermediate_link
	after insert or update
	on monday_smart.kpis_master_v2
	for each row
	execute function monday_smart.build_kpi_intermediate_link();

END
$$;