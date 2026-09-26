--liquibase formatted sql
--changeset liquibase:pc_create_weekly_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_weekly_partitions

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_create_weekly_partitions(IN _schema text, IN _table_name text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_create_weekly_partitions(IN _schema text, IN _table_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    w record;
begin
	execute format('CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I DEFAULT',
			_schema,
			_table_name || '_default',
			_schema,
			_table_name
	    );

	for w in
		select to_char(min(date) ,'yyyymmdd') string_date,
		       min(date) week_start, max(date) week_end
		from pricesmart.tb_fiscal_date_mapping
		where fiscal_week is not null and fiscal_year >= 2024
		group by fiscal_year, fiscal_week
		order by 1

	loop
        execute format('CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
        	_schema,
            _table_name || '_' || w.string_date::varchar,
            _schema,
            _table_name,
            w.week_start,
            w.week_end
        );
    end loop;

END;
$procedure$
;
