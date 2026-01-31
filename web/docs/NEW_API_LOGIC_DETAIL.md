# new-api 逻辑详情

## 1. 定价数据流（/api/pricing）

### 1.1 入口与缓存

- **接口**：`GET /api/pricing`
- **Controller**：`controller.GetPricing` → `model.GetPricing()`
- **缓存**：`pricingMap` 内存缓存，超过 1 分钟或为空时调用 `updatePricing()` 刷新。

### 1.2 updatePricing() 核心步骤

1. **能力与模型元数据**
   - `GetAllEnableAbilityWithChannels()` 得到「有通道的模型」列表。
   - 从 `models` 表加载元数据（描述、图标、标签、供应商、端点等），按精确/前缀/后缀/包含规则匹配到每个 `pricingModel.Model`。

2. **供应商**
   - 从 `vendors` 表加载，经 `initDefaultVendorMapping` 与模型关联，得到 `pricing.VendorID` 和 `vendorsList`。

3. **倍率与价格（决定 quota_type 与展示用数字）**
   - 对每个模型：
     - 若 `ratio_setting.GetModelPrice(model)` 有值：`QuotaType=1`（按次），用 `ModelPrice`。
     - 否则：`QuotaType=0`（按量），`ModelRatio = ratio_setting.GetModelRatio(model)`，`CompletionRatio = ratio_setting.GetCompletionRatio(model)`。
   - **注意**：此处 `model_ratio` 只来自 `ratio_setting.modelRatioMap`，与 Option 中的「模型倍率」通过管理端重置时同步，无单独覆盖逻辑。

4. **上架与官方价、类型/标签**
   - `GetAllModelListingWithOfficialPrices()` 从表 `model_listings` 一次拉取：
     - `is_listed` → 上架状态；
     - `official_price_unit`、`official_input_price`、`official_output_price` → 官方价（用于折扣计算）；
     - `list_types`、`list_tags` → 定价页筛选用类型与标签。
   - 结果写回 `Pricing` 的 `IsListed`、`OfficialPriceUnit/Input/Output`、`ListTypes`、`ListTags`。

5. **输出**
   - 得到 `pricingMap`（及 `modelEnableGroups`、`modelQuotaTypeMap` 等），接口再拼上 `group_ratio`、`usable_group`、`vendors`、`supported_endpoint`、`auto_groups` 返回。

---

## 2. 模型倍率（model_ratio）来源与匹配

### 2.1 唯一数据源

- **运行时**：`setting/ratio_setting` 包内的 `modelRatioMap`（内存 map）。
- **持久化**：Option 表里的 `ModelRatio`（JSON 字符串）。管理端「重置模型倍率」会把默认 JSON 写回 Option 并调用 `UpdateModelRatioByJSONString` 刷入 `modelRatioMap`。

### 2.2 查表逻辑：GetModelRatio(name)

1. **名称规范化**：`name = FormatMatchingModelName(name)`  
   - 例如：`gemini-2.5-pro-thinking-128` → `gemini-2.5-pro-thinking-*`  
   - 例如：`gemini-2.5-flash-thinking-*`、`gpt-4-gizmo` → `gpt-4-gizmo-*` 等。
2. **查 map**：`ratio, ok := modelRatioMap[name]`。
3. **未命中**：若为 compact 后缀模型，会试 `CompactWildcardModelKey`；否则返回默认倍率 37.5 及「是否自用模式」等。

因此：**同一通配符下的所有具体模型（如 128/512）在倍率上共用同一配置键**（如 `gemini-2.5-pro-thinking-*`），不能在同一 map 里为 128 和 512 设不同倍率；若需区分，需在 map 中使用更细的 key（若后续支持）。

---

## 3. 表 model_listings 与相关 API

### 3.1 表结构（逻辑字段）

| 字段 | 含义 |
|------|------|
| model_name | 主键，模型名 |
| is_listed | 是否在定价页上架 |
| official_price_unit | 按次付费时的官方单价 |
| official_input_price | 按量时的官方输入价（/百万 token） |
| official_output_price | 按量时的官方输出价（/百万 token） |
| list_types | 类型，逗号分隔，供定价页筛选 |
| list_tags | 标签，逗号分隔，供定价页筛选 |

### 3.2 相关接口

- **GET /api/pricing**  
  见上：聚合 `model_listings` 的上架状态、官方价、类型/标签到每条定价数据。

- **PUT /api/pricing/official_price**  
  `UpdateModelOfficialPrice`：仅更新某模型的官方价三字段（unit/input/output），可部分更新；若无记录会插入并默认上架。

- **PUT /api/pricing/model_listing_meta**  
  `UpdateModelListingMeta`：仅更新某模型的 `list_types`、`list_tags`。

- **POST /api/pricing/batch_update**  
  `BatchUpdateModelListing`：批量设置 `is_listed`。

- **GET /api/pricing/listed_models**（若存在）  
  `GetListedModels`：返回当前已上架模型名列表。

---

## 4. 计费与扣量（relay 侧）

- **relay/helper/price.go** 中 `ModelPriceHelper`：
  - 先看 `GetModelPrice(model)` 是否有按次价；
  - 若无，用 `GetModelRatio(model)` + `GetCompletionRatio(model)` 等按量计算；
  - 再乘 `HandleGroupRatio` 得到的 `GroupRatio`。
- 即：**实际扣费/扣量用的倍率与 /api/pricing 里返回的 model_ratio 同源**（均为 `ratio_setting.GetModelRatio`），保证一致性。

---

## 5. 小结表

| 项目 | 说明 |
|------|------|
| model_ratio 来源 | 仅 `ratio_setting.modelRatioMap`，key 为 `FormatMatchingModelName(name)` |
| 官方价 / 上架 / 类型标签 | 表 `model_listings`，经 `GetAllModelListingWithOfficialPrices()` 注入到定价列表 |
| 折扣计算 | 前端用「当前展示价」与「官方价」比较，仅当当前价更低时显示折扣与划线官方价 |
| 定价页筛选 | 优先使用 `list_types`、`list_tags`，不再用 models.dev 等自动推断 |
| 计费与 /api/pricing 一致性 | relay 扣费与定价接口共用 `GetModelRatio`/`GetModelPrice`，数值一致 |

更多前端展示细节见 [PRICING_DISPLAY_LOGIC.md](./PRICING_DISPLAY_LOGIC.md)。
