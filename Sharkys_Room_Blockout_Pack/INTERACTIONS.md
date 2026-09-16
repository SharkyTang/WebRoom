# Sharky's Room — V1 Interaction Specification

V1 锁定 9 个主要交互对象。所有核心功能必须支持 click/tap，hover 只能作为增强。

| ID | Target | Primary Action | Content / Effect | Blender Requirement |
|---|---|---|---|---|
| INT-01 | Monitor | 镜头聚焦 + 屏幕激活 | Projects | Body/Screen 分离 |
| INT-02 | MacBook | 屏幕打开 + 镜头聚焦 | Education / About | Base/hinged Screen 分离 |
| INT-03 | iPad | 屏幕点亮 + 镜头聚焦 | Memories | 独立对象 |
| INT-04 | Marshall | Power/Music toggle | Music Player | 独立对象 |
| INT-05 | Piano | 桌下抽出/收回 | Piano Mode | Rail parent + Piano child |
| INT-06 | Trash Can | Lid 打开 | Easter Egg / Deleted Ideas | Body/Lid 分离 |
| INT-07 | Light Switch | Toggle | 室内灯组开关 | 独立 switch + pivot |
| INT-08 | Phone | 屏幕点亮 + 镜头聚焦 | Contact / Social | 独立对象 |
| INT-09 | Window | 打开 Environment UI | Time + Weather | Frame/Glass 分离 |

## Shared interaction
`idle -> hovering -> focused -> interacting -> returning -> idle`

建议：
`activeObject = null | monitor | macbook | ipad | marshall | piano | trashcan | lightswitch | phone | window`

Desktop hover：轻微 outline/highlight + pointer + label。
Mobile：不能依赖 hover。
ESC/Back：返回 CAM_Hero。

## Window global state
Time：连续 00:00–24:00

Weather：
- Sunny
- Cloudy
- Overcast
- Rainy
- Snowy

未来这些状态驱动 exterior、environment lighting、particles/VFX 和 room exposure。

## Light switch
控制 Cabinet / Desk / Bed / room practical lights。
不必强制关闭 Monitor / MacBook / Phone 等屏幕 emissive，也不关闭 exterior environment。
