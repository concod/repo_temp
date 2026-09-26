class templates:
    def changelog_file_template(self, xml_file_path: str) -> str:
        template = f'''<?xml version="1.0" encoding="UTF-8"?>
    <databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:pro="http://www.liquibase.org/xml/ns/pro"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
            http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
            http://www.liquibase.org/xml/ns/pro 
            http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">  
        <include file="{xml_file_path}" relativeToChangelogFile="true"/>
    </databaseChangeLog>
            '''
        return template