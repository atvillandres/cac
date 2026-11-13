forward
global type w_about from window
end type
type st_1 from statictext within w_about
end type
type ddlb_revision from dropdownlistbox within w_about
end type
type cb_close from commandbutton within w_about
end type
end forward

global type w_about from window
integer width = 1979
integer height = 1100
boolean titlebar = true
string title = "Brief Revision History"
boolean resizable = true
long backcolor = 67108864
boolean toolbarvisible = false
boolean clientedge = true
st_1 st_1
ddlb_revision ddlb_revision
cb_close cb_close
end type
global w_about w_about

on w_about.create
this.st_1=create st_1
this.ddlb_revision=create ddlb_revision
this.cb_close=create cb_close
this.Control[]={this.st_1,&
this.ddlb_revision,&
this.cb_close}
end on

on w_about.destroy
destroy(this.st_1)
destroy(this.ddlb_revision)
destroy(this.cb_close)
end on

event rbuttondown;close(w_about)
end event

type st_1 from statictext within w_about
integer x = 631
integer y = 64
integer width = 763
integer height = 68
integer textsize = -12
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = fixed!
fontfamily fontfamily = modern!
string facename = "Courier New"
boolean italic = true
long textcolor = 128
long backcolor = 67108864
string text = "ALAI CAC System"
boolean focusrectangle = false
end type

type ddlb_revision from dropdownlistbox within w_about
integer x = 151
integer y = 192
integer width = 1655
integer height = 532
integer taborder = 10
integer textsize = -8
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = fixed!
fontfamily fontfamily = modern!
string facename = "Courier New"
long textcolor = 33554432
string text = "Brief Revision History:"
boolean allowedit = true
boolean autohscroll = true
boolean sorted = false
boolean showlist = true
boolean hscrollbar = true
boolean vscrollbar = true
string item[] = {"2.11 - 2006/09/05 - Correct screen orientation. Include Send button in various report.","2.10 - 2005/07/11 - Include extraction of disbursement transactions","2.09 - 2005/05/18 - Parameterized accounts to be closed for CAC REV group header.","2.08 - 2005/05/16 - Revise Balancing Process for NOPD & TDHO transactions.","2.07 - 2005/04/14 - Hash totals validation - Increase some variables to double data type.","2.06 - 2005/04/04 - Adjust GLW code (NOP/DST processing) to its proper value.","2.05 - 2005/03/23 - Include processing of GIS hand-off files in GLW Merge module."}
borderstyle borderstyle = stylelowered!
end type

type cb_close from commandbutton within w_about
integer x = 581
integer y = 792
integer width = 686
integer height = 156
integer taborder = 10
integer textsize = -12
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Close"
boolean cancel = true
end type

event clicked;close (parent)
end event

