--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_master

CREATE TABLE price_markdown.tb_custom_alerts_master (
	alert_id serial4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	severity price_markdown."custom_alerts_severity_level" NOT NULL,
	subscribers _int4 NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NULL,
	status bool DEFAULT true NULL,
	CONSTRAINT tb_custom_alerts_master_pkey PRIMARY KEY (alert_id)
);

--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_custom_alerts_master_1.
alter table price_markdown.tb_custom_alerts_master 
drop column severity,
add column severity_id int4 not null,
add constraint fk_severity 
foreign key (severity_id) references price_markdown.tb_custom_alerts_severity_config(severity_id);
