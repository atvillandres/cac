forward
global type w_cac_frame from window
end type
type mdi_1 from mdiclient within w_cac_frame
end type
type n_cac_connectservice from oleobject within w_cac_frame
end type
end forward

global type w_cac_frame from window
integer width = 2057
integer height = 1412
boolean titlebar = true
string title = "Centralized Accounting Channel - (Enterprise Version)"
string menuname = "cac_menu"
boolean controlmenu = true
boolean minbox = true
boolean maxbox = true
boolean resizable = true
windowtype windowtype = mdi!
windowstate windowstate = maximized!
long backcolor = 67108864
string icon = "C:\CAC Entrp\icons&bmps\cac_icon.ico"
event ue_open ( )
mdi_1 mdi_1
n_cac_connectservice n_cac_connectservice
end type
global w_cac_frame w_cac_frame

forward prototypes
public subroutine wf_disablemenu ()
public subroutine wf_enablemenurights ()
public function boolean wf_administrator ()
end prototypes

event ue_open;DATE ldte_today
TIME lt_time 

ldte_today   = today()
lt_time      = now()
gs_sessionid = TRIM(UPPER(gs_userid)) + TRIM(STRING(ldte_today,"mmddyyyy"))+ TRIM(STRING(lt_time,"hhmmss"))

INSERT INTO "LOGHISTORY"( "SESSIONID","USERID","LOGINDATE","LOGINTIME","LOGOUTDATE","LOGOUTTIME")  
VALUES ( :gs_sessionid,:gs_userid,:ldte_today,:lt_time,:ldte_today,:lt_time );

This.Title = 'Centralized Accounting Channel - ALAI (' + TRIM( UPPER( gs_userid ) ) + '), Version 2.11'
end event
public subroutine wf_disablemenu ();// Visible Property
cac_menu.m_dailyprocessing.visible = FALSE
cac_menu.m_dailyprocessing.m_rundaily.visible = FALSE
cac_menu.m_dailyprocessing.m_createlspupload.visible = FALSE
cac_menu.m_dailyprocessing.m_createglwfile.visible = FALSE
cac_menu.m_dailyprocessing.m_endofdayprocessing.visible = FALSE

cac_menu.m_reports.visible = FALSE
cac_menu.m_reports.m_ahciun_mmddorffile.visible = FALSE
cac_menu.m_reports.m_alaitablist.visible = FALSE
cac_menu.m_reports.m_bpirm2xtract.visible = FALSE
cac_menu.m_reports.m_checkdisbxtract.visible = FALSE
cac_menu.m_reports.m_detailederrorlist.visible = FALSE
cac_menu.m_reports.m_agentwtpfsl.visible = FALSE
cac_menu.m_reports.m_priorlsptb.visible = FALSE
cac_menu.m_reports.m_submission2bdo.visible = FALSE
cac_menu.m_reports.m_processstat.visible = FALSE
cac_menu.m_reports.m_foexcesscash.visible = FALSE
cac_menu.m_reports.m_miscreports.visible = FALSE
//cac_menu.m_reports.m_taxesextract.visible = FALSE

cac_menu.m_administration.visible = FALSE
cac_menu.m_administration.m_referencefilemaint.visible = FALSE
cac_menu.m_administration.m_usermaintenance.visible = FALSE
cac_menu.m_administration.m_audittrail.visible = FALSE
cac_menu.m_administration.m_resubmitfile.visible = FALSE
cac_menu.m_administration.m_fcsrefreshreffiles.visible = FALSE

// Enable Property

cac_menu.m_dailyprocessing.enabled = FALSE
cac_menu.m_dailyprocessing.m_rundaily.enabled = FALSE
cac_menu.m_dailyprocessing.m_createlspupload.enabled = FALSE
cac_menu.m_dailyprocessing.m_createglwfile.enabled = FALSE
cac_menu.m_dailyprocessing.m_endofdayprocessing.enabled = FALSE

cac_menu.m_reports.enabled = FALSE
cac_menu.m_reports.m_ahciun_mmddorffile.enabled = FALSE
cac_menu.m_reports.m_alaitablist.enabled = FALSE
cac_menu.m_reports.m_bpirm2xtract.enabled = FALSE
cac_menu.m_reports.m_checkdisbxtract.enabled = FALSE
cac_menu.m_reports.m_detailederrorlist.enabled = FALSE
cac_menu.m_reports.m_agentwtpfsl.enabled = FALSE
cac_menu.m_reports.m_priorlsptb.enabled = FALSE
cac_menu.m_reports.m_submission2bdo.enabled = FALSE
cac_menu.m_reports.m_processstat.enabled = FALSE
cac_menu.m_reports.m_foexcesscash.enabled = FALSE
cac_menu.m_reports.m_miscreports.enabled = FALSE
//cac_menu.m_reports.m_taxesextract.enabled = FALSE

cac_menu.m_administration.enabled = FALSE
cac_menu.m_administration.m_referencefilemaint.enabled = FALSE
cac_menu.m_administration.m_usermaintenance.enabled = FALSE
cac_menu.m_administration.m_audittrail.enabled = FALSE
cac_menu.m_administration.m_resubmitfile.enabled = FALSE
cac_menu.m_administration.m_fcsrefreshreffiles.enabled = FALSE

end subroutine

public subroutine wf_enablemenurights ();STRING lv_menuname,lv_menuname1

DECLARE c_menu CURSOR FOR  
SELECT DISTINCT "SYRUSERMENU"."MENUNAME"  
FROM "SYRUSERMENU"  
WHERE TRIM("SYRUSERMENU"."USERID") = :gs_userid;

DECLARE c_menu1 CURSOR FOR  
SELECT DISTINCT "SYRUSRFUNC"."FUNCNAME"  
FROM "SYRUSRFUNC"  
WHERE TRIM("SYRUSRFUNC"."USERID") = :gs_userid;

OPEN c_menu;
DO WHILE SQLCA.SQLCODE = 0 
	FETCH c_menu INTO :lv_menuname;
	IF SQLCA.SQLCODE <> 0 THEN
		EXIT 
	END IF

	CHOOSE CASE TRIM(lv_menuname)
		CASE "m_dailyprocessing"
			cac_menu.m_dailyprocessing.visible = TRUE
			cac_menu.m_dailyprocessing.enabled = TRUE
		CASE "m_reports" 
			cac_menu.m_reports.visible     = TRUE       
			cac_menu.m_reports.enabled     = TRUE       
		CASE "m_administration"
			cac_menu.m_administration.visible         = TRUE           		
			cac_menu.m_administration.enabled         = TRUE           		
	END CHOOSE
LOOP
CLOSE c_menu;

lv_menuname = ''

// Turn visibility on

cac_menu.m_dailyprocessing.m_rundaily.visible = TRUE
cac_menu.m_dailyprocessing.m_createlspupload.visible = TRUE
cac_menu.m_dailyprocessing.m_createglwfile.visible = TRUE
cac_menu.m_dailyprocessing.m_endofdayprocessing.visible = TRUE

cac_menu.m_reports.m_ahciun_mmddorffile.visible = TRUE
cac_menu.m_reports.m_alaitablist.visible = TRUE
cac_menu.m_reports.m_bpirm2xtract.visible = TRUE
cac_menu.m_reports.m_checkdisbxtract.visible = TRUE
cac_menu.m_reports.m_detailederrorlist.visible = TRUE
cac_menu.m_reports.m_agentwtpfsl.visible = TRUE
cac_menu.m_reports.m_priorlsptb.visible = TRUE
cac_menu.m_reports.m_submission2bdo.visible = TRUE
cac_menu.m_reports.m_processstat.visible = TRUE
cac_menu.m_reports.m_foexcesscash.visible = TRUE
cac_menu.m_reports.m_miscreports.visible = TRUE
//cac_menu.m_reports.m_taxesextract.visible = TRUE

cac_menu.m_administration.m_referencefilemaint.visible = TRUE
cac_menu.m_administration.m_usermaintenance.visible = TRUE
cac_menu.m_administration.m_audittrail.visible = TRUE
cac_menu.m_administration.m_resubmitfile.visible = TRUE
cac_menu.m_administration.m_fcsrefreshreffiles.visible = TRUE

// Preparatory Disable

cac_menu.m_dailyprocessing.m_rundaily.enabled = FALSE
cac_menu.m_dailyprocessing.m_createlspupload.enabled = FALSE
cac_menu.m_dailyprocessing.m_createglwfile.enabled = FALSE
cac_menu.m_dailyprocessing.m_endofdayprocessing.enabled = FALSE

cac_menu.m_reports.m_ahciun_mmddorffile.enabled = FALSE
cac_menu.m_reports.m_alaitablist.enabled = FALSE
cac_menu.m_reports.m_bpirm2xtract.enabled = FALSE
cac_menu.m_reports.m_checkdisbxtract.enabled = FALSE
cac_menu.m_reports.m_detailederrorlist.enabled = FALSE
cac_menu.m_reports.m_agentwtpfsl.enabled = FALSE
cac_menu.m_reports.m_priorlsptb.enabled = FALSE
cac_menu.m_reports.m_submission2bdo.enabled = FALSE
cac_menu.m_reports.m_processstat.enabled = FALSE
cac_menu.m_reports.m_foexcesscash.enabled = FALSE
cac_menu.m_reports.m_miscreports.enabled = FALSE
//cac_menu.m_reports.m_taxesextract.enabled = FALSE

cac_menu.m_administration.m_referencefilemaint.enabled = FALSE
cac_menu.m_administration.m_usermaintenance.enabled = FALSE
cac_menu.m_administration.m_audittrail.enabled = FALSE
cac_menu.m_administration.m_resubmitfile.enabled = FALSE
cac_menu.m_administration.m_fcsrefreshreffiles.enabled = FALSE

OPEN c_menu1;
DO WHILE SQLCA.SQLCODE = 0 
	FETCH c_menu1 INTO :lv_menuname1;
	IF SQLCA.SQLCODE <> 0 THEN
		EXIT 
	END IF
	
	CHOOSE CASE TRIM(lv_menuname1)
		CASE "m_rundaily"
			cac_menu.m_dailyprocessing.m_rundaily.enabled = TRUE
		CASE "m_createlspupload"
			cac_menu.m_dailyprocessing.m_createlspupload.enabled = TRUE
		CASE "m_createglwfile"
			cac_menu.m_dailyprocessing.m_createglwfile.enabled = TRUE
		CASE "m_endofdayprocessing"
			cac_menu.m_dailyprocessing.m_endofdayprocessing.enabled = TRUE
		CASE "m_ahciun_mmddorffile"
			cac_menu.m_reports.m_ahciun_mmddorffile.enabled = TRUE
		CASE "m_alaitablist"
			cac_menu.m_reports.m_alaitablist.enabled = TRUE
		CASE "m_bpirm2xtract"
			cac_menu.m_reports.m_bpirm2xtract.enabled = TRUE
		CASE "m_checkdisbxtract"
			cac_menu.m_reports.m_checkdisbxtract.enabled = TRUE
		CASE "m_detailederrorlist"
			cac_menu.m_reports.m_detailederrorlist.enabled = TRUE
		CASE "m_agentwtpfsl"
			cac_menu.m_reports.m_agentwtpfsl.enabled = TRUE
		CASE "m_priorlsptb"
			cac_menu.m_reports.m_priorlsptb.enabled = TRUE
		CASE "m_submission2bdo"
			cac_menu.m_reports.m_submission2bdo.enabled = TRUE
		CASE "m_processstat"
			cac_menu.m_reports.m_processstat.enabled = TRUE
		CASE "m_foexcesscash"
			cac_menu.m_reports.m_foexcesscash.enabled = TRUE
		CASE "m_miscreports"
			cac_menu.m_reports.m_miscreports.enabled = TRUE
//		CASE "m_taxesextract"
//			cac_menu.m_reports.m_taxesextract.enabled = TRUE			
		CASE "m_referencefilemaint"
			cac_menu.m_administration.m_referencefilemaint.enabled = TRUE
		CASE "m_usermaintenance"
			cac_menu.m_administration.m_usermaintenance.enabled = TRUE
		CASE "m_audittrail"
			cac_menu.m_administration.m_audittrail.enabled = TRUE
		CASE "m_resubmitfile"
			cac_menu.m_administration.m_resubmitfile.enabled = TRUE
		CASE "m_fcsrefreshreffiles"
			cac_menu.m_administration.m_fcsrefreshreffiles.enabled = TRUE
	END CHOOSE
LOOP
CLOSE c_menu1;
end subroutine

public function boolean wf_administrator ();STRING lv_menuname,lv_menuname1
LONG   ll_count 


SELECT count("SYRUSRFUNC"."FUNCNAME")
INTO :ll_count 
FROM "SYRUSRFUNC"  
WHERE ( TRIM("SYRUSRFUNC"."USERID") =   :gs_userid  ) AND  
      (( TRIM("SYRUSRFUNC"."FUNCNAME")= 'm_usermaintenance') OR
		 ( TRIM("SYRUSRFUNC"."FUNCNAME")= 'm_audittrail'));
		 
IF ISNULL(ll_count) THEN
	ll_count = 0 
END IF

IF ll_count > 0 THEN
	cac_menu.m_dailyprocessing.visible = FALSE
	cac_menu.m_reports.visible = FALSE

	cac_menu.m_administration.visible = TRUE
	cac_menu.m_administration.m_usermaintenance.visible = TRUE
	cac_menu.m_administration.m_referencefilemaint.visible = TRUE
	cac_menu.m_administration.m_audittrail.visible = TRUE

	cac_menu.m_dailyprocessing.enabled = FALSE
	cac_menu.m_reports.enabled = FALSE

	cac_menu.m_administration.enabled = TRUE
	cac_menu.m_administration.m_usermaintenance.enabled = TRUE
	cac_menu.m_administration.m_referencefilemaint.enabled = TRUE
	cac_menu.m_administration.m_audittrail.enabled = TRUE

	RETURN TRUE
END IF

RETURN FALSE


end function

on w_cac_frame.create
if this.MenuName = "cac_menu" then this.MenuID = create cac_menu
this.mdi_1=create mdi_1
this.n_cac_connectservice=create n_cac_connectservice
this.Control[]={this.mdi_1}
end on

on w_cac_frame.destroy
if IsValid(MenuID) then destroy(MenuID)
destroy(this.mdi_1)
destroy(this.n_cac_connectservice)
end on

event resize;LONG ll_width, ll_height 

ll_width  = w_cac_frame.workspacewidth()
ll_height = w_cac_frame.workspaceheight()

if Isvalid(w_cac_logo) then
	w_cac_logo.Width = ll_width
	w_cac_logo.Height = ll_height
	ll_height = ll_height - 30
	w_cac_logo.p_1.Width = ll_width
	w_cac_logo.p_1.Height = ll_height
end if


end event

event open;wf_disablemenu()

IF wf_administrator() = FALSE  THEN
  wf_enablemenurights()
END IF

this.PostEvent('ue_open')
end event

event closequery;INTEGER li_ret
DATE    ldte_today
TIME    lt_time  

ldte_today = TODAY()
lt_time    = NOW()

li_ret = MessageBox("CAC Enterprise",'End current session of ' + gs_userid + "?",Question!,YesNo!,2)

IF li_ret = 1 THEN
	UPDATE "LOGHISTORY"  SET "LOGOUTDATE" = :ldte_today,"LOGOUTTIME" = :lt_time  
   WHERE ( "LOGHISTORY"."SESSIONID" = :gs_sessionid ) AND  
			( "LOGHISTORY"."USERID" = :gs_userid );
			
   RETURN 0
ELSE
	RETURN 1
END IF
end event

type mdi_1 from mdiclient within w_cac_frame
long BackColor=276856960
end type

type n_cac_connectservice from oleobject within w_cac_frame descriptor "pb_nvo" = "true" 
end type

on n_cac_connectservice.create
call super::create
TriggerEvent( this, "constructor" )
end on

on n_cac_connectservice.destroy
TriggerEvent( this, "destructor" )
call super::destroy
end on

