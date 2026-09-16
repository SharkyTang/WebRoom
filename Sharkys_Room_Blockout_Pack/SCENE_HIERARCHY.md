# Recommended Blender Scene Hierarchy

```text
SharkysRoom
├── ENVIRONMENT
│   ├── ENV_RoomShell
│   ├── ENV_Floor
│   ├── ENV_Wall_Left
│   ├── ENV_Wall_Right
│   ├── ENV_WindowFrame
│   ├── ENV_WindowGlass
│   ├── ENV_Curtain_Left
│   ├── ENV_Curtain_Right
│   └── ENV_CityBackground
├── FURNITURE
│   ├── FUR_Desk
│   ├── FUR_OfficeChair
│   ├── FUR_Bed
│   ├── FUR_BedsideTable
│   ├── FUR_Sofa
│   ├── FUR_CoffeeTable
│   ├── FUR_DisplayCabinet
│   └── FUR_BeanBag
├── TECH
│   ├── TEC_MonitorBody
│   ├── TEC_MonitorScreen
│   ├── TEC_MacBookBase
│   ├── TEC_MacBookScreen
│   ├── TEC_Phone
│   ├── TEC_Marshall
│   ├── TEC_Keyboard
│   ├── TEC_Mouse
│   ├── TEC_Headphones
│   └── TEC_iPad
├── INTERACTIVE
│   ├── INT_PianoRail
│   │   └── INT_Piano
│   ├── INT_TrashCanBody
│   ├── INT_TrashCanLid
│   └── INT_LightSwitch
├── DISPLAY_MODELS
│   └── bounding-box proxies only
├── DECORATIONS
│   └── minimal proxies
├── LIGHTING
│   ├── LGT_Ambient
│   ├── LGT_WindowKey
│   ├── LGT_CabinetProxy
│   ├── LGT_DeskProxy
│   └── LGT_BedProxy
└── CAMERAS_TARGETS
    ├── CAM_Hero
    ├── TGT_Monitor
    ├── TGT_MacBook
    ├── TGT_iPad
    ├── TGT_Marshall
    ├── TGT_Piano
    ├── TGT_TrashCan
    ├── TGT_LightSwitch
    ├── TGT_Phone
    └── TGT_Window
```

禁止在 export 前把未来可交互节点 join/merge。
