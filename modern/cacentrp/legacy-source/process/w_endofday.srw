forward
global type w_endofday from window
end type
type st_percent from statictext within w_endofday
end type
type hpb_records from hprogressbar within w_endofday
end type
type cb_close from commandbutton within w_endofday
end type
type cb_start from commandbutton within w_endofday
end type
end forward

global type w_endofday from window
integer width = 1979
integer height = 1100
boolean titlebar = true
string title = "End of Day Process"
boolean controlmenu = true
boolean minbox = true
boolean maxbox = true
boolean resizable = true
long backcolor = 67108864
st_percent st_percent
hpb_records hpb_records
cb_close cb_close
cb_start cb_start
end type
global w_endofday w_endofday

on w_endofday.create
this.st_percent=create st_percent
this.hpb_records=create hpb_records
this.cb_close=create cb_close
this.cb_start=create cb_start
this.Control[]={this.st_percent,&
this.hpb_records,&
this.cb_close,&
this.cb_start}
end on

on w_endofday.destroy
destroy(this.st_percent)
destroy(this.hpb_records)
destroy(this.cb_close)
destroy(this.cb_start)
end on

type st_percent from statictext within w_endofday
integer x = 859
integer y = 472
integer width = 174
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 16711680
long backcolor = 67108864
string text = "0 %"
boolean focusrectangle = false
end type

type hpb_records from hprogressbar within w_endofday
integer x = 265
integer y = 376
integer width = 1358
integer height = 64
unsignedinteger maxposition = 100
integer setstep = 1
boolean smoothscroll = true
end type

type cb_close from commandbutton within w_endofday
integer x = 1015
integer y = 752
integer width = 402
integer height = 112
integer taborder = 20
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Close"
end type

event clicked;close (parent)
end event

type cb_start from commandbutton within w_endofday
integer x = 425
integer y = 748
integer width = 402
integer height = 112
integer taborder = 10
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Start"
end type

event clicked;LONG ll_current, ll_totalrec

SELECT COUNT( * )  
   INTO :ll_totalrec
   FROM "CURRLEDGE"  ;
	
IF SQLCA.SQLCode < 0 THEN
	MessageBox( "Select Error: CURRLEDGE", SQLCA.SQLErrText, StopSign! )
	cb_close.TriggerEvent( Clicked! )
	RETURN
END IF

IF ll_totalrec <= 0 THEN
	MessageBox( "Note", "No transactions to process" )
	cb_close.TriggerEvent( Clicked! )
	RETURN
END IF

IF MessageBox ( "Please confirm", "Have you run the GL Walker Interface already?", Question!, YesNoCancel!, 2 ) <> 1 THEN
	MessageBox( 'Note', "Please run it first before proceeding!", Information! )
	cb_close.TriggerEvent( Clicked! )
	RETURN
END IF

IF MessageBox ( "Please confirm", "Transactions for the day will be archived.~n~rDo you want to continue?", Question!, YesNoCancel!, 2 ) = 1 THEN
	FOR ll_current = 1 TO ll_totalrec
		hpb_records.Position = INT( ll_current / ll_totalrec * hpb_records.MaxPosition )
		st_percent.text = STRING(hpb_records.Position) + " %"
	NEXT
   
	INSERT INTO "CURRLEDGEX"  
	   SELECT * FROM "CURRLEDGE"  ;
		  
	IF SQLCA.SQLCode < 0 THEN
		MessageBox( "Insert Error: CURRLEDGEX", SQLCA.SQLErrText, StopSign! )
		ROLLBACK ;
		cb_close.TriggerEvent( Clicked! )
		RETURN
	END IF
		  
	DELETE FROM "CURRLEDGE" ;
	
	IF SQLCA.SQLCode < 0 THEN
		MessageBox( "Delete Error: CURRLEDGEX", SQLCA.SQLErrText, StopSign! )
		ROLLBACK ;
		cb_close.TriggerEvent( Clicked! )
		RETURN
	END IF

	COMMIT ;
ELSE
	cb_close.TriggerEvent( Clicked! )
END IF
end event
