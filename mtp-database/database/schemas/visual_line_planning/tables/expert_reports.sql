--liquibase formatted sql
--changeset liquibase:expert_reports stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for expert_reports
CREATE TABLE visual_line_planning.expert_reports (
	created_at timestamptz DEFAULT now() NOT NULL,
	report_type varchar(255) NOT NULL,
	season varchar(255) NOT NULL,
	gender varchar(255) NOT NULL,
	demographic varchar(255) NOT NULL,
	"hierarchy" varchar(255) NULL,
	wgsn_images_url varchar(255) NULL,
	read_more_section_json json NULL,
	l2_name varchar(255) NULL,
	l0_name varchar(255) NULL,
	l1_name varchar(255) NULL
);