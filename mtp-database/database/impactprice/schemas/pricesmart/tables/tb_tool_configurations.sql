
--liquibase formatted sql
--changeset liquibase:tb_tool_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_tool_configurations
CREATE TABLE pricesmart.tb_tool_configurations (
	id serial4 NOT NULL,
	"module" varchar(250) NULL,
	config_name text NOT NULL,
	config_value text NOT NULL,
	config_value_type pricesmart."field_types_enum" NOT NULL,
	is_used_by_fe bool DEFAULT false NULL,
	CONSTRAINT tb_tool_configurations_pk PRIMARY KEY (id)
);
