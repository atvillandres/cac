forward
global type w_user_login from window
end type
type st_4 from statictext within w_user_login
end type
type st_3 from statictext within w_user_login
end type
type st_2 from statictext within w_user_login
end type
type sle_3 from singlelineedit within w_user_login
end type
type sle_2 from singlelineedit within w_user_login
end type
type cb_2 from commandbutton within w_user_login
end type
type cb_1 from commandbutton within w_user_login
end type
end forward

global type w_user_login from window
integer x = 622
integer y = 1076
integer width = 1673
integer height = 616
boolean titlebar = true
string title = "(ALAI) CAC-LSP System - User Login"
boolean controlmenu = true
windowtype windowtype = response!
long backcolor = 12632256
string icon = "Database!"
st_4 st_4
st_3 st_3
st_2 st_2
sle_3 sle_3
sle_2 sle_2
cb_2 cb_2
cb_1 cb_1
end type
global w_user_login w_user_login

forward prototypes
private function boolean wf_validate_dba_password (ref string password)
end prototypes

private function boolean wf_validate_dba_password (ref string password);//String ls_date, ls_valid_password, ls_first, ls_second, ls_last, ls_paramchar
//Integer li_first, li_second, li_last, li_ctr
//Date ld_date
//
//if not isnumber(password) then Return False
//
//ld_date = Today()
//ls_date = String(ld_date,'mm-dd-yy')
//
//ls_first = String(19 + Integer(Left(ls_date,2)))
//ls_second =  String(10 + Integer(Mid(ls_date,4,2)))
//ls_last = String(15 + Integer(Right(ls_date,2)))
//
//For li_ctr = 1 to len(ls_first)
//	li_first += Integer(Mid(ls_first,li_ctr,1))
//Next
//For li_ctr = 1 to len(ls_second)
//	li_second += Integer(Mid(ls_second,li_ctr,1))
//Next
//For li_ctr = 1 to len(ls_last)
//	li_last += Integer(Mid(ls_last,li_ctr,1))
//Next
//
//ls_first = String(li_first)
//ls_second = String(li_second)
//ls_last = String(li_last)
//
//SELECT "syrparam"."paramchar"  
//  INTO :ls_paramchar  
//  FROM "syrparam"  
//  WHERE ( "syrparam"."paramtype" = 'G11' ) AND  
//        ( "syrparam"."effectdate" = :ld_date ) AND   	
//		  ( "syrparam"."focode" = :gs_fo_code );
//
//If SQLCA.SQLCode = 0 then
//	ls_paramchar = String(Integer(ls_paramchar) + 1)
//Else
//	ls_paramchar = '1'
//End If
//
//if len(Trim(ls_first)) = 1 then
//	ls_first = ls_paramchar
//Else
//	ls_first = ls_paramchar + Right(ls_first,Len(ls_first) - 1)
//End If
//
//if len(Trim(ls_second)) = 1 then
//	ls_second = ls_paramchar
//Else
//	ls_second = Left(ls_second,Len(ls_second) - 1) + ls_paramchar 
//End If
//
//if len(Trim(ls_last)) = 1 then
//	ls_last = ls_paramchar
//Else
//	ls_last = ls_paramchar + Right(ls_last,Len(ls_last) - 1)
//End If
//
//ls_valid_password = ls_first + ls_second + ls_last
//
//if ls_valid_password = password then
//	if ls_paramchar = '1' then
//		  INSERT INTO "syrparam"  
//         ( "paramtype", "effectdate", "focode", "paramdesc", "paramamt",   
//           "parampct", "paramchar", "paramtag" )  
//  			VALUES ( 'G11', :ld_date, :gs_fo_code, 'User Login', null, null,   
//           :ls_paramchar, null )  ;
//	Else
//		  UPDATE "syrparam"  
//     		SET "paramtype" = 'G11',   
//         	 "focode" = :gs_fo_code,   
//             "paramchar" = :ls_paramchar  
//   		WHERE ( "syrparam"."paramtype" = 'G11' ) AND  
//         		( "syrparam"."effectdate" = :ld_date ) AND  
//         		( "syrparam"."focode" = :gs_fo_code )   ;
//	End If
//	COMMIT ;
	Return True
//Else
//	Return False
//End If




end function

on w_user_login.create
this.st_4=create st_4
this.st_3=create st_3
this.st_2=create st_2
this.sle_3=create sle_3
this.sle_2=create sle_2
this.cb_2=create cb_2
this.cb_1=create cb_1
this.Control[]={this.st_4,&
this.st_3,&
this.st_2,&
this.sle_3,&
this.sle_2,&
this.cb_2,&
this.cb_1}
end on

on w_user_login.destroy
destroy(this.st_4)
destroy(this.st_3)
destroy(this.st_2)
destroy(this.sle_3)
destroy(this.sle_2)
destroy(this.cb_2)
destroy(this.cb_1)
end on

event open;sle_2.SetFocus()
end event

type st_4 from statictext within w_user_login
boolean visible = false
integer x = 151
integer y = 424
integer width = 814
integer height = 72
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
boolean italic = true
long textcolor = 33554432
long backcolor = 12632256
boolean enabled = false
string text = "Opening CAC Enterprise .........."
boolean focusrectangle = false
end type

type st_3 from statictext within w_user_login
integer x = 142
integer y = 272
integer width = 293
integer height = 72
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long backcolor = 12632256
boolean enabled = false
string text = "Password :"
alignment alignment = center!
boolean focusrectangle = false
end type

type st_2 from statictext within w_user_login
integer x = 142
integer y = 168
integer width = 247
integer height = 72
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long backcolor = 12632256
boolean enabled = false
string text = "User ID :"
alignment alignment = center!
boolean focusrectangle = false
end type

type sle_3 from singlelineedit within w_user_login
integer x = 475
integer y = 268
integer width = 631
integer height = 72
integer taborder = 50
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "MS Sans Serif"
long backcolor = 16777215
boolean autohscroll = false
boolean password = true
textcase textcase = lower!
borderstyle borderstyle = stylelowered!
end type

type sle_2 from singlelineedit within w_user_login
integer x = 475
integer y = 156
integer width = 631
integer height = 72
integer taborder = 40
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "MS Sans Serif"
long backcolor = 16777215
boolean autohscroll = false
textcase textcase = upper!
borderstyle borderstyle = stylelowered!
end type

type cb_2 from commandbutton within w_user_login
integer x = 1184
integer y = 264
integer width = 347
integer height = 88
integer taborder = 20
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "MS Sans Serif"
string text = "Cancel"
boolean cancel = true
end type

event clicked;
close(parent)
HALT
end event

type cb_1 from commandbutton within w_user_login
integer x = 1184
integer y = 148
integer width = 347
integer height = 88
integer taborder = 10
integer textsize = -8
integer weight = 400
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "MS Sans Serif"
string text = "OK"
boolean default = true
end type

event clicked;STRING  ls_exist_userid  , ls_exist_password , ls_valid_fo_code , ls_paramchar
STRING  ls_inifile,ls_dbms, ls_database, ls_userid, ls_dbpass, ls_logid, ls_logpass, ls_server, ls_dbparm, ls_lock, ls_autocommit
INTEGER li_count
DATE    ld_date, ld_last_housekeeping, ld_last_send_date

SetPointer(hourglass!)

IF IsNull(sle_2.text) OR Trim(sle_2.text) = '' THEN
	MessageBox('Missing Information','You have not supplied a User ID')
	sle_2.SetFocus()
	RETURN
END IF

IF IsNull(sle_3.text) OR Trim(sle_3.text) = '' THEN
	MessageBox('Missing Information','You have not supplied a Password')
	sle_3.SetFocus()
	RETURN
END IF

sle_2.text = Trim(sle_2.text)
sle_3.text = Trim(sle_3.text)

// Global Variables
gs_username = TRIM( UPPER(sle_2.text) )
gs_password = TRIM( sle_3.text )

// Connect To ALAICAC

ls_inifile 		= "\cacent~~1\alaicac.ini"
ls_dbms			= ProfileString ( ls_inifile, "Profile ALAICAC", "DBMS","")
ls_database		= ProfileString ( ls_inifile, "Profile ALAICAC", "Database",		"")
ls_userid		= UPPER(sle_2.text)
ls_dbpass		= sle_3.text
ls_logid			= UPPER(sle_2.text)
ls_logpass		= sle_3.text
ls_dbparm		= ProfileString ( ls_inifile, "Profile ALAICAC", "DBParm","ConnectString='DSN=ALAICAC;UID=" + ls_userid + ";PWD=" +ls_dbpass+"',StaticBind = 0 ")
ls_lock			= ProfileString ( ls_inifile, "Profile ALAICAC", "Lock","")
ls_autocommit	= ProfileString ( ls_inifile, "Profile ALAICAC", "AutoCommit","false")

SQLCA.DBMS		  = ls_dbms
SQLCA.Database	  = ls_database
SQLCA.UserID	  = ls_userid
SQLCA.DBPass	  = ls_dbpass
SQLCA.LogID		  = ls_logid
SQLCA.LogPass	  = ls_logpass
SQLCA.ServerName = ls_server
SQLCA.DBParm	  = ls_dbparm
SQLCA.Lock		  = ls_lock

CHOOSE CASE Lower ( ls_autocommit ) 
	CASE "1", "true", "on", "yes"
		SQLCA.AutoCommit	= True
	CASE "0", "false", "off", "no"
		SQLCA.AutoCommit	= False
	CASE ELSE
		SQLCA.AutoCommit	= False
END CHOOSE

st_4.visible = true
st_4.Text = 'Connecting to the server...'

CONNECT USING SQLCA;

IF SQLCA.SQLCode <> 0 THEN
	MessageBox ("Cannot Connect to Database ALAICAC", SQLCA.SQLErrText )
	st_4.visible = false
	RETURN
END IF

//DELETE FROM BDOAPMST ;
//COMMIT ;
//ROLLBACK ;
//HALT

// Connect To ALMODDATA

SQLCA_ALMODDATA  = CREATE TRANSACTION

ls_inifile 		= "\cacent~~1\alaicac.ini"
ls_dbms			= ProfileString ( ls_inifile, "Profile ALMODDATA", "DBMS","")
ls_database		= ProfileString ( ls_inifile, "Profile ALMODDATA", "Database",		"")
ls_userid		= UPPER(sle_2.text)
ls_dbpass		= sle_3.text
ls_logid			= UPPER(sle_2.text)
ls_logpass		= sle_3.text
ls_dbparm		= ProfileString ( ls_inifile, "Profile ALMODDATA", "DBParm","ConnectString='DSN=ALMODDATA;UID=" + ls_userid + ";PWD=" +ls_dbpass+"',StaticBind = 0 ")
ls_lock			= ProfileString ( ls_inifile, "Profile ALMODDATA", "Lock","")
ls_autocommit	= ProfileString ( ls_inifile, "Profile ALMODDATA", "AutoCommit","false")

SQLCA_ALMODDATA.DBMS		  = ls_dbms
SQLCA_ALMODDATA.Database	  = ls_database
SQLCA_ALMODDATA.UserID	  = ls_userid
SQLCA_ALMODDATA.DBPass	  = ls_dbpass
SQLCA_ALMODDATA.LogID		  = ls_logid
SQLCA_ALMODDATA.LogPass	  = ls_logpass
SQLCA_ALMODDATA.ServerName = ls_server
SQLCA_ALMODDATA.DBParm	  = ls_dbparm
SQLCA_ALMODDATA.Lock		  = ls_lock

CHOOSE CASE Lower ( ls_autocommit ) 
	CASE "1", "true", "on", "yes"
		SQLCA_ALMODDATA.AutoCommit	= True
	CASE "0", "false", "off", "no"
		SQLCA_ALMODDATA.AutoCommit	= False
	CASE ELSE
		SQLCA_ALMODDATA.AutoCommit	= False
END CHOOSE

CONNECT USING SQLCA_ALMODDATA;

IF SQLCA_ALMODDATA.SQLCode <> 0 THEN
	MessageBox ("Cannot Connect to Database ALMODDATA", SQLCA_ALMODDATA.SQLErrText )
	st_4.visible = false
	DISCONNECT USING SQLCA ;
	RETURN
END IF

// Connect To GISDATA

SQLCA_GISDATA  = CREATE TRANSACTION

ls_inifile 		= "\cacent~~1\alaicac.ini"
ls_dbms			= ProfileString ( ls_inifile, "Profile GISDATA", "DBMS","")
ls_database		= ProfileString ( ls_inifile, "Profile GISDATA", "Database",		"")
ls_userid		= UPPER(sle_2.text)
ls_dbpass		= sle_3.text
ls_logid			= UPPER(sle_2.text)
ls_logpass		= sle_3.text
ls_dbparm		= ProfileString ( ls_inifile, "Profile GISDATA", "DBParm","ConnectString='DSN=GISDATA;UID=" + ls_userid + ";PWD=" +ls_dbpass+"',StaticBind = 0 ")
ls_lock			= ProfileString ( ls_inifile, "Profile GISDATA", "Lock","")
ls_autocommit	= ProfileString ( ls_inifile, "Profile GISDATA", "AutoCommit","false")

SQLCA_GISDATA.DBMS		  = ls_dbms
SQLCA_GISDATA.Database	  = ls_database
SQLCA_GISDATA.UserID	  = ls_userid
SQLCA_GISDATA.DBPass	  = ls_dbpass
SQLCA_GISDATA.LogID		  = ls_logid
SQLCA_GISDATA.LogPass	  = ls_logpass
SQLCA_GISDATA.ServerName = ls_server
SQLCA_GISDATA.DBParm	  = ls_dbparm
SQLCA_GISDATA.Lock		  = ls_lock

CHOOSE CASE Lower ( ls_autocommit ) 
	CASE "1", "true", "on", "yes"
		SQLCA_GISDATA.AutoCommit	= True
	CASE "0", "false", "off", "no"
		SQLCA_GISDATA.AutoCommit	= False
	CASE ELSE
		SQLCA_GISDATA.AutoCommit	= False
END CHOOSE

CONNECT USING SQLCA_GISDATA;

IF SQLCA_GISDATA.SQLCode <> 0 THEN
	MessageBox ("Cannot Connect to Database GISDATA", SQLCA_GISDATA.SQLErrText )
	st_4.visible = false
	DISCONNECT USING SQLCA_ALMODDATA;	
	DISCONNECT USING SQLCA ;
	RETURN
END IF

st_4.Text = 'Validating the user profile...'

SELECT USERID, PASSWORD
INTO  :ls_exist_userid, :ls_exist_password
FROM  SYRUSERID
WHERE SYRUSERID.USERID = :ls_userid ;  
  
IF IsNull(ls_exist_userid) OR Trim(ls_exist_userid) = '' THEN
	MessageBox("UserID","User ID '"+sle_2.text+ "' is invalid  ")
	st_4.visible = FALSE
	sle_2.SetFocus()
	DISCONNECT USING SQLCA_GISDATA ;
	DISCONNECT USING SQLCA_ALMODDATA ;
	DISCONNECT USING SQLCA;
	RETURN
END IF

st_4.Text = 'Opening CAC Enterprise...'

ld_date      = Today()
gs_userid    = SQLCA.UserID
CLOSE(w_user_login)
OPEN(w_cac_frame)
OPENSHEET(w_cac_logo,w_cac_frame)
end event
