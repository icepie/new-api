# 定价页展示逻辑检查报告

## 1. 数据流

- **API** `/api/pricing` 返回 `data[]`，每项包含 `model_name`、`vendor_id`、`quota_type`、`model_ratio`、`completion_ratio`、`official_input_price`、`official_output_price`、`is_listed` 等。
- **PricingNew.jsx**：`setModelsFormat` 用 `model_name` 作 `key`，补全 `vendor_name`，并过滤 `is_listed !== false`。
- **筛选**：`filteredModels = models.filter(filterModel)`，再分页得到 `paginatedModels`。
- **每张卡片**：`name={model.model_name}`、`input/output` 由父组件按 `model_ratio`/`completion_ratio` 计算，`officialPrice={getOfficialPriceFromModel(model)}`。

结论：**名称与价格均来自同一 `model` 对象，不会出现 A 模型名配 B 模型价格。**

---

## 2. 价格计算

### 2.1 父组件传入的 input/output（fallback）

```js
// PricingNew.jsx 523-528
input = model.model_ratio * 2
output = model.model_ratio * model.completion_ratio * 2
```

按量计费时，基准为 `model_ratio * 2`（美元/百万 token）。

### 2.2 ModelCard 内实际展示价

- 若有 `model && displayPrice`：调用 **calculateModelPrice**（helpers/utils.jsx）：
  - 按量：`inputPriceUSD = model_ratio * 2 * usedGroupRatio`，`completionPriceUSD = model_ratio * completion_ratio * 2 * usedGroupRatio`
  - 再经 `displayPrice()` 转成当前币种字符串。
- 若无：用父组件传入的 `input`/`output` 拼成 `priceData`。

展示的「提示/补全」价格 = **站点实际价格**（含分组倍率），不是直接贴官方价。

---

## 3. 官方价与折扣

- **getOfficialPriceFromModel**：按量用 `official_input_price` / `official_output_price`，按次用 `official_price_unit`，构造 `{ input, output }`（单位与 API 一致，一般为美元/百万 token）。
- **ModelCard 折扣块**：
  - `currentInput` = 从 `priceData.inputPrice` 解析出的数字（仅去掉 `$` 和 freeLabel），解析失败则用父组件的 `input`。
  - `inputSavings = officialPrice.input - currentInput`，`savingsPercent = (savings / officialPrice.input) * 100`。
  - **仅当** `savingsAmount > 0 && savingsPercent > 0` 时显示「≈官方 X 折」和划线官方价；涨价或持平不显示。

结论：**折扣比较的是「当前展示价」与「官方价」，只有比官方便宜时才显示折扣。**

---

## 4. 潜在问题与修复

### 4.1 折扣解析仅支持 `$`

折扣块里用 `priceData.inputPrice.replace('$', '').replace(freeLabel, '0')` 解析数字。当 `displayPrice` 返回 `¥…` 或 `¤…` 时，`parseFloat` 会得 `NaN`，会回退到父组件的 `input`（按 USD 的 model_ratio*2）。此时与 `officialPrice.input`（USD）比较，折扣比例正确。若改为去掉任意货币符号再解析，在 CNY 下会得到人民币数值与美元官方价比较，反而错误，故保持现状即可。

### 4.2 同名多模型

API 中 `gemini-2.5-pro-thinking-128` 与 `gemini-2.5-pro-thinking-512` 是两条独立记录，都会出现在列表中（若 `is_listed === true`），各自用各自的 `model_name` 和价格，不会串名或串价。

---

## 5. 小结

| 项目         | 结论 |
|--------------|------|
| 模型名来源   | 始终为当前卡的 `model.model_name`，无误用 |
| 展示价格来源 | 先 `calculateModelPrice`（含 groupRatio），否则用父组件 input/output |
| 官方价来源   | `model.official_input_price` / `official_output_price`（或 unit） |
| 折扣显示条件 | 仅当「当前展示价 < 官方价」时显示折扣与划线官方价 |
| 128 vs 512   | 两条独立模型，各自一张卡；若官方价与 ratio 相同，会显示相同数字且都不显示折扣 |

若页面上只看到「gemini-2.5-pro-thinking-128」且价格为 1.25/10，说明当前看的就是 128 这张卡；512 会在列表中另一张卡（可能在不同页），名称会明确为 `gemini-2.5-pro-thinking-512`。
