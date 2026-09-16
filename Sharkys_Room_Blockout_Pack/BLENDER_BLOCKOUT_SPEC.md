# Blender Blockout Specification — Sharky's Room v0.1

## 1. Purpose
把参考图转成低复杂度空间原型。Blockout 用于验证比例、镜头、交互对象分离、导出结构和网页性能，而不是做最终模型。

## 2. Scene conventions
- Metric；1 Blender Unit = 1 m
- Z 向上
- 使用 Cube / Plane / Cylinder 等 primitives
- 需要动画/点击的对象不得合并
- 为未来动画设置合理 Origin / Pivot
- Collection：ENVIRONMENT / FURNITURE / TECH / INTERACTIVE / DISPLAY_MODELS / DECORATIONS / LIGHTING / CAMERAS_TARGETS

## 3. 初始房间尺度
仅作为第一轮起点，最终以参考图构图为准：
- Width X ≈ 7.2 m
- Depth Y ≈ 5.8 m
- Height Z ≈ 3.0 m
- Floor thickness ≈ 0.12 m
- Hero Camera 前方两侧保持 cutaway/open

## 4. 主要区域

### Display wall
- 左/后侧大型模型展示柜
- 初始约 3.0 m W × 0.45–0.55 m D × 2.6 m H
- Blockout 只做框架和宽层板
- 为大型 Eiffel Tower / Millennium Falcon 等保留空间，避免未来穿模

### Workstation
- Desk ≈ 2.4–2.8 m W × 0.75–0.85 m D × 0.74 m H
- 独立占位：Monitor / MacBook / Phone / Marshall / Keyboard / Mouse / Headphones
- 桌下必须给抽拉电钢琴留出完整运动空间

### Pull-out Piano
- ≈ 1.25–1.4 m W × 0.30–0.38 m D
- `INT_Piano` parent 到 `INT_PianoRail`
- 预留约 0.55–0.70 m 水平抽拉行程
- 收起与抽出状态均不得穿模

### Window
- 书桌后方大面积窗户
- Frame / Glass 独立
- 外部先放简单背景 Plane
- Window 是独立 interactive target

### Bed
- 右侧 double bed ≈ 1.6 × 2.0 m
- 保持床与书桌之间合理通道

### Sofa
- 左前区域 ≈ 1.8–2.0 m W
- 按参考图形成斜向构图

### Coffee table
- 中前区域，约 1.1 × 0.65 m
- 顶部独立 `TEC_iPad`

### Beanbag
- 右前区域简单 proxy

### Door + Light Switch
- 左侧门
- `INT_LightSwitch` 放在合理手高约 1.1–1.3 m
- switch pivot 能支持轻微 toggle

### Trash Can
- 参考图中工作区/床之间的位置
- `INT_TrashCanBody` 与 `INT_TrashCanLid` 分离
- Lid pivot 能支持打开

## 5. Required interactive nodes
必须在 .blend 和导出 GLB 中保持独立命名：
- TEC_MonitorBody
- TEC_MonitorScreen
- TEC_MacBookBase
- TEC_MacBookScreen
- TEC_iPad
- TEC_Marshall
- TEC_Phone
- INT_PianoRail
- INT_Piano
- INT_TrashCanBody
- INT_TrashCanLid
- INT_LightSwitch
- ENV_WindowFrame
- ENV_WindowGlass

## 6. Secondary blockout proxies
Bed / Sofa / OfficeChair / CoffeeTable / DisplayCabinet / Beanbag / Bedside furniture /
Keyboard / Mouse / Headphones / representative Plants / Rugs / Curtains / Lamps /
Dog/DogBed proxy / Display-model bounding boxes.

## 7. Camera
创建 `CAM_Hero`，目标是尽量复现参考图的 elevated three-quarter / isometric-like 构图。
- 优先 Perspective
- 起始 focal length 可试 35–50 mm
- 展示柜、书桌、床、沙发、茶几必须同时清晰可见

创建未来镜头 target empties：
TGT_Monitor / TGT_MacBook / TGT_iPad / TGT_Marshall / TGT_Piano /
TGT_TrashCan / TGT_LightSwitch / TGT_Phone / TGT_Window

本阶段不要做最终 camera animation。

## 8. Lighting
只做轻量 blockout lighting：
- LGT_Ambient
- LGT_WindowKey
- LGT_CabinetProxy
- LGT_DeskProxy
- LGT_BedProxy

各组保持独立，未来实体开关将控制室内灯组。不要 bake。

## 9. Materials
只使用少量 greybox materials：
- room shell
- furniture proxy
- dark technology proxy
- glass proxy
- optional emissive screen proxy

不要做最终 PBR。

## 10. Animation-sensitive parenting
- MacBook screen：hinge pivot
- Trash lid：opening pivot
- Piano：rail parent + translation
- Light switch：toggle pivot
- Monitor screen：独立可寻址

## 11. Performance
- primitives 优先
- 不做高模
- 不做高分辨率纹理
- Blockout GLB 目标 < 5 MB，越小越好

## 12. Export
导出 `.glb`：
- 保留 object/node names
- 保留 hierarchy
- 不合并 interactive nodes
- 导出后重新检查 required names

## 13. Acceptance Criteria
完成 v0.1 必须满足：
- Hero Camera 明显接近参考图
- 大型家具无严重穿模
- 九类核心交互均有独立 target/node
- Piano 可手动在收起/抽出间移动
- MacBook screen 可沿 hinge 旋转
- Trash lid 可打开
- Light switch 可 toggle
- Window 独立 selectable
- GLB 正常导出且命名/层级保留
- 几何足够轻量

## 14. Stop condition
在 Hero Camera 与主要空间关系得到确认前，不要开始正式精模替换。
