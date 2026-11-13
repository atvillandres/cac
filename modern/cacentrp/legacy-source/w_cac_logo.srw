forward
global type w_cac_logo from window
end type
type p_1 from picture within w_cac_logo
end type
end forward

global type w_cac_logo from window
integer width = 1961
integer height = 1140
boolean enabled = false
windowtype windowtype = popup!
long backcolor = 67108864
string icon = "C:\CAC Entrp\icons\cac.ico"
p_1 p_1
end type
global w_cac_logo w_cac_logo

on w_cac_logo.create
this.p_1=create p_1
this.Control[]={this.p_1}
end on

on w_cac_logo.destroy
destroy(this.p_1)
end on

event open;LONG ll_width, ll_height 

ll_width  = w_cac_frame.workspacewidth()
ll_height = w_cac_frame.workspaceheight()

w_cac_logo.Width = ll_width
w_cac_logo.Height = ll_height
ll_height = ll_height - 30
p_1.Width = ll_width
p_1.Height = ll_height


end event

type p_1 from picture within w_cac_logo
integer width = 1943
integer height = 1136
boolean enabled = false
string picturename = "\CAC Entrp\icons&bmps\cac_frame.bmp"
boolean focusrectangle = false
end type

