Generated Application Objectforward
global type cac from application
end type
global transaction sqlca
global dynamicdescriptionarea sqlda
global dynamicstagingarea sqlsa
global error error
global message message
end forward

global variables
LONG   glong_errcounter
LONG   glong_failcntr
DEC {2} gdec_bkrate
STRING gs_userid, gs_sessionid, gs_username, gs_password, gs_unittag

STR_PROCCDRVAR gstr_proccdrvar
TRANSACTION SQLCA_APMODDTA, t_main, t_dest, t_source
long ag_total, ag_row, pl_total, pl_row
long fo_total, fo_row, ro_total, ro_row
long co_total, co_row, cl_total, cl_row

TRANSACTION SQLCA_RAWDATA, SQLCA_OUTBOUND, SQLCA_CACDB, t_input, sqlca_gendata3
TRANSACTION SQLCA_ALMODDATA, SQLCA_GISDATA
string gs_apppath, gs_error, gs_inifile
long il_row
end variables

global type cac from application
string appname = "cac"
string displayname = "CAC Enterprise"
end type
global cac cac

on cac.create
appname="cac"
message=create message
sqlca=create transaction
sqlda=create dynamicdescriptionarea
sqlsa=create dynamicstagingarea
error=create error
end on

on cac.destroy
destroy(sqlca)
destroy(sqlda)
destroy(sqlsa)
destroy(error)
destroy(message)
end on

event open;STRING  ls_run
INTEGER li_result
OPEN(w_user_login)
ls_run = "command.com /c C:\CACENT~~1\ALAI\DOSBAT\DELFLECF.BAT"

li_result = RUN(ls_run, Minimized!)
IF li_result <> 1 THEN
	// "Error in Executing in Deleting Old CDR/FCS Files"
	MessageBox('Warning!!!', "Couldn't Delete Old CDR/FCS Files")
END IF



end event
