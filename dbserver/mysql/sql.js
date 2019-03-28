module.exports = {
    user: {
        add_record: 'insert into ConferenceRecord (Employee_Index, Conference_Index, Subject, RecordTime, SubjectTime, BeginTime, EndTime, ModifyTime) values (?,?,?,?,?,?,?,?)',
        login: 'select EmployeeID,CONVERT (unhex(hex(CONVERT(crearo_erp.cr_erp_employees.`Name` USING latin1))) USING utf8) as UserName from crearo_erp.cr_erp_employees'
    }
}
