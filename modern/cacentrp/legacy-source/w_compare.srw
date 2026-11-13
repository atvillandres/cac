forward
global type w_compare from window
end type
type mle_compare1 from multilineedit within w_compare
end type
type cb_save2 from commandbutton within w_compare
end type
type cb_save1 from commandbutton within w_compare
end type
type cbx_tab from checkbox within w_compare
end type
type cbx_enter from checkbox within w_compare
end type
type cbx_space from checkbox within w_compare
end type
type st_percent from statictext within w_compare
end type
type cb_no from commandbutton within w_compare
end type
type st_continue from statictext within w_compare
end type
type cb_yes from commandbutton within w_compare
end type
type hpb_progress from hprogressbar within w_compare
end type
type st_characters2 from statictext within w_compare
end type
type st_characters1 from statictext within w_compare
end type
type cb_import2 from commandbutton within w_compare
end type
type cb_import1 from commandbutton within w_compare
end type
type cb_compare from commandbutton within w_compare
end type
type mle_compare2 from multilineedit within w_compare
end type
type gb_specialchar from groupbox within w_compare
end type
end forward

global type w_compare from window
integer width = 3643
integer height = 2380
boolean titlebar = true
string title = "String Comparison"
boolean controlmenu = true
boolean minbox = true
boolean maxbox = true
boolean resizable = true
long backcolor = 67108864
mle_compare1 mle_compare1
cb_save2 cb_save2
cb_save1 cb_save1
cbx_tab cbx_tab
cbx_enter cbx_enter
cbx_space cbx_space
st_percent st_percent
cb_no cb_no
st_continue st_continue
cb_yes cb_yes
hpb_progress hpb_progress
st_characters2 st_characters2
st_characters1 st_characters1
cb_import2 cb_import2
cb_import1 cb_import1
cb_compare cb_compare
mle_compare2 mle_compare2
gb_specialchar gb_specialchar
end type
global w_compare w_compare

type variables
BOOLEAN ib_continue, ib_clicked


end variables

on w_compare.create
this.mle_compare1=create mle_compare1
this.cb_save2=create cb_save2
this.cb_save1=create cb_save1
this.cbx_tab=create cbx_tab
this.cbx_enter=create cbx_enter
this.cbx_space=create cbx_space
this.st_percent=create st_percent
this.cb_no=create cb_no
this.st_continue=create st_continue
this.cb_yes=create cb_yes
this.hpb_progress=create hpb_progress
this.st_characters2=create st_characters2
this.st_characters1=create st_characters1
this.cb_import2=create cb_import2
this.cb_import1=create cb_import1
this.cb_compare=create cb_compare
this.mle_compare2=create mle_compare2
this.gb_specialchar=create gb_specialchar
this.Control[]={this.mle_compare1,&
this.cb_save2,&
this.cb_save1,&
this.cbx_tab,&
this.cbx_enter,&
this.cbx_space,&
this.st_percent,&
this.cb_no,&
this.st_continue,&
this.cb_yes,&
this.hpb_progress,&
this.st_characters2,&
this.st_characters1,&
this.cb_import2,&
this.cb_import1,&
this.cb_compare,&
this.mle_compare2,&
this.gb_specialchar}
end on

on w_compare.destroy
destroy(this.mle_compare1)
destroy(this.cb_save2)
destroy(this.cb_save1)
destroy(this.cbx_tab)
destroy(this.cbx_enter)
destroy(this.cbx_space)
destroy(this.st_percent)
destroy(this.cb_no)
destroy(this.st_continue)
destroy(this.cb_yes)
destroy(this.hpb_progress)
destroy(this.st_characters2)
destroy(this.st_characters1)
destroy(this.cb_import2)
destroy(this.cb_import1)
destroy(this.cb_compare)
destroy(this.mle_compare2)
destroy(this.gb_specialchar)
end on

type mle_compare1 from multilineedit within w_compare
integer x = 219
integer y = 140
integer width = 2610
integer height = 596
integer taborder = 20
integer textsize = -10
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 15793151
boolean hscrollbar = true
boolean vscrollbar = true
borderstyle borderstyle = stylelowered!
end type

event modified;st_characters1.Text = 'Number of Characters: ' + string( LEN( This.Text ), '#,##0')
end event

event losefocus;st_characters1.Text = 'Number of Characters: ' + string( LEN( This.Text ), '#,##0')
end event

type cb_save2 from commandbutton within w_compare
integer x = 2962
integer y = 1096
integer width = 402
integer height = 112
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = ">>> Save"
end type

event clicked;STRING ls_text2, ls_filedtl, ls_filename
INTEGER li_retval, li_filenumber, li_written, li_numfilewrite, li_numwrite, li_start
LONG ll_length

ls_text2 = mle_compare2.Text
ll_length = LEN( ls_text2 )
li_numfilewrite = Int( ll_length / 32765 )

IF li_numfilewrite <> 32765 * ll_length THEN li_numfilewrite ++

IF TRIM( ls_text2 ) = '' OR ISNULL( ls_text2 ) THEN
	MessageBox( "Note", "Cannot save empty text(2)" )
	RETURN
END IF

li_retval = GetFileSaveName("Select File", ls_filedtl, ls_filename, "TXT", "Text Files (*.TXT),*.TXT,")

IF li_retval = 1 THEN
	li_filenumber = FileOpen( ls_filedtl, StreamMode!, Write!, LockWrite!, Replace! )

   IF li_filenumber <> -1 AND NOT ISNULL( li_filenumber ) THEN
		FOR li_numwrite = 1 TO li_numfilewrite
			li_start = li_numwrite * 32765 - 32765 + 1
	      li_written = FileWrite( li_filenumber, MID( ls_text2, li_start ) )
		NEXT
	END IF

   FileClose( li_filenumber )
END IF
end event

type cb_save1 from commandbutton within w_compare
integer x = 2967
integer y = 272
integer width = 402
integer height = 112
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = ">>> Save"
end type

event clicked;STRING ls_text1, ls_filedtl, ls_filename
INTEGER li_retval, li_filenumber, li_written, li_numfilewrite, li_numwrite, li_start
LONG ll_length

ls_text1 = mle_compare1.Text
ll_length = LEN( ls_text1 )
li_numfilewrite = Int( ll_length / 32765 )

IF li_numfilewrite <> 32765 * ll_length THEN li_numfilewrite ++

IF TRIM( ls_text1 ) = '' OR ISNULL( ls_text1 ) THEN
	MessageBox( "Note", "Cannot save empty text(1)" )
	RETURN
END IF

li_retval = GetFileSaveName("Select File", ls_filedtl, ls_filename, "TXT", "Text Files (*.TXT),*.TXT,")

IF li_retval = 1 THEN
	li_filenumber = FileOpen( ls_filedtl, StreamMode!, Write!, LockWrite!, Replace! )

   IF li_filenumber <> -1 AND NOT ISNULL( li_filenumber ) THEN
		FOR li_numwrite = 1 TO li_numfilewrite
			li_start = li_numwrite * 32765 - 32765 + 1
	      li_written = FileWrite( li_filenumber, MID( ls_text1, li_start ) )
		NEXT
	END IF

   FileClose( li_filenumber )
END IF
end event

type cbx_tab from checkbox within w_compare
integer x = 274
integer y = 1944
integer width = 224
integer height = 80
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Tab"
borderstyle borderstyle = stylelowered!
end type

type cbx_enter from checkbox within w_compare
integer x = 274
integer y = 2024
integer width = 526
integer height = 80
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Carriage return"
borderstyle borderstyle = stylelowered!
end type

type cbx_space from checkbox within w_compare
integer x = 274
integer y = 1864
integer width = 302
integer height = 80
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Space"
borderstyle borderstyle = stylelowered!
end type

type st_percent from statictext within w_compare
integer x = 1531
integer y = 1696
integer width = 160
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 8388608
long backcolor = 67108864
string text = "00%"
boolean focusrectangle = false
end type

type cb_no from commandbutton within w_compare
boolean visible = false
integer x = 1591
integer y = 1904
integer width = 402
integer height = 112
integer taborder = 70
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&No"
end type

event clicked;ib_continue = FALSE
This.Visible = FALSE
cb_yes.visible = FALSE
st_continue.Visible = FALSE
ib_clicked = TRUE
end event

type st_continue from statictext within w_compare
boolean visible = false
integer x = 658
integer y = 1824
integer width = 1879
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
boolean italic = true
long textcolor = 255
long backcolor = 67108864
string text = "Highlighted value of Text1 is not equal to that of Text2. Continue?"
boolean focusrectangle = false
end type

type cb_yes from commandbutton within w_compare
boolean visible = false
integer x = 1166
integer y = 1904
integer width = 402
integer height = 112
integer taborder = 50
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Yes"
end type

event clicked;ib_continue = TRUE
This.Visible = FALSE
cb_no.visible = FALSE
st_continue.Visible = FALSE
ib_clicked = TRUE

end event

type hpb_progress from hprogressbar within w_compare
integer x = 219
integer y = 1604
integer width = 2610
integer height = 64
unsignedinteger maxposition = 100
integer setstep = 10
boolean smoothscroll = true
end type

type st_characters2 from statictext within w_compare
integer x = 219
integer y = 868
integer width = 1202
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 128
long backcolor = 67108864
string text = "Number of Characters: 0"
boolean focusrectangle = false
end type

type st_characters1 from statictext within w_compare
integer x = 219
integer y = 56
integer width = 1202
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 128
long backcolor = 67108864
string text = "Number of Characters: 0"
boolean focusrectangle = false
end type

type cb_import2 from commandbutton within w_compare
integer x = 2962
integer y = 960
integer width = 402
integer height = 112
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "<<< Import"
end type

event clicked;Integer li_FileNum, li_retval
String ls_fileread, ls_filedtl, ls_filename

li_retval = GetFileOpenName("Select File", ls_filedtl, ls_filename, "TXT", "Text Files (*.TXT),*.TXT,")

IF li_retval <> 1 THEN RETURN

li_FileNum = FileOpen( ls_filedtl , Streammode!, Read!, LockRead! )

mle_compare2.Text = ''
	
DO WHILE FileRead( li_FileNum, ls_fileread ) > 0
	mle_compare2.Text += ls_fileread
LOOP

FileClose( li_FileNum )

st_characters2.Text = 'Number of Characters: ' + string( LEN( mle_compare2.Text ), '#,##0')
end event

type cb_import1 from commandbutton within w_compare
integer x = 2967
integer y = 140
integer width = 402
integer height = 112
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "<<< Import"
end type

event clicked;Integer li_FileNum, li_retval
String ls_fileread, ls_filedtl, ls_filename, ls_contents

li_retval = GetFileOpenName("Select File", ls_filedtl, ls_filename, "TXT", "Text Files (*.TXT),*.TXT,")

IF li_retval <> 1 THEN RETURN

li_FileNum = FileOpen( ls_filedtl , Streammode!, Read!, LockRead! )

mle_compare1.Text = ''
	
DO WHILE FileRead( li_FileNum, ls_fileread ) > 0
	mle_compare1.Text += ls_fileread
	ls_contents += ls_fileread
LOOP

mle_compare1.Text = ls_contents

FileClose( li_FileNum )

st_characters1.Text = 'Number of Characters: ' + string( LEN( mle_compare1.Text ), '#,##0')

end event
type cb_compare from commandbutton within w_compare
integer x = 1435
integer y = 1812
integer width = 402
integer height = 112
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Compare"
end type

event clicked;STRING ls_text1, ls_text2
TIME lt_before, lt_after
BOOLEAN lb_complete
LONG ll_currentpos, ll_text2pos, ll_savetext2pos, ll_origstop2, ll_origstop1, ll_remaining
LONG ll_text2next, ll_text1next

POINTER lp_oldpointer

ls_text1 = mle_compare1.Text
ls_text2 = mle_compare2.Text
mle_compare1.SelectText ( 0, 0 )		
mle_compare2.SelectText (0, 0 )

IF ISNULL( ls_text1 ) OR ls_text1 = '' THEN
	MessageBox( 'Error', 'Text1 value cannot be blank', StopSign! )
	Return
END IF

IF ISNULL( ls_text2 ) OR ls_text2 = '' THEN
	MessageBox( 'Error', 'Text2 value cannot be blank', StopSign! )
	Return
END IF

mle_compare1.SetFocus()
lb_complete = TRUE
hpb_progress.Position = 0

cb_import1.Enabled = FALSE
cb_import2.Enabled = FALSE
This.Enabled = FALSE
st_percent.Text = '0%'

ll_savetext2pos = 1

lp_oldpointer = SetPointer(HourGlass!)

FOR ll_currentpos = 1 TO LEN( ls_text1 )
	hpb_progress.Position = ( ll_currentpos / LEN( ls_text1 ) ) * 100
	st_percent.Text = string( hpb_progress.Position ) + '%'

	IF Mid ( ls_text1, ll_currentpos , 1 ) = ' ' AND cbx_space.Checked THEN CONTINUE
	IF ASC( Mid ( ls_text1, ll_currentpos , 1 ) ) = 9 AND cbx_tab.Checked THEN CONTINUE
	IF ASC( Mid ( ls_text1, ll_currentpos , 1 ) ) = 13 AND cbx_enter.Checked THEN
		ll_currentpos ++
		CONTINUE
	END IF
	
	FOR ll_text2pos = ll_savetext2pos TO LEN( ls_text2 )
		IF Mid ( ls_text2, ll_text2pos , 1 ) = ' ' AND cbx_space.Checked THEN
			CONTINUE
		ELSEIF ASC( Mid ( ls_text2, ll_text2pos , 1 ) ) = 9 AND cbx_tab.Checked THEN
			CONTINUE
		ELSEIF ASC( Mid ( ls_text2, ll_text2pos , 1 ) ) = 13 AND cbx_enter.Checked THEN
			ll_text2pos ++
			CONTINUE
		ELSE
			EXIT
		END IF
	NEXT
	
	ll_savetext2pos = ll_text2pos + 1

	IF ll_text2pos > LEN( ls_text2 ) THEN
		ll_remaining = LEN( ls_text1 ) - ll_currentpos + 1

		MessageBox( 'Note', 'Highlighted values of Text1 have no counterpart in Text2' )
		mle_compare1.SelectText ( ll_currentpos, ll_remaining )
		lb_complete = FALSE
		EXIT
	END IF
	
	IF Mid ( ls_text1, ll_currentpos , 1 ) <> Mid ( ls_text2, ll_text2pos , 1 ) THEN
		mle_compare1.SelectText ( ll_currentpos, 1 )		
		mle_compare2.SelectText (ll_text2pos , 1 )
		
      ib_continue = TRUE
		ib_clicked = FALSE

		This.Visible = FALSE
		gb_specialchar.Visible = FALSE
		cbx_space.Visible = FALSE
		cbx_tab.Visible = FALSE
		cbx_enter.Visible = FALSE
		
		SetPointer( lp_oldpointer )
		
		DO WHILE NOT ib_clicked
			yield()
			cb_yes.Visible = TRUE
			cb_no.Visible = TRUE
			st_continue.Visible = TRUE
			
			lt_before = NOW()
			lt_after = NOW()
			
			DO UNTIL SecondsAfter ( lt_before, lt_after ) > 1
				yield()				
				lt_after = NOW()
			LOOP
			
			IF st_continue.TextColor = RGB(0,0,255) THEN
				st_continue.TextColor = RGB(255, 0, 0)
			ELSE
				st_continue.TextColor = RGB(0,0,255)
			END IF
		LOOP

		lp_oldpointer = SetPointer(HourGlass!)
	   This.Visible = TRUE
		gb_specialchar.Visible = TRUE
		cbx_space.Visible = TRUE
		cbx_tab.Visible = TRUE
		cbx_enter.Visible = TRUE
		
		cb_yes.Visible = FALSE
		cb_no.visible = FALSE
		st_continue.Visible = FALSE
		
		IF NOT ib_continue THEN
		   lb_complete = FALSE
			EXIT
		END IF
		
		mle_compare1.SetFocus()
		ll_origstop1 = ll_currentpos
		ll_origstop2 = ll_text2pos
		
		IF ll_text2pos + 1 < LEN( ls_text2 ) THEN
			ll_text2next = ll_text2pos + 1
			
			FOR ll_text2pos = ll_text2next TO LEN( ls_text2 )
				IF Mid ( ls_text2, ll_text2pos , 1 ) = ' ' AND cbx_space.Checked THEN
					CONTINUE
				ELSEIF ASC( Mid ( ls_text2, ll_text2pos , 1 ) ) = 9 AND cbx_tab.Checked THEN
					CONTINUE
				ELSEIF ASC( Mid ( ls_text2, ll_text2pos , 1 ) ) = 13 AND cbx_enter.Checked THEN
					ll_text2pos ++
					CONTINUE
				ELSE
					EXIT
				END IF
			NEXT
			
//			ll_text2pos ++
			ll_text2pos = ll_text2next
			
			IF ll_text2pos > LEN( ls_text2 ) THEN
				ll_remaining = LEN( ls_text1 ) - ll_currentpos + 1
		
				MessageBox( 'Note', 'Highlighted values of Text1 have no counterpart in Text2' )
				mle_compare1.SelectText ( ll_currentpos, ll_remaining )
				lb_complete = FALSE
				EXIT
			END IF
			
			IF Mid ( ls_text1, ll_currentpos , 1 ) = Mid ( ls_text2, ll_text2pos , 1 ) THEN
				ll_savetext2pos = ll_text2pos + 1
				CONTINUE
			ELSE
//				ll_text2pos --
				ll_text2pos = ll_origstop2
				
				IF ll_currentpos + 1 < LEN( ls_text1 ) THEN
					ll_currentpos ++
					IF Mid ( ls_text1, ll_currentpos , 1 ) = Mid ( ls_text2, ll_text2pos , 1 ) THEN
						ll_savetext2pos = ll_text2pos + 1
						CONTINUE
					ELSE
						ll_currentpos --
					END IF
				END IF
			END IF
		END IF
	END IF
NEXT

SetPointer( lp_oldpointer )

IF lb_complete AND ll_currentpos > LEN( ls_text1 ) AND LEN( ls_text2 ) > ll_text2pos THEN
	ll_remaining = LEN( ls_text2 ) - ll_text2pos

	MessageBox( 'Note', 'Highlighted values of Text2 have no counterpart in Text1' )
	mle_compare2.SelectText ( ll_text2pos + 1, ll_remaining )
	mle_compare2.SetFocus()
ELSEIF lb_complete THEN
	MessageBox( 'Note', 'Text1 & Text2 comparison is finished' )
	mle_compare1.SetFocus()
END IF

cb_import1.Enabled = TRUE
cb_import2.Enabled = TRUE
This.Enabled = TRUE
end event

type mle_compare2 from multilineedit within w_compare
integer x = 219
integer y = 960
integer width = 2610
integer height = 596
integer taborder = 20
integer textsize = -10
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 15793151
boolean hscrollbar = true
boolean vscrollbar = true
borderstyle borderstyle = stylelowered!
end type

event modified;st_characters2.Text = 'Number of Characters: ' + string( LEN( This.Text ), '#,##0')
end event

event losefocus;st_characters2.Text = 'Number of Characters: ' + string( LEN( This.Text ), '#,##0')
end event

type gb_specialchar from groupbox within w_compare
integer x = 233
integer y = 1776
integer width = 933
integer height = 360
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Exclude Special Character"
borderstyle borderstyle = stylelowered!
end type

