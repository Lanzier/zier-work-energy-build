!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!ifndef BUILD_UNINSTALLER
!macro customWelcomePage
  Page custom zierWelcomeCreate zierWelcomeLeave
!macroend

Function zierWelcomeCreate
  nsDialogs::Create 1044
  Pop $0
  SetCtlColors $0 0xF7F9FF 0x090C17

  ${NSD_CreateLabel} 20u 15u 255u 12u "ZIER  ·  WORK ENERGY"
  Pop $1
  SetCtlColors $1 0x72F2A6 0x090C17
  CreateFont $2 "Segoe UI" 9 700
  SendMessage $1 ${WM_SETFONT} $2 1

  ${NSD_CreateLabel} 20u 38u 255u 32u "把下班倒计时，变成能量条。"
  Pop $1
  SetCtlColors $1 0xFFFFFF 0x090C17
  CreateFont $2 "Microsoft YaHei UI" 19 700
  SendMessage $1 ${WM_SETFONT} $2 1

  ${NSD_CreateLabel} 20u 80u 255u 25u "城市天气 · 工作电量 · 实时收入 · 社区主题"
  Pop $1
  SetCtlColors $1 0xAEB7D1 0x090C17
  CreateFont $2 "Microsoft YaHei UI" 10 400
  SendMessage $1 ${WM_SETFONT} $2 1

  ${NSD_CreateLabel} 20u 116u 255u 2u ""
  Pop $1
  SetCtlColors $1 0x72F2A6 0x72F2A6

  ${NSD_CreateLabel} 20u 128u 255u 18u "安装后会创建桌面快捷方式，设置均保存在本机。"
  Pop $1
  SetCtlColors $1 0x8994B3 0x090C17
  CreateFont $2 "Microsoft YaHei UI" 9 400
  SendMessage $1 ${WM_SETFONT} $2 1

  GetDlgItem $1 $HWNDPARENT 1
  SendMessage $1 ${WM_SETTEXT} 0 "STR:开始安装  ›"
  nsDialogs::Show
FunctionEnd

Function zierWelcomeLeave
FunctionEnd
!endif

!macro customHeader
  BrandingText "Zier 工作能量条 · v${VERSION}"
!macroend
